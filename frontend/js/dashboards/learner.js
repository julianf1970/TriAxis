/**
 * Learner Dashboard
 * Individual view: progress charts, cohort ranking, skill progression, confidence trajectory
 */
const LearnerDashboard = {
  async render(container, userId) {
    const data = await API.getLearnerDashboard(userId);
    const { user, enrollments, skillProgress, cohortRankings, surveys } = data;

    container.innerHTML = `
      <div class="dashboard-header">
        <h1>${user.name}</h1>
        <p class="subtitle">${user.role} &middot; ${user.practice_area} &middot; ${user.office} &middot; ${enrollments.length} programme${enrollments.length !== 1 ? 's' : ''}</p>
      </div>

      <!-- Stats Row -->
      <div class="stats-row">
        ${this.renderStatCards(enrollments, surveys, cohortRankings)}
      </div>

      <!-- Skill Progression Charts -->
      <div class="grid-2">
        ${enrollments.map((enr, i) => `
          <div class="card">
            <div class="card-header">
              <h2>${enr.program_name}</h2>
              <span class="badge ${enr.status === 'completed' ? 'badge-green' : enr.status === 'active' ? 'badge-blue' : 'badge-red'}">${enr.status}</span>
            </div>
            <div class="card-body">
              <div class="chart-container">
                <canvas id="progress-chart-${i}"></canvas>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Cohort Ranking + Heatmap -->
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h2>Cohort Ranking</h2></div>
          <div class="card-body">${this.renderCohortRankings(cohortRankings)}</div>
        </div>
        <div class="card">
          <div class="card-header"><h2>Skill Progression</h2></div>
          <div class="card-body">${this.renderHeatmap(enrollments, skillProgress)}</div>
        </div>
      </div>

      <!-- Confidence Trajectory + Recommendations -->
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h2>Confidence Trajectory</h2></div>
          <div class="card-body">
            <div class="chart-container-sm">
              <canvas id="confidence-chart"></canvas>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h2>Next Steps</h2></div>
          <div class="card-body">${this.renderRecommendations(cohortRankings, enrollments)}</div>
        </div>
      </div>
    `;

    // Render charts after DOM is ready
    this.renderProgressCharts(enrollments, skillProgress);
    this.renderConfidenceChart(surveys);
  },

  renderStatCards(enrollments, surveys, rankings) {
    const completed = enrollments.filter(e => e.status === 'completed').length;
    const active = enrollments.filter(e => e.status === 'active').length;
    const avgConf = surveys.length > 0
      ? (surveys.reduce((s, sv) => s + (sv.confidence_after || 0), 0) / surveys.length).toFixed(1)
      : '-';
    const topRankings = rankings.filter(r => r.rank <= 3).length;

    return `
      <div class="stat-card">
        <div class="stat-label">Programmes Completed</div>
        <div class="stat-value">${completed}</div>
        <div class="stat-detail">${active} active</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg Confidence</div>
        <div class="stat-value">${avgConf}</div>
        <div class="stat-detail">out of 5</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Top 3 Rankings</div>
        <div class="stat-value">${topRankings}</div>
        <div class="stat-detail">across ${rankings.length} metrics</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Programmes</div>
        <div class="stat-value">${enrollments.length}</div>
        <div class="stat-detail">${enrollments.filter(e => e.status === 'dropped').length} dropped</div>
      </div>
    `;
  },

  renderProgressCharts(enrollments, skillProgress) {
    enrollments.forEach((enr, i) => {
      const measurements = skillProgress[enr.id] || [];
      if (!measurements.length) return;

      // Group by metric_name
      const grouped = {};
      measurements.forEach(m => {
        if (!grouped[m.metric_name]) grouped[m.metric_name] = [];
        grouped[m.metric_name].push(m);
      });

      const metricNames = Object.keys(grouped);
      // Use the metric with the most data points to define labels
      const longestSeries = metricNames.reduce((a, b) =>
        grouped[a].length >= grouped[b].length ? a : b
      );
      const labels = grouped[longestSeries].map(m => {
        if (m.measurement_type === 'baseline') return 'Baseline';
        if (m.measurement_type === 'final') return 'Final';
        return m.measurement_date.substring(5); // MM-DD
      });

      const datasets = metricNames.map((name, idx) => ({
        label: TriAxisCharts.formatMetricName(name),
        data: grouped[name].map(m => m.metric_value),
        borderColor: TriAxisCharts.seriesColors[idx % TriAxisCharts.seriesColors.length],
        backgroundColor: TriAxisCharts.seriesColors[idx % TriAxisCharts.seriesColors.length] + '20',
        tension: 0.3,
        fill: false,
        pointRadius: 5,
        pointHoverRadius: 7,
      }));

      TriAxisCharts.progressLine(`progress-chart-${i}`, datasets, labels);
    });
  },

  renderCohortRankings(rankings) {
    if (!rankings.length) return '<div class="empty-state">No cohort data available</div>';

    return rankings.map(r => `
      <div class="ranking">
        <div class="ranking-position ${r.rank <= 3 ? 'top-3' : ''}">#${r.rank}</div>
        <div class="ranking-info">
          <div class="ranking-metric">${TriAxisCharts.formatMetricName(r.metric_name)}</div>
          <div class="ranking-detail">${r.program_name} &middot; ${TriAxisCharts.formatMetricValue(r.metric_value, r.metric_unit)} &middot; ${r.rank} of ${r.total}</div>
        </div>
      </div>
    `).join('');
  },

  renderHeatmap(enrollments, skillProgress) {
    const skills = [];
    enrollments.forEach(enr => {
      const measurements = skillProgress[enr.id] || [];
      const grouped = {};
      measurements.forEach(m => {
        if (!grouped[m.metric_name]) grouped[m.metric_name] = { baseline: null, latest: null, unit: m.metric_unit };
        if (m.measurement_type === 'baseline') grouped[m.metric_name].baseline = m.metric_value;
        grouped[m.metric_name].latest = m.metric_value; // last one will be latest
      });

      Object.entries(grouped).forEach(([name, vals]) => {
        if (vals.baseline === null) return;
        const lowerIsBetter = ['minutes', 'seconds', 'minutes_per_entry', 'hours', 'count_per_doc'].includes(vals.unit);
        let pctChange = ((vals.latest - vals.baseline) / Math.abs(vals.baseline)) * 100;
        if (lowerIsBetter) pctChange = -pctChange; // Invert so positive = improvement

        skills.push({
          name,
          baseline: vals.baseline,
          latest: vals.latest,
          unit: vals.unit,
          pctChange: Math.round(pctChange),
          program: enr.program_name,
        });
      });
    });

    if (!skills.length) return '<div class="empty-state">No skill data available</div>';

    // Sort by improvement (best at top)
    skills.sort((a, b) => b.pctChange - a.pctChange);

    return `<div class="heatmap">
      ${skills.map(s => {
        const isImprove = s.pctChange >= 0;
        const dirClass = isImprove ? 'improve' : 'regress';
        const summary = TriAxisCharts.summaryPhrase(s.unit, s.pctChange, s.name);
        return `
          <div class="heatmap-row">
            <div class="heatmap-label" title="${s.program}">${TriAxisCharts.formatMetricName(s.name)}</div>
            <div class="heatmap-journey">
              <div class="journey-track">
                <span class="journey-baseline">${TriAxisCharts.formatMetricValue(s.baseline, s.unit)}</span>
                <span class="journey-arrow journey-arrow-${dirClass}">→</span>
                <span class="journey-current">${TriAxisCharts.formatMetricValue(s.latest, s.unit)}</span>
              </div>
              <span class="journey-summary journey-summary-${dirClass}">${summary}</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>`;
  },

  renderConfidenceChart(surveys) {
    if (!surveys.length) return;

    const labels = surveys.map(s => s.program_name.split(' ').slice(0, 2).join(' '));
    const before = surveys.map(s => s.confidence_before);
    const after = surveys.map(s => s.confidence_after);

    TriAxisCharts.barChart('confidence-chart', labels, [
      { label: 'Before', data: before, backgroundColor: TriAxisCharts.colors.gray300, borderRadius: 4 },
      { label: 'After', data: after, backgroundColor: TriAxisCharts.colors.blue, borderRadius: 4 },
    ], { scales: { y: { beginAtZero: true, max: 5 } } });
  },

  renderRecommendations(rankings, enrollments) {
    const weakAreas = rankings.filter(r => r.rank > Math.ceil(r.total / 2));
    const activePrograms = enrollments.filter(e => e.status === 'active');

    let html = '<div style="font-size: 14px; color: var(--gray-700);">';

    if (weakAreas.length > 0) {
      const worst = weakAreas.sort((a, b) => b.rank - a.rank).slice(0, 3);
      html += '<p style="margin-bottom: 12px; font-weight: 600;">Focus Areas:</p>';
      worst.forEach(w => {
        html += `<p style="margin-bottom: 8px; padding-left: 12px; border-left: 3px solid var(--amber);">
          Practice <strong>${TriAxisCharts.formatMetricName(w.metric_name)}</strong> to improve from #${w.rank}/${w.total} in ${w.program_name}
        </p>`;
      });
    }

    if (activePrograms.length > 0) {
      html += '<p style="margin-top: 16px; margin-bottom: 8px; font-weight: 600;">In Progress:</p>';
      activePrograms.forEach(p => {
        html += `<p style="margin-bottom: 8px; padding-left: 12px; border-left: 3px solid var(--blue);">
          Continue working on <strong>${p.program_name}</strong> (${p.duration_weeks} week programme)
        </p>`;
      });
    }

    if (weakAreas.length === 0 && activePrograms.length === 0) {
      html += '<p>All programmes completed. Great progress across all metrics!</p>';
    }

    html += '</div>';
    return html;
  },
};
