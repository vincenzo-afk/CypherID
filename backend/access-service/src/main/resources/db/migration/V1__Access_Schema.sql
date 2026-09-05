-- CypherID Access Service PostgreSQL Schema
-- Migration V1: Local mirror tables for access control state.
-- The Hyperledger Fabric ledger remains the source of truth;
-- these tables support GET endpoints and local audit queries.

-- Local mirror of on-chain access policies (POLICY:{policyId})
CREATE TABLE IF NOT EXISTS access_policies (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id       VARCHAR(255) UNIQUE NOT NULL,
    resource_id     VARCHAR(255) NOT NULL,
    required_role   VARCHAR(100),
    abac_attributes VARCHAR(2000),
    action          VARCHAR(50)  NOT NULL,
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by      VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_policies_resource_id ON access_policies(resource_id);
CREATE INDEX IF NOT EXISTS idx_access_policies_active ON access_policies(active);

-- Local mirror of on-chain delegation records (DELEGATE:{from}:{to}:{resource})
CREATE TABLE IF NOT EXISTS delegations (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    from_did    VARCHAR(255) NOT NULL,
    to_did      VARCHAR(255) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    action      VARCHAR(50)  NOT NULL,
    expires_at  TIMESTAMPTZ  NOT NULL,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delegations_to_did ON delegations(to_did);
CREATE INDEX IF NOT EXISTS idx_delegations_resource_id ON delegations(resource_id);
CREATE INDEX IF NOT EXISTS idx_delegations_active ON delegations(active);

-- Local mirror of on-chain multi-signature requests (MULTISIG:{requestId})
CREATE TABLE IF NOT EXISTS multi_sig_requests (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id          VARCHAR(255) UNIQUE NOT NULL,
    resource_id         VARCHAR(255) NOT NULL,
    requester_did       VARCHAR(255) NOT NULL,
    required_approvers  VARCHAR(2000) NOT NULL,
    required_threshold  INTEGER      NOT NULL,
    approvals           VARCHAR(4000) NOT NULL DEFAULT '[]',
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_multisig_requester_did ON multi_sig_requests(requester_did);
CREATE INDEX IF NOT EXISTS idx_multisig_status ON multi_sig_requests(status);