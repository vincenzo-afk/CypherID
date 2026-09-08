CREATE TABLE IF NOT EXISTS access_policies (
    id              UUID         PRIMARY KEY,
    policy_id       VARCHAR(255) UNIQUE NOT NULL,
    resource_id     VARCHAR(255) NOT NULL,
    required_role   VARCHAR(100),
    abac_attributes VARCHAR(2000),
    action          VARCHAR(50)  NOT NULL,
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by      VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ap_resource ON access_policies(resource_id);

CREATE TABLE IF NOT EXISTS delegations (
    id          UUID         PRIMARY KEY,
    from_did    VARCHAR(255) NOT NULL,
    to_did      VARCHAR(255) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    action      VARCHAR(50)  NOT NULL,
    expires_at  TIMESTAMP    NOT NULL,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS multi_sig_requests (
    id                  UUID         PRIMARY KEY,
    request_id          VARCHAR(255) UNIQUE NOT NULL,
    resource_id         VARCHAR(255) NOT NULL,
    requester_did       VARCHAR(255) NOT NULL,
    required_approvers  VARCHAR(2000) NOT NULL,
    required_threshold  INTEGER      NOT NULL,
    approvals           VARCHAR(4000) NOT NULL DEFAULT '[]',
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
