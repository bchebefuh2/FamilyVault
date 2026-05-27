package com.familyvault.controller;

import com.familyvault.dto.file.FileMetadataDto;
import com.familyvault.service.FileStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
@Tag(name = "Files", description = "Upload, list, download, and delete family files")
@SecurityRequirement(name = "bearerAuth")
public class FileController {

    private final FileStorageService fileStorageService;

    /**
     * POST /api/files/upload
     * Any authenticated family member can upload.
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'MEMBER')")
    @Operation(summary = "Upload a file", description = "Upload a file or photo. Max size 100 MB.")
    public ResponseEntity<FileMetadataDto> upload(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletRequest request
    ) throws IOException {
        FileMetadataDto result = fileStorageService.upload(file, userDetails.getUsername(), getClientIp(request));
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/files
     * Returns all non-deleted files belonging to the authenticated user's family.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MEMBER')")
    @Operation(summary = "List family files", description = "Returns all files uploaded by any member of your family.")
    public ResponseEntity<List<FileMetadataDto>> listFiles(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(fileStorageService.listFiles(userDetails.getUsername()));
    }

    /**
     * GET /api/files/{id}/download
     * Streams the file back. Family members can only download files from their own family.
     */
    @GetMapping("/{id}/download")
    @PreAuthorize("hasAnyRole('ADMIN', 'MEMBER')")
    @Operation(summary = "Download a file", description = "Stream a file. Only accessible to members of the same family.")
    public ResponseEntity<Resource> download(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletRequest request
    ) throws IOException {
        FileStorageService.DownloadResult result = fileStorageService.download(id, userDetails.getUsername(), getClientIp(request));

        // Determine Content-Type; fall back to octet-stream for unknown types
        String contentType = result.contentType() != null
                ? result.contentType()
                : MediaType.APPLICATION_OCTET_STREAM_VALUE;

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + result.originalName() + "\"")
                .body(result.resource());
    }

    /**
     * DELETE /api/files/{id}
     * Members can delete their own files. Admins can delete anyone's files.
     * Uses soft delete — records remain in DB with deleted=true.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MEMBER')")
    @Operation(summary = "Delete a file", description = "Soft-delete a file. Admins can delete any file; members only their own.")
    public ResponseEntity<Void> delete(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletRequest request
    ) {
        fileStorageService.deleteFile(id, userDetails.getUsername(), getClientIp(request));
        return ResponseEntity.noContent().build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
