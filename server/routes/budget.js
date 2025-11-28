const router = require('express').Router();
const mongoose = require('mongoose');
const { Budget } = require('../db/models');

/**
 * Budget routes
 *
 * A simplified budget API.  Returns a blank budget object if nothing exists.
 * Zero‑based budgeting and debt payoff calculations will be implemented later.
 */

router.get('/', async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    const budget = await Budget.findOne({}).lean().exec();
    return res.json(budget || {});
  }
  // SQLite fallback: return a default empty budget structure
  res.json({
    month: '',
    income: [],
    categories: [],
    debts: []
  });
});

module.exports = router;