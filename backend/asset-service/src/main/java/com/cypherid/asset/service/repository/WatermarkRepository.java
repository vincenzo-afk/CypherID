package com.cypherid.asset.service.repository;

import com.cypherid.asset.service.domain.WatermarkEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * WatermarkRepository — Spring Data JPA repository for watermarks.
 */
@Repository
public interface WatermarkRepository extends JpaRepository<WatermarkEntity, UUID> {

    Optional<WatermarkEntity> findBySessionId(UUID sessionId);

    Optional<WatermarkEntity> findByDisplayId(String displayId);
}