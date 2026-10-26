-- One document table for every synced entity. A row is only written when the person
-- changes something, and pulls read only rows changed since a cursor, which keeps D1
-- reads and writes far below the free daily limits. Deletes are tombstones so other
-- devices learn about them on their next pull.
CREATE TABLE IF NOT EXISTS records (
  userId TEXT NOT NULL,
  entity TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL,
  updatedAt INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (userId, entity, id)
);
CREATE INDEX IF NOT EXISTS idx_records_user_updated ON records (userId, updatedAt);
