'use strict';

/**
 * Mongo documents written before optimistic locking have no `version`. The
 * API reports them as version 1, but `$inc` on a missing field yields 1, not
 * 2, so a first write would leave the version unchanged and a second client
 * holding "1" could still overwrite it. Setting the field once, before the
 * server takes traffic, removes that case. Idempotent and cheap on re-runs
 * (the filter matches nothing once every document has a version).
 */
async function backfillVersions(models) {
  let updated = 0;
  for (const model of models) {
    const result = await model.updateMany({ version: { $exists: false } }, { $set: { version: 1 } });
    updated += result?.modifiedCount ?? 0;
  }
  return updated;
}

module.exports = { backfillVersions };
