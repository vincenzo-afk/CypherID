package com.cypherid.asset.service.repository;

import com.cypherid.asset.service.domain.AiAnomalyAlertEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * AiAnomalyAlertRepository — Spring Data JPA repository for AI anomaly alerts.
 */
@Repository
public interface AiAnomalyAlertRepository extends JpaRepository<AiAnomalyAlertEntity, UUID> {

    List<AiAnomalyAlertEntity> findTop100ByOrderByCreatedAtDesc();

    List<AiAnomalyAlertEntity> findByUserDidAndAcknowledgedFalseOrderByCreatedAtDesc(String userDid);
}