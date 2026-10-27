-- Internal person id, separate from the sign-in provider's subject, so moving away from one
-- provider later means adding a mapping row, not rewriting every record.
CREATE TABLE IF NOT EXISTS identities (
  provider TEXT NOT NULL,
  subject TEXT NOT NULL,
  userId TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  PRIMARY KEY (provider, subject)
) WITHOUT ROWID;

-- One row per UTC day: how much of the free D1 and Workers allowance this Worker has used.
-- The Worker flushes it in batches (see src/usage.ts); it holds counts only, never user data.
CREATE TABLE IF NOT EXISTS usage_day (
  day TEXT PRIMARY KEY,
  reads INTEGER NOT NULL DEFAULT 0,
  writes INTEGER NOT NULL DEFAULT 0,
  requests INTEGER NOT NULL DEFAULT 0
) WITHOUT ROWID;
