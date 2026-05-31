package com.familyvault.repository;

import com.familyvault.entity.Family;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FamilyRepository extends JpaRepository<Family, String> {
    Optional<Family> findByInviteCode(String inviteCode);
}
