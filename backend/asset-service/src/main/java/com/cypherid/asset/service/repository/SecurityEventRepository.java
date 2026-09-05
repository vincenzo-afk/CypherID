package com.cypherid.asset.service.repository;

import com.cypherid.asset.service.domain.SecurityEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * SecurityEventRepository — Spring Data JPA repository for security events.
 */
@Repository
public interface SecurityEventRepository extends JpaRepository<SecurityEventEntity, UUID> {

    List<SecurityEventEntity> findTop100ByOrderByCreatedAtDesc();

    List<SecurityEventEntity> findBySessionIdOrderByCreatedAtDesc(UUID sessionId);

    List<SecurityEventEntity> findBySeverityOrderByCreatedAtDesc(String severity);
}