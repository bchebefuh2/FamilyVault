package com.familyvault.service;

import com.familyvault.entity.AuditLog;
import com.familyvault.entity.User;
import com.familyvault.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Async
    public void log(User user, String action, String resourceType, String resourceId, String ipAddress) {
        AuditLog entry = AuditLog.builder()
                .userId(user.getId())
                .userEmail(user.getEmail())
                .familyId(user.getFamily() != null ? user.getFamily().getId() : null)
                .action(action)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .ipAddress(ipAddress)
                .build();
        auditLogRepository.save(entry);
        log.info("AUDIT | user={} action={} resource={}/{} ip={}", user.getEmail(), action, resourceType, resourceId, ipAddress);
    }
}
