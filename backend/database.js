const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.db');

function createDatabase() {
  const db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      practice_area TEXT NOT NULL,
      office TEXT NOT NULL,
      hourly_rate REAL DEFAULT 300.0,
      hire_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      target_skill_improvement REAL,
      duration_weeks INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      program_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      status TEXT DEFAULT 'active',
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (program_id) REFERENCES programs(id)
    );

    CREATE TABLE IF NOT EXISTS skill_measurements (
      id INTEGER PRIMARY KEY,
      enrollment_id INTEGER NOT NULL,
      measurement_type TEXT NOT NULL,
      measurement_date TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      metric_value REAL NOT NULL,
      metric_unit TEXT,
      FOREIGN KEY (enrollment_id) REFERENCES enrollments(id)
    );

    CREATE TABLE IF NOT EXISTS experience_surveys (
      id INTEGER PRIMARY KEY,
      enrollment_id INTEGER NOT NULL,
      survey_date TEXT NOT NULL,
      usefulness_rating INTEGER CHECK(usefulness_rating BETWEEN 1 AND 5),
      difficulty_level TEXT,
      confidence_before INTEGER CHECK(confidence_before BETWEEN 1 AND 5),
      confidence_after INTEGER CHECK(confidence_after BETWEEN 1 AND 5),
      would_recommend BOOLEAN,
      blocked_application TEXT,
      FOREIGN KEY (enrollment_id) REFERENCES enrollments(id)
    );

    CREATE TABLE IF NOT EXISTS business_metrics (
      id INTEGER PRIMARY KEY,
      enrollment_id INTEGER NOT NULL,
      metric_date TEXT NOT NULL,
      time_saved_minutes_per_week REAL,
      error_rate_change REAL,
      sick_days_change REAL,
      help_desk_tickets_change INTEGER,
      calculated_annual_value REAL,
      attribution_confidence TEXT,
      confounding_factors TEXT,
      FOREIGN KEY (enrollment_id) REFERENCES enrollments(id)
    );

    CREATE TABLE IF NOT EXISTS roi_formulas (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      formula_code TEXT NOT NULL,
      active BOOLEAN DEFAULT 1
    );
  `);

  return db;
}

function getDatabase() {
  return new Database(DB_PATH);
}

module.exports = { createDatabase, getDatabase, DB_PATH };
