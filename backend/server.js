const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Database connection
const db = getDatabase();
db.pragma('foreign_keys = ON');

// API routes
app.use('/api/users', require('./api/users')(db));
app.use('/api/programs', require('./api/programs')(db));
app.use('/api/metrics', require('./api/metrics')(db));
app.use('/api/dashboards', require('./api/dashboards')(db));

// Catch-all: serve index.html for any non-API route
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`TriAxis server running at http://localhost:${PORT}`);
});
