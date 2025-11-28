const router = require('express').Router();
const mongoose = require('mongoose');
const { Event } = require('../db/models');

/**
 * Events routes
 *
 * These routes are placeholder implementations.  They demonstrate how to
 * return static data or data from the database.  Future enhancements should
 * allow users to create, update and delete calendar events with links to
 * tasks and reminders.
 */

// GET /api/events – list events (demo only)
router.get('/', async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    const events = await Event.find({}).lean().exec();
    return res.json(events);
  }
  // SQLite fallback: no events table yet, return static example
  res.json([
    {
      _id: 1,
      title: 'Example Event',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 3600000).toISOString(),
      color: '#8FBF88',
      reminderMinutesBefore: 10
    }
  ]);
});

module.exports = router;