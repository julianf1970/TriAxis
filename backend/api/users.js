const express = require('express');
const router = express.Router();

module.exports = function (db) {
  // GET /api/users - List all users
  router.get('/', (req, res) => {
    const users = db.prepare(`
      SELECT u.*,
        (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id) as enrollment_count,
        (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id AND e.status = 'active') as active_enrollments
      FROM users u
      ORDER BY u.name
    `).all();
    res.json(users);
  });

  // GET /api/users/:id - Get user details
  router.get('/:id', (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });

  // GET /api/users/:id/enrollments - Get user's programs
  router.get('/:id/enrollments', (req, res) => {
    const enrollments = db.prepare(`
      SELECT e.*, p.name as program_name, p.duration_weeks, p.target_skill_improvement
      FROM enrollments e
      JOIN programs p ON e.program_id = p.id
      WHERE e.user_id = ?
      ORDER BY e.start_date DESC
    `).all(req.params.id);
    res.json(enrollments);
  });

  // GET /api/users/:id/progress - Get skill progression data
  router.get('/:id/progress', (req, res) => {
    const progress = db.prepare(`
      SELECT sm.*, e.program_id, p.name as program_name, e.status as enrollment_status
      FROM skill_measurements sm
      JOIN enrollments e ON sm.enrollment_id = e.id
      JOIN programs p ON e.program_id = p.id
      WHERE e.user_id = ?
      ORDER BY p.name, sm.metric_name, sm.measurement_date
    `).all(req.params.id);
    res.json(progress);
  });

  return router;
};
