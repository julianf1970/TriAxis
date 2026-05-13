const express = require('express');
const router = express.Router();

module.exports = function (db) {

  // ─── LEARNER DASHBOARD ──────────────────────────────────────
  // GET /api/dashboards/learner/:userId
  router.get('/learner/:userId', (req, res) => {
    const userId = req.params.userId;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Enrollments with program info
    const enrollments = db.prepare(`
      SELECT e.*, p.name as program_name, p.duration_weeks, p.target_skill_improvement
      FROM enrollments e
      JOIN programs p ON e.program_id = p.id
      WHERE e.user_id = ?
      ORDER BY e.start_date
    `).all(userId);

    // Skill progression per enrollment
    const skillProgress = {};
    for (const enr of enrollments) {
      skillProgress[enr.id] = db.prepare(`
        SELECT * FROM skill_measurements
        WHERE enrollment_id = ?
        ORDER BY metric_name, measurement_date
      `).all(enr.id);
    }

    // Cohort comparison: rank among all users for each metric in each program
    const cohortRankings = [];
    for (const enr of enrollments) {
      // Get latest measurement per metric for this user
      const latestMetrics = db.prepare(`
        SELECT metric_name, metric_value, metric_unit
        FROM skill_measurements
        WHERE enrollment_id = ?
        ORDER BY measurement_date DESC
      `).all(enr.id);

      const seenMetrics = new Set();
      for (const m of latestMetrics) {
        if (seenMetrics.has(m.metric_name)) continue;
        seenMetrics.add(m.metric_name);

        // Get all users' latest values for this metric in same program
        const allLatest = db.prepare(`
          SELECT e.user_id, sm.metric_value
          FROM skill_measurements sm
          JOIN enrollments e ON sm.enrollment_id = e.id
          WHERE e.program_id = ? AND sm.metric_name = ?
          AND sm.measurement_date = (
            SELECT MAX(sm2.measurement_date)
            FROM skill_measurements sm2
            WHERE sm2.enrollment_id = sm.enrollment_id AND sm2.metric_name = sm.metric_name
          )
          GROUP BY e.user_id
          ORDER BY sm.metric_value DESC
        `).all(enr.program_id, m.metric_name);

        // For metrics where lower is better (time, errors), reverse sort
        const lowerIsBetter = m.metric_unit === 'minutes' || m.metric_unit === 'seconds'
          || m.metric_unit === 'minutes_per_entry' || m.metric_unit === 'hours'
          || m.metric_unit === 'count_per_doc';
        if (lowerIsBetter) allLatest.reverse();

        const rank = allLatest.findIndex(r => r.user_id === parseInt(userId)) + 1;
        cohortRankings.push({
          program_name: enr.program_name,
          metric_name: m.metric_name,
          metric_value: m.metric_value,
          metric_unit: m.metric_unit,
          rank,
          total: allLatest.length,
        });
      }
    }

    // Experience surveys
    const surveys = db.prepare(`
      SELECT es.*, p.name as program_name
      FROM experience_surveys es
      JOIN enrollments e ON es.enrollment_id = e.id
      JOIN programs p ON e.program_id = p.id
      WHERE e.user_id = ?
      ORDER BY es.survey_date
    `).all(userId);

    res.json({
      user,
      enrollments,
      skillProgress,
      cohortRankings,
      surveys,
    });
  });

  // ─── MANAGER DASHBOARD ─────────────────────────────────────
  // GET /api/dashboards/manager/:userId
  // Simulates "my team" by grouping by practice_area
  router.get('/manager/:userId', (req, res) => {
    const manager = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.userId);
    if (!manager) return res.status(404).json({ error: 'User not found' });

    // Team = same practice_area (simulated org structure)
    const team = db.prepare(`
      SELECT u.*,
        (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id AND e.status = 'active') as active_programs,
        (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id AND e.status = 'completed') as completed_programs
      FROM users u
      WHERE u.practice_area = ? AND u.id != ?
      ORDER BY u.name
    `).all(manager.practice_area, manager.id);

    // Team progress summary per member
    const teamProgress = [];
    for (const member of team) {
      const latestSkills = db.prepare(`
        SELECT sm.metric_name, sm.metric_value, sm.metric_unit, p.name as program_name,
          (SELECT sm2.metric_value FROM skill_measurements sm2
           WHERE sm2.enrollment_id = sm.enrollment_id
           AND sm2.metric_name = sm.metric_name
           AND sm2.measurement_type = 'baseline') as baseline_value
        FROM skill_measurements sm
        JOIN enrollments e ON sm.enrollment_id = e.id
        JOIN programs p ON e.program_id = p.id
        WHERE e.user_id = ?
        AND sm.measurement_date = (
          SELECT MAX(sm3.measurement_date) FROM skill_measurements sm3
          WHERE sm3.enrollment_id = sm.enrollment_id AND sm3.metric_name = sm.metric_name
        )
        GROUP BY sm.enrollment_id, sm.metric_name
      `).all(member.id);

      teamProgress.push({ ...member, skills: latestSkills });
    }

    // Team business metrics aggregate
    const teamROI = db.prepare(`
      SELECT SUM(bm.calculated_annual_value) as total_value,
        SUM(bm.time_saved_minutes_per_week) as total_time_saved,
        AVG(bm.error_rate_change) as avg_error_change,
        COUNT(*) as metric_count
      FROM business_metrics bm
      JOIN enrollments e ON bm.enrollment_id = e.id
      JOIN users u ON e.user_id = u.id
      WHERE u.practice_area = ?
    `).get(manager.practice_area);

    // Comparison with other practice areas
    const allTeamROI = db.prepare(`
      SELECT u.practice_area,
        SUM(bm.calculated_annual_value) as total_value,
        COUNT(DISTINCT e.user_id) as team_size,
        AVG(bm.time_saved_minutes_per_week) as avg_time_saved
      FROM business_metrics bm
      JOIN enrollments e ON bm.enrollment_id = e.id
      JOIN users u ON e.user_id = u.id
      GROUP BY u.practice_area
    `).all();

    // Support queue: team members who need intervention
    const supportQueue = db.prepare(`
      SELECT u.id, u.name, u.role, p.name as program_name, e.id as enrollment_id,
        es.usefulness_rating, es.confidence_after, es.difficulty_level
      FROM experience_surveys es
      JOIN enrollments e ON es.enrollment_id = e.id
      JOIN users u ON e.user_id = u.id
      JOIN programs p ON e.program_id = p.id
      WHERE u.practice_area = ?
      AND (es.usefulness_rating <= 2 OR es.confidence_after <= 2 OR es.difficulty_level = 'too_hard')
      ORDER BY es.confidence_after ASC
    `).all(manager.practice_area);

    res.json({
      manager,
      team: teamProgress,
      teamROI,
      allTeamROI,
      supportQueue,
    });
  });

  // ─── L&D DASHBOARD ─────────────────────────────────────────
  // GET /api/dashboards/lnd
  router.get('/lnd', (req, res) => {
    // Program health overview
    const programHealth = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM enrollments e WHERE e.program_id = p.id) as total_enrolled,
        (SELECT COUNT(*) FROM enrollments e WHERE e.program_id = p.id AND e.status = 'completed') as completed,
        (SELECT COUNT(*) FROM enrollments e WHERE e.program_id = p.id AND e.status = 'active') as active,
        (SELECT COUNT(*) FROM enrollments e WHERE e.program_id = p.id AND e.status = 'dropped') as dropped,
        (SELECT AVG(es.usefulness_rating) FROM experience_surveys es
         JOIN enrollments e ON es.enrollment_id = e.id WHERE e.program_id = p.id) as avg_usefulness,
        (SELECT AVG(es.confidence_after - es.confidence_before) FROM experience_surveys es
         JOIN enrollments e ON es.enrollment_id = e.id WHERE e.program_id = p.id) as avg_confidence_gain
      FROM programs p
      ORDER BY p.name
    `).all();

    // Engagement vs skill correlation: compare usefulness ratings with actual improvement
    const engagementCorrelation = db.prepare(`
      SELECT e.id as enrollment_id, u.name as user_name, p.name as program_name,
        es.usefulness_rating,
        (SELECT AVG(
          CASE WHEN sm_final.metric_value IS NOT NULL AND sm_base.metric_value IS NOT NULL
          THEN ((sm_final.metric_value - sm_base.metric_value) / NULLIF(ABS(sm_base.metric_value), 0)) * 100
          ELSE NULL END
        )
        FROM skill_measurements sm_base
        JOIN skill_measurements sm_final ON sm_final.enrollment_id = sm_base.enrollment_id
          AND sm_final.metric_name = sm_base.metric_name
          AND sm_final.measurement_type = 'final'
        WHERE sm_base.enrollment_id = e.id AND sm_base.measurement_type = 'baseline'
        ) as avg_improvement_pct
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      JOIN programs p ON e.program_id = p.id
      LEFT JOIN experience_surveys es ON es.enrollment_id = e.id
      WHERE e.status = 'completed' AND es.usefulness_rating IS NOT NULL
      ORDER BY es.usefulness_rating DESC
    `).all();

    // Drop-off analysis
    const dropoffs = db.prepare(`
      SELECT u.name as user_name, u.role, p.name as program_name,
        e.start_date, e.end_date, e.status,
        es.difficulty_level, es.usefulness_rating, es.blocked_application
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      JOIN programs p ON e.program_id = p.id
      LEFT JOIN experience_surveys es ON es.enrollment_id = e.id
      WHERE e.status = 'dropped'
    `).all();

    // Intervention queue: low performers across all programs
    const interventionQueue = db.prepare(`
      SELECT u.id as user_id, u.name as user_name, u.role, u.office,
        p.name as program_name, e.id as enrollment_id, e.status,
        es.usefulness_rating, es.confidence_after, es.difficulty_level, es.blocked_application
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      JOIN programs p ON e.program_id = p.id
      LEFT JOIN experience_surveys es ON es.enrollment_id = e.id
      WHERE e.status IN ('active', 'completed')
      AND (es.confidence_after <= 2 OR es.difficulty_level = 'too_hard' OR e.status = 'dropped')
      ORDER BY COALESCE(es.confidence_after, 0) ASC
    `).all();

    // Success patterns: what's working
    const successPatterns = db.prepare(`
      SELECT p.name as program_name, u.role, u.practice_area, u.office,
        AVG(es.usefulness_rating) as avg_usefulness,
        AVG(es.confidence_after - es.confidence_before) as avg_confidence_gain,
        COUNT(*) as sample_size
      FROM experience_surveys es
      JOIN enrollments e ON es.enrollment_id = e.id
      JOIN users u ON e.user_id = u.id
      JOIN programs p ON e.program_id = p.id
      WHERE e.status = 'completed'
      GROUP BY p.name, u.role
      HAVING sample_size >= 1
      ORDER BY avg_usefulness DESC
    `).all();

    res.json({
      programHealth,
      engagementCorrelation,
      dropoffs,
      interventionQueue,
      successPatterns,
    });
  });

  // ─── LEADERSHIP DASHBOARD ──────────────────────────────────
  // GET /api/dashboards/leadership
  router.get('/leadership', (req, res) => {
    // Portfolio overview
    const portfolio = db.prepare(`
      SELECT p.id, p.name, p.duration_weeks, p.target_skill_improvement,
        COUNT(e.id) as total_enrollments,
        SUM(CASE WHEN e.status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN e.status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN e.status = 'dropped' THEN 1 ELSE 0 END) as dropped,
        COALESCE(SUM(bm.calculated_annual_value), 0) as total_value
      FROM programs p
      LEFT JOIN enrollments e ON e.program_id = p.id
      LEFT JOIN business_metrics bm ON bm.enrollment_id = e.id
      GROUP BY p.id
      ORDER BY total_value DESC
    `).all();

    // Business impact summary
    const impact = db.prepare(`
      SELECT
        SUM(bm.calculated_annual_value) as total_annual_value,
        SUM(bm.time_saved_minutes_per_week) as total_time_saved_weekly,
        AVG(bm.error_rate_change) as avg_error_rate_change,
        AVG(bm.sick_days_change) as avg_sick_days_change,
        SUM(bm.help_desk_tickets_change) as total_ticket_change,
        COUNT(*) as total_metrics
      FROM business_metrics bm
    `).get();

    // Attribution honesty breakdown
    const attribution = db.prepare(`
      SELECT attribution_confidence,
        COUNT(*) as count,
        SUM(calculated_annual_value) as total_value,
        AVG(calculated_annual_value) as avg_value
      FROM business_metrics
      GROUP BY attribution_confidence
    `).all();

    // Office comparison
    const officeComparison = db.prepare(`
      SELECT u.office,
        COUNT(DISTINCT e.user_id) as learner_count,
        COUNT(e.id) as total_enrollments,
        SUM(CASE WHEN e.status = 'completed' THEN 1 ELSE 0 END) as completed,
        COALESCE(SUM(bm.calculated_annual_value), 0) as total_value,
        COALESCE(AVG(bm.time_saved_minutes_per_week), 0) as avg_time_saved
      FROM users u
      LEFT JOIN enrollments e ON e.user_id = u.id
      LEFT JOIN business_metrics bm ON bm.enrollment_id = e.id
      GROUP BY u.office
      ORDER BY total_value DESC
    `).all();

    // Practice area comparison
    const practiceComparison = db.prepare(`
      SELECT u.practice_area,
        COUNT(DISTINCT e.user_id) as learner_count,
        COUNT(e.id) as total_enrollments,
        SUM(CASE WHEN e.status = 'completed' THEN 1 ELSE 0 END) as completed,
        COALESCE(SUM(bm.calculated_annual_value), 0) as total_value,
        COALESCE(AVG(bm.time_saved_minutes_per_week), 0) as avg_time_saved
      FROM users u
      LEFT JOIN enrollments e ON e.user_id = u.id
      LEFT JOIN business_metrics bm ON bm.enrollment_id = e.id
      GROUP BY u.practice_area
      ORDER BY total_value DESC
    `).all();

    // Investment justification estimate
    // Estimate training cost: ~£500 per person per program (rough estimate)
    const estimatedCostPerEnrollment = 500;
    const totalEnrollments = portfolio.reduce((s, p) => s + p.total_enrollments, 0);
    const estimatedTotalCost = totalEnrollments * estimatedCostPerEnrollment;
    const totalValue = impact.total_annual_value || 0;

    res.json({
      portfolio,
      impact,
      attribution,
      officeComparison,
      practiceComparison,
      investment: {
        estimated_cost: estimatedTotalCost,
        estimated_cost_per_enrollment: estimatedCostPerEnrollment,
        total_enrollments: totalEnrollments,
        total_annual_value: totalValue,
        roi_ratio: estimatedTotalCost > 0 ? Math.round((totalValue / estimatedTotalCost) * 100) / 100 : 0,
      },
    });
  });

  return router;
};
