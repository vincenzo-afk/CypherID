package com.cypherid.identity.service.repository;

import com.cypherid.identity.service.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * UserRepository — Spring Data JPA repository for User entities.
 */
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByDid(String did);

    boolean existsByDid(String did);

    Optional<User> findByDidAndStatus(String did, String status);
}
