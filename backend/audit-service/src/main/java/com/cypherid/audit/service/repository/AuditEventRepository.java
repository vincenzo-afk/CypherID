package com.cypherid.audit.service.repository;

import com.cypherid.audit.service.domain.AuditEventEntity;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** Filtered audit-log queries (docs/api/07_AUDIT_APIS.md). */
@Repository
public interface AuditEventRepository extends JpaRepository<AuditEventEntity, UUID> {

    @Query("SELECT e FROM AuditEventEntity e WHERE "
            + "(:did IS NULL OR e.did = :did) AND "
            + "(:resourceId IS NULL OR e.resourceId = :resourceId) AND "
            + "(:decision IS NULL OR e.decision = :decision) AND "
            + "(:eventType IS NULL OR e.eventType = :eventType) AND "
            + "(:from IS NULL OR e.eventTime >= :from) AND "
            + "(:to IS NULL OR e.eventTime <= :to)")
    Page<AuditEventEntity> search(
            @Param("did") String did,
            @Param("resourceId") String resourceId,
            @Param("decision") String decision,
            @Param("eventType") String eventType,
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable);
}
