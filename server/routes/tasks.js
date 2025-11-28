const router = require('express').Router();
const mongoose = require('mongoose');
const { Task } = require('../db/models');

/**
 * Task routes
 *
 * Each route checks whether a MongoDB connection exists.  If so, it uses
 * Mongoose models; otherwise it falls back to SQLite via the Express app’s
 * `sqlite` instance.  In practice you might abstract this pattern into a
 * service layer.
 */

// GET /api/tasks – list all tasks
router.get('/', async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    // MongoDB available
    const tasks = await Task.find({}).lean().exec();
    return res.json(tasks);
  }
  // SQLite fallback
  const db = req.app.get('sqlite');
  db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT)');
    db.all('SELECT id, title FROM tasks', [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows.map((row) => ({ _id: row.id, title: row.title, subtasks: [] })));
    });
  });
});

// POST /api/tasks – create a new task
router.post('/', async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (mongoose.connection.readyState === 1) {
    const task = new Task({ title });
    await task.save();
    return res.json(task);
  }
  const db = req.app.get('sqlite');
  db.run('CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT)', (err) => {
    if (err) return res.status(500).json({ error: err.message });
    db.run('INSERT INTO tasks(title) VALUES(?)', [title], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      return res.json({ _id: this.lastID, title, subtasks: [] });
    });
  });
});

module.exports = router;