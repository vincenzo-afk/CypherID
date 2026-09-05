package com.cypherid.access.service.repository;

import com.cypherid.access.service.domain.MultiSigRequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * MultiSigRequestRepository — Spring Data JPA repository for MultiSigRequestEntity.
 */
@Repository
public interface MultiSigRequestRepository extends JpaRepository<MultiSigRequestEntity, UUID> {

    Optional<MultiSigRequestEntity> findByRequestId(String requestId);
}