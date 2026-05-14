const { createDatabase, DB_PATH } = require('./database');
const fs = require('fs');

// Remove existing database to start fresh
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log('Removed existing database.');
}

const db = createDatabase();
console.log('Created fresh database with schema.');

// ─── HELPERS ────────────────────────────────────────────────

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function dateOffset(baseDate, days) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ─── USERS ──────────────────────────────────────────────────

const users = [
  { name: 'Victoria Ashworth',  role: 'Partner',    practice_area: 'Corporate',   office: 'London',      hourly_rate: 400, hire_date: '2008-03-15' },
  { name: 'Richard Pemberton',  role: 'Partner',    practice_area: 'Litigation',  office: 'London',      hourly_rate: 400, hire_date: '2006-09-01' },
  { name: 'Sarah Chen',         role: 'Associate',  practice_area: 'Corporate',   office: 'London',      hourly_rate: 300, hire_date: '2018-01-10' },
  { name: 'James Okafor',       role: 'Associate',  practice_area: 'Litigation',  office: 'Manchester',  hourly_rate: 300, hire_date: '2019-06-03' },
  { name: 'Emily Thornton',     role: 'Associate',  practice_area: 'Real Estate', office: 'Birmingham',  hourly_rate: 300, hire_date: '2020-09-14' },
  { name: 'Daniel Reeves',      role: 'Associate',  practice_area: 'Corporate',   office: 'Manchester',  hourly_rate: 300, hire_date: '2021-02-22' },
  { name: 'Priya Kapoor',       role: 'Associate',  practice_area: 'Litigation',  office: 'London',      hourly_rate: 300, hire_date: '2017-11-08' },
  { name: 'Thomas Fletcher',    role: 'Paralegal',  practice_area: 'Real Estate', office: 'Birmingham',  hourly_rate: 150, hire_date: '2022-04-11' },
  { name: 'Hannah Morgan',      role: 'Paralegal',  practice_area: 'Corporate',   office: 'London',      hourly_rate: 150, hire_date: '2023-01-09' },
  { name: 'Oliver Watts',       role: 'Paralegal',  practice_area: 'Litigation',  office: 'Manchester',  hourly_rate: 150, hire_date: '2022-08-20' },
];

const insertUser = db.prepare(`
  INSERT INTO users (name, role, practice_area, office, hourly_rate, hire_date)
  VALUES (@name, @role, @practice_area, @office, @hourly_rate, @hire_date)
`);

const insertUsers = db.transaction((rows) => {
  for (const row of rows) insertUser.run(row);
});

insertUsers(users);
console.log(`Inserted ${users.length} users.`);

// ─── PROGRAMS ───────────────────────────────────────────────

const programs = [
  {
    name: 'Microsoft Copilot Fundamentals',
    description: 'Learn to leverage AI-powered assistance across Word, Excel, Outlook and Teams for legal work.',
    target_skill_improvement: 30,
    duration_weeks: 4,
  },
  {
    name: 'iManage Advanced Filing & Search',
    description: 'Master document management with advanced filing structures, metadata tagging and full-text search.',
    target_skill_improvement: 25,
    duration_weeks: 3,
  },
  {
    name: 'Aderant Time Entry Excellence',
    description: 'Improve time capture accuracy and speed using Aderant Expert time entry features.',
    target_skill_improvement: 20,
    duration_weeks: 2,
  },
  {
    name: 'Document Automation with Word',
    description: 'Build and use document templates, clause libraries and automated assembly for standard legal documents.',
    target_skill_improvement: 35,
    duration_weeks: 4,
  },
  {
    name: 'Client Communication in Teams',
    description: 'Professional client communication using Microsoft Teams including channels, meetings and file sharing.',
    target_skill_improvement: 15,
    duration_weeks: 3,
  },
];

const insertProgram = db.prepare(`
  INSERT INTO programs (name, description, target_skill_improvement, duration_weeks)
  VALUES (@name, @description, @target_skill_improvement, @duration_weeks)
`);

const insertPrograms = db.transaction((rows) => {
  for (const row of rows) insertProgram.run(row);
});

insertPrograms(programs);
console.log(`Inserted ${programs.length} programs.`);

// ─── ENROLLMENTS ────────────────────────────────────────────

