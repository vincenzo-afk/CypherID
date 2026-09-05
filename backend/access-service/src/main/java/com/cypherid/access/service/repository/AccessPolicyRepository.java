package com.cypherid.access.service.repository;

import com.cypherid.access.service.domain.AccessPolicyEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * AccessPolicyRepository — Spring Data JPA repository for AccessPolicyEntity.
 */
@Repository
public interface AccessPolicyRepository extends JpaRepository<AccessPolicyEntity, UUID> {

    Optional<AccessPolicyEntity> findByResourceIdAndActiveTrue(String resourceId);

    List<AccessPolicyEntity> findByResourceId(String resourceId);

    boolean existsByResourceIdAndActiveTrue(String resourceId);
}