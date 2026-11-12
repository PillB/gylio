-- Bug reports, ideas and questions, written by people signed in. Each belongs to its reporter: it is in their
-- export and erased with their account. Admins (ADMIN_SUBJECTS, set at deploy) read and triage all of them.
--   id:      random, so an id says nothing about how many reports there are.
--   context: browser, screen size, language and recent console errors, rebuilt from an allowlist (src/feedback.ts).
CREATE TABLE IF NOT EXISTS feedback_reports (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT,
  stepsToReproduce TEXT,
  expected TEXT,
  actual TEXT,
  route TEXT,
  context TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  adminNote TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback_reports (userId, createdAt);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback_reports (status, createdAt);
