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
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Phase 1: stores files on local disk under uploads/{familyId}/{uuid_originalName}.
 *
 * To swap to AWS S3 in Phase 4:
 *  1. Create S3StorageService implementing the same method signatures.
 *  2. Inject S3Client from the AWS SDK.
 *  3. Replace Files.copy() with s3Client.putObject().
 *  4. Replace UrlResource with a presigned S3 URL.
 *  5. Change storagePath to store the S3 object key instead of a local path.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FileStorageService {

    @Value("${storage.local.path:uploads}")
    private String uploadDir;

    private final FileMetadataRepository fileMetadataRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    // ── Upload ────────────────────────────────────────────────────────────────

    public FileMetadataDto upload(MultipartFile file, String userEmail, String ipAddress) throws IOException {
        User user = getUser(userEmail);

        // Sanitize the filename to prevent directory traversal attacks
        String cleanName = StringUtils.cleanPath(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "unnamed"
        );

        // Store under uploads/{familyId}/
        Path familyDir = Paths.get(uploadDir, user.getFamily().getId());
        Files.createDirectories(familyDir);

        // Prefix with UUID so two uploads of the same filename don't collide
        String storedName = UUID.randomUUID() + "_" + cleanName;
        Path destination = familyDir.resolve(storedName);

        Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
        log.info("File saved: {}", destination);

        FileMetadata metadata = FileMetadata.builder()
                .originalName(cleanName)
                .storagePath(destination.toString())
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

    // ── Download ──────────────────────────────────────────────────────────────

    public DownloadResult download(String fileId, String userEmail, String ipAddress) throws IOException {
        User user = getUser(userEmail);
        FileMetadata metadata = getFile(fileId);
        assertSameFamily(user, metadata);

        Path filePath = Paths.get(metadata.getStoragePath());
        Resource resource = new UrlResource(filePath.toUri());

        if (!resource.exists()) {
            throw new ApiException("File data not found on disk. It may have been removed.", HttpStatus.NOT_FOUND);
        }

        auditService.log(user, "FILE_DOWNLOAD", "FILE", fileId, ipAddress);
        return new DownloadResult(resource, metadata.getOriginalName(), metadata.getContentType());
    }

    // ── Delete (soft) ─────────────────────────────────────────────────────────

    public void deleteFile(String fileId, String userEmail, String ipAddress) {
        User user = getUser(userEmail);
        FileMetadata metadata = getFile(fileId);
        assertSameFamily(user, metadata);

        // Members can only delete their own files; Admins can delete any
        boolean isOwner = metadata.getUploadedBy().getId().equals(user.getId());
        if (!isOwner && user.getRole() != Role.ADMIN) {
            throw new ApiException("Only admins can delete other members' files.", HttpStatus.FORBIDDEN);
        }

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
        if (meta.isDeleted()) {
            throw new ApiException("File not found.", HttpStatus.NOT_FOUND);
        }
        return meta;
    }

    private void assertSameFamily(User user, FileMetadata metadata) {
        if (!metadata.getFamily().getId().equals(user.getFamily().getId())) {
            throw new ApiException("Access denied. This file does not belong to your family.", HttpStatus.FORBIDDEN);
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

    // ── Inner record ─────────────────────────────────────────────────────────

    public record DownloadResult(Resource resource, String originalName, String contentType) {}
}