// Each user gets 2-3 programs spread across 6 months (Aug 2025 - Jan 2026)
const enrollmentPlan = [
  // Victoria Ashworth (Partner, Corporate) - 2 programs
  { user_id: 1, program_id: 1, start_offset: 0 },
  { user_id: 1, program_id: 4, start_offset: 45 },
  // Richard Pemberton (Partner, Litigation) - 2 programs
  { user_id: 2, program_id: 5, start_offset: 10 },
  { user_id: 2, program_id: 2, start_offset: 60 },
  // Sarah Chen (Associate, Corporate) - 3 programs
  { user_id: 3, program_id: 1, start_offset: 5 },
  { user_id: 3, program_id: 2, start_offset: 40 },
  { user_id: 3, program_id: 4, start_offset: 90 },
  // James Okafor (Associate, Litigation) - 3 programs
  { user_id: 4, program_id: 3, start_offset: 0 },
  { user_id: 4, program_id: 1, start_offset: 30 },
  { user_id: 4, program_id: 5, start_offset: 80 },
  // Emily Thornton (Associate, Real Estate) - 2 programs
  { user_id: 5, program_id: 2, start_offset: 15 },
  { user_id: 5, program_id: 4, start_offset: 55 },
  // Daniel Reeves (Associate, Corporate) - 3 programs
  { user_id: 6, program_id: 1, start_offset: 10 },
  { user_id: 6, program_id: 3, start_offset: 50 },
  { user_id: 6, program_id: 5, start_offset: 100 },
  // Priya Kapoor (Associate, Litigation) - 2 programs
  { user_id: 7, program_id: 5, start_offset: 20 },
  { user_id: 7, program_id: 1, start_offset: 70 },
  // Thomas Fletcher (Paralegal, Real Estate) - 3 programs
  { user_id: 8, program_id: 2, start_offset: 0 },
  { user_id: 8, program_id: 3, start_offset: 35 },
  { user_id: 8, program_id: 4, start_offset: 75 },
  // Hannah Morgan (Paralegal, Corporate) - 2 programs
  { user_id: 9, program_id: 1, start_offset: 25 },
  { user_id: 9, program_id: 3, start_offset: 70 },
  // Oliver Watts (Paralegal, Litigation) - 3 programs
  { user_id: 10, program_id: 5, start_offset: 5 },
  { user_id: 10, program_id: 2, start_offset: 45 },
  { user_id: 10, program_id: 1, start_offset: 95 },
];

const BASE_DATE = '2025-08-01';

const insertEnrollment = db.prepare(`
  INSERT INTO enrollments (user_id, program_id, start_date, end_date, status)
  VALUES (@user_id, @program_id, @start_date, @end_date, @status)
`);

// Metric definitions per program
const programMetrics = {
  1: [ // Copilot Fundamentals
    { name: 'copilot_prompt_accuracy', unit: 'percentage', baseRange: [20, 40], improveRange: [15, 35] },
    { name: 'copilot_usage_frequency', unit: 'times_per_day', baseRange: [1, 4], improveRange: [3, 8] },
    { name: 'document_draft_time', unit: 'minutes', baseRange: [45, 75], improveRange: [-25, -10] },
  ],
  2: [ // iManage Filing
    { name: 'filing_accuracy', unit: 'percentage', baseRange: [55, 75], improveRange: [10, 25] },
    { name: 'search_time', unit: 'seconds', baseRange: [90, 180], improveRange: [-70, -30] },
    { name: 'metadata_compliance', unit: 'percentage', baseRange: [40, 65], improveRange: [15, 30] },
  ],
  3: [ // Aderant Time Entry
    { name: 'time_entry_speed', unit: 'minutes_per_entry', baseRange: [5, 10], improveRange: [-4, -1] },
    { name: 'time_capture_rate', unit: 'percentage', baseRange: [60, 80], improveRange: [10, 20] },
    { name: 'entry_accuracy', unit: 'percentage', baseRange: [70, 85], improveRange: [5, 15] },
  ],
  4: [ // Document Automation
    { name: 'template_usage_rate', unit: 'percentage', baseRange: [10, 30], improveRange: [25, 50] },
    { name: 'document_assembly_time', unit: 'minutes', baseRange: [30, 60], improveRange: [-25, -10] },
    { name: 'formatting_errors', unit: 'count_per_doc', baseRange: [5, 12], improveRange: [-8, -3] },
  ],
  5: [ // Teams Communication
    { name: 'teams_adoption_score', unit: 'percentage', baseRange: [30, 55], improveRange: [15, 35] },
    { name: 'client_response_time', unit: 'hours', baseRange: [4, 12], improveRange: [-6, -2] },
    { name: 'meeting_effectiveness', unit: 'rating_1to10', baseRange: [4, 6], improveRange: [1, 3] },
  ],
};

