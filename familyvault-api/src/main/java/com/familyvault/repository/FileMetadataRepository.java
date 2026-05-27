package com.familyvault.repository;

import com.familyvault.entity.Family;
import com.familyvault.entity.FileMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FileMetadataRepository extends JpaRepository<FileMetadata, String> {
    List<FileMetadata> findByFamilyAndDeletedFalseOrderByCreatedAtDesc(Family family);
}
