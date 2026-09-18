package com.cypherid.access.service.repository;

import com.cypherid.access.service.domain.DelegationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * DelegationRepository — Spring Data JPA repository for DelegationEntity.
 */
@Repository
public interface DelegationRepository extends JpaRepository<DelegationEntity, UUID> {

    Optional<DelegationEntity> findByFromDidAndToDidAndResourceIdAndActiveTrue(
            String fromDid, String toDid, String resourceId);

    // Full grant history in both directions (active and revoked) so the
    // Access Center can show real REVOKED counts without inventing data.
    java.util.List<DelegationEntity> findByFromDidOrderByCreatedAtDesc(String fromDid);

    java.util.List<DelegationEntity> findByToDidOrderByCreatedAtDesc(String toDid);
}