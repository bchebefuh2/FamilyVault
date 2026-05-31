package com.familyvault.service;

import com.familyvault.dto.file.FileMetadataDto;
import com.familyvault.entity.FileMetadata;
import com.familyvault.entity.User;
import com.familyvault.entity.enums.Role;
import com.familyvault.exception.ApiException;
import com.familyvault.repository.FileMetadataRepository;
import com.familyvault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Production file storage — S3 + KMS.
 *
 * @Primary means Spring will prefer this bean over FileStorageService
 * when both are in the context (which only happens in the "prod" profile).
 *
 * Key differences from FileStorageService (local disk):
 *  - Files go to S3 with SSE-KMS encryption (per-family KMS key in future)
 *  - Downloads return presigned S3 URLs instead of streaming through the API
 *  - The API never touches file bytes on download — S3 + CloudFront serve them
 *  - storagePath stores the S3 object key, not a filesystem path
 */
@Slf4j
@Service
@Primary
@Profile("prod")
@RequiredArgsConstructor
public class S3FileStorageService {

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${aws.kms.key-id}")
    private String kmsKeyId;

    @Value("${aws.cloudfront.domain}")
    private String cloudfrontDomain;

    private static final Duration PRESIGNED_URL_TTL = Duration.ofMinutes(15);

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final FileMetadataRepository fileMetadataRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    // ── Upload ────────────────────────────────────────────────────────────────

    public FileMetadataDto upload(MultipartFile file, String userEmail, String ipAddress) throws IOException {
        User user = getUser(userEmail);

        String cleanName = StringUtils.cleanPath(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "unnamed"
        );

        // S3 key structure: {familyId}/{uuid}_{filename}
        // Keeps files logically grouped by family for IAM/KMS policy enforcement
        String objectKey = user.getFamily().getId() + "/" + UUID.randomUUID() + "_" + cleanName;

        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .contentType(file.getContentType())
                .contentLength(file.getSize())
                // SSE-KMS: S3 encrypts the object using our CMK before writing to disk
                .serverSideEncryption(ServerSideEncryption.AWS_KMS)
                .ssekmsKeyId(kmsKeyId)
                .build();

        s3Client.putObject(putRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        log.info("Uploaded to S3: bucket={} key={} size={}", bucketName, objectKey, file.getSize());

        FileMetadata metadata = FileMetadata.builder()
                .originalName(cleanName)
                .storagePath(objectKey)   // S3 key, not a local path
                .contentType(file.getContentType())
                .size(file.getSize())
                .uploadedBy(user)
                .family(user.getFamily())
                .build();

        metadata = fileMetadataRepository.save(metadata);
        auditService.log(user, "FILE_UPLOAD", "FILE", metadata.getId(), ipAddress);

        return toDto(metadata);
    }

    // ── List ──────────────────────────────────────────────────────────────────

    public List<FileMetadataDto> listFiles(String userEmail) {
        User user = getUser(userEmail);
        return fileMetadataRepository
                .findByFamilyAndDeletedFalseOrderByCreatedAtDesc(user.getFamily())
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    // ── Presigned Download URL ─────────────────────────────────────────────────
    /**
     * Generates a time-limited presigned S3 URL.
     * The client calls this endpoint to get the URL, then fetches the file
     * DIRECTLY from S3/CloudFront — the API is never in the data path.
     *
     * This is significantly more scalable than streaming files through the API.
     */
    public String getPresignedDownloadUrl(String fileId, String userEmail, String ipAddress) {
        User user = getUser(userEmail);
        FileMetadata metadata = getFile(fileId);
        assertSameFamily(user, metadata);

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(PRESIGNED_URL_TTL)
                .getObjectRequest(GetObjectRequest.builder()
                        .bucket(bucketName)
                        .key(metadata.getStoragePath())
                        .responseContentDisposition(
                                "attachment; filename=\"" + metadata.getOriginalName() + "\""
                        )
                        .build())
                .build();

        PresignedGetObjectRequest presigned = s3Presigner.presignGetObject(presignRequest);

        auditService.log(user, "FILE_DOWNLOAD", "FILE", fileId, ipAddress);
        return presigned.url().toString();
    }

    // ── File Version History ──────────────────────────────────────────────────
    /**
     * Returns all S3 versions of a file — powers the "restore previous version" feature.
     * Only available because we enabled S3 versioning in Terraform.
     */
    public List<String> getFileVersions(String fileId, String userEmail) {
        User user = getUser(userEmail);
        FileMetadata metadata = getFile(fileId);
        assertSameFamily(user, metadata);

        ListObjectVersionsRequest req = ListObjectVersionsRequest.builder()
                .bucket(bucketName)
                .prefix(metadata.getStoragePath())
                .build();

        return s3Client.listObjectVersions(req).versions()
                .stream()
                .map(v -> v.versionId() + " | " + v.lastModified())
                .collect(Collectors.toList());
    }

    // ── Delete (soft in DB, hard in S3 optional) ──────────────────────────────

    public void deleteFile(String fileId, String userEmail, String ipAddress) {
        User user = getUser(userEmail);
        FileMetadata metadata = getFile(fileId);
        assertSameFamily(user, metadata);

        boolean isOwner = metadata.getUploadedBy().getId().equals(user.getId());
        if (!isOwner && user.getRole() != Role.ADMIN) {
            throw new ApiException("Only admins can delete other members' files.", HttpStatus.FORBIDDEN);
        }

        // Soft delete in the DB — S3 versioning keeps the actual object
        // A background job could permanently delete after a retention period
        metadata.setDeleted(true);
        fileMetadataRepository.save(metadata);
        log.info("File soft-deleted: {} by {}", fileId, userEmail);

        auditService.log(user, "FILE_DELETE", "FILE", fileId, ipAddress);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException("User not found.", HttpStatus.NOT_FOUND));
    }

    private FileMetadata getFile(String fileId) {
        FileMetadata meta = fileMetadataRepository.findById(fileId)
                .orElseThrow(() -> new ApiException("File not found.", HttpStatus.NOT_FOUND));
        if (meta.isDeleted()) throw new ApiException("File not found.", HttpStatus.NOT_FOUND);
        return meta;
    }

    private void assertSameFamily(User user, FileMetadata metadata) {
        if (!metadata.getFamily().getId().equals(user.getFamily().getId())) {
            throw new ApiException("Access denied.", HttpStatus.FORBIDDEN);
        }
    }

    private FileMetadataDto toDto(FileMetadata m) {
        return FileMetadataDto.builder()
                .id(m.getId())
                .originalName(m.getOriginalName())
                .contentType(m.getContentType())
                .size(m.getSize())
                .uploadedBy(m.getUploadedBy().getFirstName() + " " + m.getUploadedBy().getLastName())
                .uploadedByEmail(m.getUploadedBy().getEmail())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
