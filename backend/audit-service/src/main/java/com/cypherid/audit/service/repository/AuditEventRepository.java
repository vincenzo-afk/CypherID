package com.cypherid.audit.service.repository;

import com.cypherid.audit.service.domain.AuditEventEntity;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

/** Filtered audit-log queries (docs/api/07_AUDIT_APIS.md). */
@Repository
public interface AuditEventRepository extends JpaRepository<AuditEventEntity, UUID>,
        JpaSpecificationExecutor<AuditEventEntity> {

    Optional<AuditEventEntity> findBySourceEventId(String sourceEventId);

    /**
     * Builds a filter spec with only the non-blank/non-null predicates.
     * (The old {@code :param IS NULL OR ...} JPQL broke on Postgres with
     * {@code 42P18 could not determine data type} for null Instant params —
     * dynamic specs never bind a null at all.)
     */
    static Specification<AuditEventEntity> filter(String did, String resourceId,
            String decision, String eventType, Instant from, Instant to) {
        return (root, query, cb) -> {
            var predicates = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
            if (did != null && !did.isBlank()) {
                predicates.add(cb.equal(root.get("did"), did));
            }
            if (resourceId != null && !resourceId.isBlank()) {
                predicates.add(cb.equal(root.get("resourceId"), resourceId));
            }
            if (decision != null && !decision.isBlank()) {
                predicates.add(cb.equal(root.get("decision"), decision));
            }
            if (eventType != null && !eventType.isBlank()) {
                predicates.add(cb.equal(root.get("eventType"), eventType));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("eventTime"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("eventTime"), to));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }
}
