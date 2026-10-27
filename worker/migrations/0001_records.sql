-- One document table for every synced entity. A row is only written when the person
-- changes something, and pulls read only rows changed since a cursor, which keeps D1
-- reads and writes far below the free daily limits.
--   version: optimistic-concurrency counter; a write must name the version it saw.
--   seq:     per-person change sequence (see user_seq); the pull cursor. Unique per person,
--            so a page boundary can never hide a change the way a timestamp tie could.
--   deleted: tombstone, so other devices learn about deletes. Old tombstones are purged.
CREATE TABLE IF NOT EXISTS records (
  userId TEXT NOT NULL,
  entity TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL,
  updatedAt INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  seq INTEGER NOT NULL,
  PRIMARY KEY (userId, entity, id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_records_user_seq ON records (userId, seq);
CREATE TABLE IF NOT EXISTS user_seq (
  userId TEXT PRIMARY KEY,
  seq INTEGER NOT NULL
);
