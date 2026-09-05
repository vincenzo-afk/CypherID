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
}