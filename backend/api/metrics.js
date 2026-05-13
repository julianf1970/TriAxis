const express = require('express');
const router = express.Router();

module.exports = function (db) {
  // GET /api/metrics/roi - Calculate ROI using active formula
  router.get('/roi', (req, res) => {
    const formula = db.prepare('SELECT * FROM roi_formulas WHERE active = 1 LIMIT 1').get();
    if (!formula) return res.status(404).json({ error: 'No active ROI formula found' });

    const metrics = db.prepare(`
      SELECT bm.*, u.name as user_name, u.hourly_rate, u.role, u.office,
        p.name as program_name, e.user_id
      FROM business_metrics bm
      JOIN enrollments e ON bm.enrollment_id = e.id
      JOIN users u ON e.user_id = u.id
      JOIN programs p ON e.program_id = p.id
      ORDER BY bm.calculated_annual_value DESC
    `).all();

    const totalAnnualValue = metrics.reduce((sum, m) => sum + (m.calculated_annual_value || 0), 0);
    const directCount = metrics.filter(m => m.attribution_confidence === 'direct').length;
    const correlationCount = metrics.filter(m => m.attribution_confidence === 'correlation').length;
    const unknownCount = metrics.filter(m => m.attribution_confidence === 'unknown').length;

    res.json({
      formula,
      metrics,
      summary: {
        total_annual_value: Math.round(totalAnnualValue * 100) / 100,
        metric_count: metrics.length,
        attribution_breakdown: {
          direct: directCount,
          correlation: correlationCount,
          unknown: unknownCount,
        },
      },
    });
  });

  // POST /api/metrics/roi/formula - Update ROI formula
  router.post('/roi/formula', (req, res) => {
    const { name, description, formula_code } = req.body;
    if (!name || !formula_code) {
      return res.status(400).json({ error: 'name and formula_code are required' });
    }

    // Deactivate current formula
    db.prepare('UPDATE roi_formulas SET active = 0 WHERE active = 1').run();

    // Insert new formula
    const result = db.prepare(`
      INSERT INTO roi_formulas (name, description, formula_code, active)
      VALUES (?, ?, ?, 1)
    `).run(name, description || '', formula_code);

    res.json({ id: result.lastInsertRowid, message: 'Formula updated' });
  });

  return router;
};
