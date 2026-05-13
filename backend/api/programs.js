const express = require('express');
const router = express.Router();

module.exports = function (db) {
  // GET /api/programs - List all programs
  router.get('/', (req, res) => {
    const programs = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM enrollments e WHERE e.program_id = p.id) as total_enrolled,
        (SELECT COUNT(*) FROM enrollments e WHERE e.program_id = p.id AND e.status = 'completed') as completed_count,
        (SELECT COUNT(*) FROM enrollments e WHERE e.program_id = p.id AND e.status = 'active') as active_count,
        (SELECT COUNT(*) FROM enrollments e WHERE e.program_id = p.id AND e.status = 'dropped') as dropped_count
      FROM programs p
      ORDER BY p.name
    `).all();
    res.json(programs);
  });

  // GET /api/programs/:id - Get program details
  router.get('/:id', (req, res) => {
    const program = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM enrollments e WHERE e.program_id = p.id) as total_enrolled,
        (SELECT COUNT(*) FROM enrollments e WHERE e.program_id = p.id AND e.status = 'completed') as completed_count
      FROM programs p WHERE p.id = ?
    `).get(req.params.id);
    if (!program) return res.status(404).json({ error: 'Program not found' });
    res.json(program);
  });

  // GET /api/programs/:id/participants - Get enrolled learners
  router.get('/:id/participants', (req, res) => {
    const participants = db.prepare(`
      SELECT u.id, u.name, u.role, u.practice_area, u.office,
        e.id as enrollment_id, e.start_date, e.end_date, e.status
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      WHERE e.program_id = ?
      ORDER BY u.name
    `).all(req.params.id);
    res.json(participants);
  });

  return router;
};
