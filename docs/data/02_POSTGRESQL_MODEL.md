# PostgreSQL Model

## Tables

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  did VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  organization VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### protected_sessions
```sql
CREATE TABLE protected_sessions (
  id UUID PRIMARY KEY,
  user_did VARCHAR(255) NOT NULL,
  content_id VARCHAR(255) NOT NULL,
  content_type VARCHAR(20) NOT NULL,
  protection_profile VARCHAR(20) NOT NULL,
  session_seed BYTEA NOT NULL,
  watermark_id UUID NOT NULL,
  state VARCHAR(30) NOT NULL DEFAULT 'AUTHORIZED',
  issued_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  chunk_count INTEGER NOT NULL DEFAULT 0
);
```

### watermarks
```sql
CREATE TABLE watermarks (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES protected_sessions(id),
  display_id VARCHAR(20) NOT NULL,
  user_display VARCHAR(20) NOT NULL,
  content_id VARCHAR(255) NOT NULL,
  timestamp_label VARCHAR(30) NOT NULL,
  random_token VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### security_events
```sql
CREATE TABLE security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES protected_sessions(id),
  user_did VARCHAR(255),
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  severity VARCHAR(20) NOT NULL,
  blockchain_tx_hash VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### asset_encryption_keys
```sql
CREATE TABLE asset_encryption_keys (
  asset_id VARCHAR(255) PRIMARY KEY,
  encrypted_key BYTEA NOT NULL,  -- encrypted with master key
  iv BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### ai_anomaly_alerts
```sql
CREATE TABLE ai_anomaly_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_did VARCHAR(255) NOT NULL,
  anomaly_score DECIMAL(10,6) NOT NULL,
  features JSONB NOT NULL,
  pattern_description VARCHAR(500),
  blockchain_tx_hash VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