// Learner profiles: some are strong, some average, some struggle
const learnerProfiles = {
  1: 'strong',    // Victoria - senior, picks up quickly
  2: 'average',   // Richard - busy partner, average engagement
  3: 'strong',    // Sarah - motivated associate
  4: 'average',   // James
  5: 'weak',      // Emily - struggles with tech
  6: 'strong',    // Daniel - tech-savvy
  7: 'average',   // Priya
  8: 'strong',    // Thomas - eager paralegal
  9: 'weak',      // Hannah - new, overwhelmed
  10: 'average',  // Oliver
};

const profileMultiplier = { strong: 1.2, average: 1.0, weak: 0.6 };

// ─── REGRESSION OVERRIDES ───────────────────────────────────
// Per-(user_id, program_id, metric_name) override on the final value (for completed
// enrollments) or the last checkpoint value (for dropped enrollments).
// Specified as a multiplier of the baseline value. A multiplier of 0.88 means
// the final/latest value is 88% of baseline (12% regression for higher-is-better
// metrics like percentage accuracy). For lower-is-better metrics (time, errors),
// a multiplier > 1.0 represents regression (e.g. 1.25 = 25% worse).
//
// These overrides are the ONLY source of regression in the demo data.
// All other learners and metrics follow the standard improveRange logic.
// The demo includes deliberate regression so that the heatmap's negative-change
// rendering can be demonstrated honestly.
const regressionOverrides = {
  // Hannah Morgan (id 9, weak profile, new paralegal): regressed on
  // copilot_prompt_accuracy in Copilot Fundamentals. Story: she tried
  // Copilot prompts early, got poor results, gradually stopped engaging
  // with the suggestion mechanism, and her prompt quality slipped below
  // where she started. Programme completed in attendance terms; capability
  // outcome was negative. Applies to FINAL value.
  '9-1-copilot_prompt_accuracy': 0.88,  // higher is better -> 12% below baseline

  // Emily Thornton (id 5, weak profile, dropped Doc Automation halfway):
  // regressed on formatting_errors. Story: half-learned a new workflow,
  // dropped before consolidating, ended up making MORE errors than at
  // baseline because she'd disrupted her old habits without forming new
  // ones. Status is 'dropped' so this applies to the LAST CHECKPOINT.
  // (Renamed in the UI to 'Formatting Consistency' with neutral phrasing.)
  '5-4-formatting_errors': 1.25,  // lower is better -> 25% worse than baseline
};

const insertSkill = db.prepare(`
  INSERT INTO skill_measurements (enrollment_id, measurement_type, measurement_date, metric_name, metric_value, metric_unit)
  VALUES (@enrollment_id, @measurement_type, @measurement_date, @metric_name, @metric_value, @metric_unit)
`);

const insertSurvey = db.prepare(`
  INSERT INTO experience_surveys (enrollment_id, survey_date, usefulness_rating, difficulty_level, confidence_before, confidence_after, would_recommend, blocked_application)
  VALUES (@enrollment_id, @survey_date, @usefulness_rating, @difficulty_level, @confidence_before, @confidence_after, @would_recommend, @blocked_application)
`);

const insertBusiness = db.prepare(`
  INSERT INTO business_metrics (enrollment_id, metric_date, time_saved_minutes_per_week, error_rate_change, sick_days_change, help_desk_tickets_change, calculated_annual_value, attribution_confidence, confounding_factors)
  VALUES (@enrollment_id, @metric_date, @time_saved_minutes_per_week, @error_rate_change, @sick_days_change, @help_desk_tickets_change, @calculated_annual_value, @attribution_confidence, @confounding_factors)
`);

