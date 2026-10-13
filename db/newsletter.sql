-- Run with a migration/admin role. The application role needs only DML on these tables.
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
 id uuid PRIMARY KEY, email text UNIQUE NOT NULL,
 confirmed_at timestamptz, requested_at timestamptz NOT NULL DEFAULT now(),
 consent_version text NOT NULL, confirm_hash text, confirm_expires timestamptz
);
CREATE TABLE IF NOT EXISTS newsletter_deliveries (
 edition text NOT NULL, subscriber uuid NOT NULL REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
 state text NOT NULL CHECK (state IN ('sending','accepted','uncertain')), provider_id text,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (edition, subscriber)
);
CREATE TABLE IF NOT EXISTS newsletter_limits (
 key text PRIMARY KEY, hits integer NOT NULL, expires timestamptz NOT NULL
);
