-- Product analytics from the app: what happened ("task_completed"), never who. No account id, no email,
-- no text a person typed (src/analytics.ts keeps names and property keys to identifiers, values short).
--   eventId:    chosen by the app, so an upload re-sent after a lost answer is stored once.
--   signedIn:   whether someone was signed in when it happened, 0 or 1.
--   props:      the event's properties as JSON.
--   receivedAt: the Worker's clock (ms); a device clock can be wrong.
CREATE TABLE IF NOT EXISTS analytics_events (
  eventId TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sessionId TEXT NOT NULL,
  signedIn INTEGER NOT NULL,
  props TEXT NOT NULL,
  receivedAt INTEGER NOT NULL
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS idx_analytics_received ON analytics_events (receivedAt);