const seedAll = db.transaction(() => {
  let enrollmentId = 0;

  for (const plan of enrollmentPlan) {
    const program = programs[plan.program_id - 1];
    const durationDays = program.duration_weeks * 7;
    const startDate = dateOffset(BASE_DATE, plan.start_offset);
    const endDate = dateOffset(BASE_DATE, plan.start_offset + durationDays);
    const today = new Date('2026-02-01');
    const endD = new Date(endDate);

    // Determine status: most completed, a few dropped
    let status = 'completed';
    if (endD > today) {
      status = 'active';
    } else if (plan.user_id === 5 && plan.program_id === 4) {
      status = 'dropped'; // Emily dropped Document Automation
    } else if (plan.user_id === 9 && plan.program_id === 3) {
      status = 'dropped'; // Hannah dropped Aderant
    }

    insertEnrollment.run({
      user_id: plan.user_id,
      program_id: plan.program_id,
      start_date: startDate,
      end_date: status === 'active' ? null : endDate,
      status,
    });

    enrollmentId++;
    const metrics = programMetrics[plan.program_id];
    const profile = learnerProfiles[plan.user_id];
    const mult = profileMultiplier[profile];

    // ── Skill Measurements ──
    // baseline, 2-3 checkpoints, final (if completed)
    const checkpoints = program.duration_weeks >= 4 ? 3 : 2;

    for (const metric of metrics) {
      // Baseline value
      const baseValue = randomBetween(metric.baseRange[0], metric.baseRange[1]);

      insertSkill.run({
        enrollment_id: enrollmentId,
        measurement_type: 'baseline',
        measurement_date: startDate,
        metric_name: metric.name,
        metric_value: Math.round(baseValue * 100) / 100,
        metric_unit: metric.unit,
      });

      // Total improvement for this learner
      const totalImprove = randomBetween(metric.improveRange[0], metric.improveRange[1]) * mult;

      // Checkpoints
      // Look up any regression override for this (user, program, metric) tuple.
      // Declared once here so both the checkpoint loop and the final-value block
      // below can use it without redeclaring.
      const overrideKey = `${plan.user_id}-${plan.program_id}-${metric.name}`;
      const checkpointOverride = (status === 'dropped' && regressionOverrides[overrideKey] !== undefined)
        ? regressionOverrides[overrideKey]
        : null;
      for (let c = 1; c <= checkpoints; c++) {
        const fraction = c / (checkpoints + 1);
        // Learning curve: fast early, slower later
        const curveFraction = Math.pow(fraction, 0.7);
        const currentImprove = totalImprove * curveFraction + randomBetween(-2, 2);
        const cpDate = dateOffset(startDate, Math.round(durationDays * fraction));

        // For dropped enrollments with a regression override, the LAST checkpoint
        // (c === checkpoints) becomes the regression value, because there will be
        // no 'final' measurement. Earlier checkpoints still follow the normal curve
        // so the trajectory shows the learner starting reasonably and slipping.
        const value = (checkpointOverride !== null && c === checkpoints)
          ? baseValue * checkpointOverride + randomBetween(-0.5, 0.5)
          : baseValue + currentImprove;

        insertSkill.run({
          enrollment_id: enrollmentId,
          measurement_type: 'checkpoint',
          measurement_date: cpDate,
          metric_name: metric.name,
          metric_value: Math.round(value * 100) / 100,
          metric_unit: metric.unit,
        });
      }

      // Final measurement (if completed)
      if (status === 'completed') {
        const override = regressionOverrides[overrideKey];
        const finalValue = override !== undefined
          ? baseValue * override + randomBetween(-0.5, 0.5)
          : baseValue + totalImprove + randomBetween(-1, 1);
        insertSkill.run({
          enrollment_id: enrollmentId,
          measurement_type: 'final',
          measurement_date: endDate,
          metric_name: metric.name,
          metric_value: Math.round(finalValue * 100) / 100,
          metric_unit: metric.unit,
        });
      }
    }

    // ── Experience Survey (at completion) ──
    if (status === 'completed' || status === 'dropped') {
      const confBefore = profile === 'strong' ? randomInt(2, 3) : profile === 'weak' ? randomInt(1, 2) : randomInt(2, 3);
      const confAfter = status === 'dropped'
        ? confBefore + randomInt(-1, 0)
        : confBefore + randomInt(1, 2);

      const blockers = [
        null,
        'Too busy with client deadlines',
        'IT issues with software access',
        'Manager did not support practice time',
        'Content not relevant to my practice area',
        null,
        'Existing workflows hard to change',
        null,
      ];

      insertSurvey.run({
        enrollment_id: enrollmentId,
        survey_date: status === 'dropped' ? dateOffset(startDate, Math.round(durationDays * 0.5)) : endDate,
        usefulness_rating: status === 'dropped' ? randomInt(2, 3) : (profile === 'strong' ? randomInt(4, 5) : randomInt(3, 4)),
        difficulty_level: profile === 'weak' ? 'too_hard' : (profile === 'strong' ? pick(['just_right', 'too_easy']) : 'just_right'),
        confidence_before: Math.max(1, Math.min(5, confBefore)),
        confidence_after: Math.max(1, Math.min(5, confAfter)),
        would_recommend: status !== 'dropped' && profile !== 'weak' ? 1 : 0,
        blocked_application: pick(blockers),
      });
    }

    // ── Business Metrics ──
    if (status === 'completed') {
      const user = users[plan.user_id - 1];
      const timeSaved = Math.round(randomBetween(10, 60) * mult);
      const annualValue = Math.round((timeSaved / 60) * user.hourly_rate * 48 * 100) / 100;

      // Attribution varies: some direct, some correlation, some unknown
      let attribution, confounders;
      if (timeSaved > 40) {
        attribution = 'direct';
        confounders = null;
      } else if (timeSaved > 20) {
        attribution = 'correlation';
        confounders = pick([
          'New team member also started',
          'Office reorganisation occurred simultaneously',
          'Client volume decreased in period',
          'IT infrastructure upgrade happened concurrently',
        ]);
      } else {
        attribution = 'unknown';
        confounders = pick([
          'Multiple training programmes running simultaneously',
          'Market conditions changed significantly',
          'Role responsibilities shifted during period',
          'Seasonal variation in workload',
        ]);
      }

      insertBusiness.run({
        enrollment_id: enrollmentId,
        metric_date: endDate,
        time_saved_minutes_per_week: timeSaved,
        error_rate_change: Math.round(randomBetween(-15, -1) * mult * 10) / 10,
        sick_days_change: Math.round(randomBetween(-2, 1) * 10) / 10,
        help_desk_tickets_change: randomInt(-5, 0),
        calculated_annual_value: annualValue,
        attribution_confidence: attribution,
        confounding_factors: confounders,
      });
    }
  }
});

