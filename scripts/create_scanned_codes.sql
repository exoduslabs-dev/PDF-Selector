-- Create table to record scanned codes (one row per scan)
-- Run this file with psql against your environment (see .env)

CREATE TABLE IF NOT EXISTS scanned_codes (
  scan_id bigserial PRIMARY KEY,
  code_text text NOT NULL,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  machine_id text NULL,
  user_id text NULL,
  operations jsonb NULL,
  metadata jsonb NULL
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_scanned_codes_code_text ON scanned_codes (code_text);
CREATE INDEX IF NOT EXISTS idx_scanned_codes_scanned_at ON scanned_codes (scanned_at);
CREATE INDEX IF NOT EXISTS idx_scanned_codes_machine_id ON scanned_codes (machine_id);
CREATE INDEX IF NOT EXISTS idx_scanned_codes_ops_gin ON scanned_codes USING gin (operations);
