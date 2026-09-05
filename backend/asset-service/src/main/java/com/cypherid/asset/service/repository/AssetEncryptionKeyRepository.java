package com.cypherid.asset.service.repository;

import com.cypherid.asset.service.domain.AssetEncryptionKeyEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * AssetEncryptionKeyRepository — Spring Data JPA repository for
 * per-asset encryption keys.
 */
@Repository
public interface AssetEncryptionKeyRepository extends JpaRepository<AssetEncryptionKeyEntity, String> {
}