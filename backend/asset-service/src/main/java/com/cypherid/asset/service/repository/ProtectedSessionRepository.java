package com.cypherid.asset.service.repository;

import com.cypherid.asset.service.domain.ProtectedSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * ProtectedSessionRepository — Spring Data JPA repository for protected sessions.
 */
@Repository
public interface ProtectedSessionRepository extends JpaRepository<ProtectedSessionEntity, UUID> {

    List<ProtectedSessionEntity> findByUserDid(String userDid);

    List<ProtectedSessionEntity> findByState(String state);
}