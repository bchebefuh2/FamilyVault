package com.familyvault.dto.file;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class FileMetadataDto {
    private String id;
    private String originalName;
    private String contentType;
    private Long size;
    private String uploadedBy;
    private String uploadedByEmail;
    private LocalDateTime createdAt;
}
