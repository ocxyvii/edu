-- ============================================================
-- Security & 2FA Migration
-- ============================================================

-- Add 2FA columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS two_factor_backup_codes JSONB DEFAULT '[]'::jsonb;

-- Create user_sessions table for 2FA session tracking + device management
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  device_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);

-- Add IP address and user agent columns to audit_logs (if not already present)
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS old_data JSONB,
ADD COLUMN IF NOT EXISTS new_data JSONB;

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_school_id ON audit_logs(school_id);

-- Create rate_limits table for persistent rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'login',
  attempts INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, action);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- Auto-update updated_at for user_sessions
CREATE OR REPLACE FUNCTION update_user_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER trg_user_sessions_updated_at
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_sessions_updated_at();

-- Cleanup expired sessions periodically
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Webhook endpoint for payment invoice status updates
CREATE OR REPLACE FUNCTION update_invoice_status(p_invoice_id UUID)
RETURNS void AS $$
DECLARE
  v_paid DECIMAL;
  v_total DECIMAL;
BEGIN
  SELECT amount, paid_amount INTO v_total, v_paid
  FROM fee_invoices WHERE id = p_invoice_id;

  IF v_paid >= v_total THEN
    UPDATE fee_invoices SET status = 'paid' WHERE id = p_invoice_id;
  ELSIF v_paid > 0 THEN
    UPDATE fee_invoices SET status = 'partial' WHERE id = p_invoice_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security on user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_sessions" ON user_sessions;
CREATE POLICY "users_manage_own_sessions"
  ON user_sessions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "service_manage_all_sessions" ON user_sessions;
CREATE POLICY "service_manage_all_sessions"
  ON user_sessions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Rate limits RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_manage_rate_limits" ON rate_limits;
CREATE POLICY "service_manage_rate_limits"
  ON rate_limits
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
