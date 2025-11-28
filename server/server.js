const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const sqlite3 = require('sqlite3').verbose();

const tasksRouter = require('./routes/tasks');
const eventsRouter = require('./routes/events');
const budgetRouter = require('./routes/budget');

const app = express();
app.use(cors());
app.use(express.json());

// Attempt to connect to MongoDB if an environment variable is provided.  If not, we
// fall back to using a local SQLite database.  This design allows the API to
// operate completely offline for development or when the user does not have
// network connectivity.
const mongoUri = process.env.MONGODB_URI || '';
if (mongoUri) {
  mongoose
    .connect(mongoUri)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));
} else {
  console.log('MongoDB URI not provided; API will use SQLite');
}

// Initialise SQLite database.  The database file will be created if it does not
// exist.  Tables are created in the routes when needed.
const sqlite = new sqlite3.Database('gylio.db');
app.set('sqlite', sqlite);

// Basic health check
app.get('/api', (req, res) => {
  res.json({ message: 'GYLIO API is running' });
});

// Use routers for each domain.  The routers handle both MongoDB and SQLite
// depending on availability.  A more advanced implementation might abstract
// database operations behind a common interface.
app.use('/api/tasks', tasksRouter);
app.use('/api/events', eventsRouter);
app.use('/api/budget', budgetRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});