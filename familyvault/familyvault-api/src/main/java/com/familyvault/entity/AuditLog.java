package com.familyvault.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @UuidGenerator
    @Column(length = 36)
    private String id;

    @Column(length = 36)
    private String userId;

    @Column(length = 255)
    private String userEmail;

    @Column(length = 36)
    private String familyId;

    @Column(nullable = false, length = 50)
    private String action;   // LOGIN, LOGOUT, FILE_UPLOAD, FILE_DOWNLOAD, FILE_DELETE

    @Column(length = 50)
    private String resourceType;

    @Column(length = 36)
    private String resourceId;

    @Column(length = 50)
    private String ipAddress;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