seedAll();
console.log(`Inserted ${enrollmentPlan.length} enrollments with measurements, surveys and business metrics.`);

// ─── ROI FORMULA ────────────────────────────────────────────

db.prepare(`
  INSERT INTO roi_formulas (name, description, formula_code, active)
  VALUES (@name, @description, @formula_code, @active)
`).run({
  name: 'Time Savings ROI',
  description: 'Calculates annual value based on time saved per week multiplied by hourly rate over 48 working weeks.',
  formula_code: '(time_saved_minutes_per_week / 60) * hourly_rate * 48',
  active: 1,
});

console.log('Inserted default ROI formula.');

// ─── SUMMARY ────────────────────────────────────────────────

const counts = {
  users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
  programs: db.prepare('SELECT COUNT(*) as c FROM programs').get().c,
  enrollments: db.prepare('SELECT COUNT(*) as c FROM enrollments').get().c,
  skill_measurements: db.prepare('SELECT COUNT(*) as c FROM skill_measurements').get().c,
  experience_surveys: db.prepare('SELECT COUNT(*) as c FROM experience_surveys').get().c,
  business_metrics: db.prepare('SELECT COUNT(*) as c FROM business_metrics').get().c,
};

console.log('\nDatabase seeded successfully:');
console.log(`  Users:              ${counts.users}`);
console.log(`  Programs:           ${counts.programs}`);
console.log(`  Enrollments:        ${counts.enrollments}`);
console.log(`  Skill Measurements: ${counts.skill_measurements}`);
console.log(`  Experience Surveys: ${counts.experience_surveys}`);
console.log(`  Business Metrics:   ${counts.business_metrics}`);

db.close();
