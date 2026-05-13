/**
 * Leadership Dashboard
 * Portfolio overview, business impact, investment justification,
 * office/practice comparison, attribution honesty
 */
const LeadershipDashboard = {
  async render(container) {
    const data = await API.getLeadershipDashboard();
    const { portfolio, impact, attribution, officeComparison, practiceComparison, investment } = data;

    container.innerHTML = `
      <div class="dashboard-header">
        <h1>Executive Summary</h1>
        <p class="subtitle">Portfolio overview, business impact and investment justification</p>
      </div>

      <!-- Impact Stats -->
      <div class="stats-row">
        ${this.renderStatCards(impact, investment)}
      </div>

      <!-- Portfolio + Attribution Honesty -->
      <div class="grid-2-1">
        <div class="card">
          <div class="card-header"><h2>Programme Portfolio</h2></div>
          <div class="card-body" style="overflow-x: auto;">${this.renderPortfolioTable(portfolio)}</div>
        </div>
        <div class="card">
          <div class="card-header"><h2>Attribution Honesty</h2></div>
          <div class="card-body">
            ${this.renderAttributionBreakdown(attribution)}
            <div class="chart-container-sm" style="margin-top: 16px;">
              <canvas id="attribution-chart"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- Investment Justification -->
      <div class="card">
        <div class="card-header"><h2>Investment Justification</h2></div>
        <div class="card-body">
          <div class="grid-3">
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 12px; color: var(--gray-500); text-transform: uppercase; letter-spacing: 0.5px;">Estimated Cost</div>
              <div style="font-size: 32px; font-weight: 700; color: var(--red);">&pound;${investment.estimated_cost.toLocaleString()}</div>
              <div style="font-size: 12px; color: var(--gray-500);">${investment.total_enrollments} enrolments &times; &pound;${investment.estimated_cost_per_enrollment}/each</div>
            </div>
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 12px; color: var(--gray-500); text-transform: uppercase; letter-spacing: 0.5px;">Annual Value Generated</div>
              <div style="font-size: 32px; font-weight: 700; color: var(--green);">&pound;${Math.round(investment.total_annual_value).toLocaleString()}</div>
              <div style="font-size: 12px; color: var(--gray-500);">Based on time savings ROI formula</div>
            </div>
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 12px; color: var(--gray-500); text-transform: uppercase; letter-spacing: 0.5px;">ROI Ratio</div>
              <div style="font-size: 32px; font-weight: 700; color: ${investment.roi_ratio >= 1 ? 'var(--green)' : 'var(--red)'};">${investment.roi_ratio}x</div>
              <div style="font-size: 12px; color: var(--gray-500);">${investment.roi_ratio >= 1 ? 'Value exceeds cost' : 'Cost exceeds value'}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Office + Practice Area Comparisons -->
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h2>Office Comparison</h2></div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="office-chart"></canvas>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h2>Practice Area Comparison</h2></div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="practice-chart"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- Programme Value Breakdown -->
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h2>Value by Programme</h2></div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="portfolio-value-chart"></canvas>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h2>Operational Impact</h2></div>
          <div class="card-body">${this.renderOperationalImpact(impact)}</div>
        </div>
      </div>
    `;

    this.renderAttributionChart(attribution);
    this.renderOfficeChart(officeComparison);
    this.renderPracticeChart(practiceComparison);
    this.renderPortfolioValueChart(portfolio);
  },

  renderStatCards(impact, investment) {
    return `
      <div class="stat-card">
        <div class="stat-label">Total Annual Value</div>
        <div class="stat-value">&pound;${Math.round(impact.total_annual_value || 0).toLocaleString()}</div>
        <div class="stat-trend positive">From ${impact.total_metrics} completed programmes</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Weekly Time Saved</div>
        <div class="stat-value">${Math.round(impact.total_time_saved_weekly || 0)} min</div>
        <div class="stat-detail">Across all learners</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Error Rate Change</div>
        <div class="stat-value">${(impact.avg_error_rate_change || 0).toFixed(1)}%</div>
        <div class="stat-trend positive">Average reduction</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">ROI Ratio</div>
        <div class="stat-value">${investment.roi_ratio}x</div>
        <div class="stat-trend ${investment.roi_ratio >= 1 ? 'positive' : 'negative'}">${investment.roi_ratio >= 1 ? 'Positive return' : 'Negative return'}</div>
      </div>
    `;
  },

  renderPortfolioTable(portfolio) {
    return `<table class="data-table">
      <thead>
        <tr>
          <th>Programme</th>
          <th>Duration</th>
          <th>Enrolled</th>
          <th>Completed</th>
          <th>Dropped</th>
          <th>Annual Value</th>
        </tr>
      </thead>
      <tbody>
        ${portfolio.map(p => `
          <tr>
            <td><strong>${p.name}</strong></td>
            <td>${p.duration_weeks} weeks</td>
            <td>${p.total_enrollments}</td>
            <td>${p.completed}</td>
            <td>${p.dropped > 0 ? `<span class="badge badge-red">${p.dropped}</span>` : '0'}</td>
            <td>&pound;${Math.round(p.total_value).toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
  },

  renderAttributionBreakdown(attribution) {
    const total = attribution.reduce((s, a) => s + a.count, 0);
    if (total === 0) return '<div class="empty-state">No attribution data</div>';

    const getSegment = (type) => attribution.find(a => a.attribution_confidence === type) || { count: 0, total_value: 0 };
    const direct = getSegment('direct');
    const corr = getSegment('correlation');
    const unknown = getSegment('unknown');

    const directPct = Math.round((direct.count / total) * 100);
    const corrPct = Math.round((corr.count / total) * 100);
    const unknownPct = 100 - directPct - corrPct;

    return `
      <div class="attribution-bar">
        ${directPct > 0 ? `<div class="attribution-segment attribution-direct" style="width: ${directPct}%;">${directPct}%</div>` : ''}
        ${corrPct > 0 ? `<div class="attribution-segment attribution-correlation" style="width: ${corrPct}%;">${corrPct}%</div>` : ''}
        ${unknownPct > 0 ? `<div class="attribution-segment attribution-unknown" style="width: ${unknownPct}%;">${unknownPct}%</div>` : ''}
      </div>
      <div class="attribution-legend">
        <div class="attribution-legend-item">
          <div class="attribution-legend-dot" style="background: var(--green);"></div>
          Direct (&pound;${Math.round(direct.total_value || 0).toLocaleString()})
        </div>
        <div class="attribution-legend-item">
          <div class="attribution-legend-dot" style="background: var(--amber);"></div>
          Correlation (&pound;${Math.round(corr.total_value || 0).toLocaleString()})
        </div>
        <div class="attribution-legend-item">
          <div class="attribution-legend-dot" style="background: var(--gray-400);"></div>
          Unknown (&pound;${Math.round(unknown.total_value || 0).toLocaleString()})
        </div>
      </div>
    `;
  },

  renderOperationalImpact(impact) {
    return `
      <div style="display: grid; gap: 16px;">
        <div style="padding: 16px; background: var(--green-bg); border-radius: 8px;">
          <div style="font-size: 12px; color: var(--gray-600); text-transform: uppercase; margin-bottom: 4px;">Time Saved Weekly</div>
          <div style="font-size: 24px; font-weight: 700; color: var(--green);">${Math.round(impact.total_time_saved_weekly || 0)} minutes</div>
          <div style="font-size: 12px; color: var(--gray-600);">= ${((impact.total_time_saved_weekly || 0) / 60).toFixed(1)} hours across all learners</div>
        </div>
        <div style="padding: 16px; background: var(--green-bg); border-radius: 8px;">
          <div style="font-size: 12px; color: var(--gray-600); text-transform: uppercase; margin-bottom: 4px;">Error Rate Improvement</div>
          <div style="font-size: 24px; font-weight: 700; color: var(--green);">${(impact.avg_error_rate_change || 0).toFixed(1)}%</div>
          <div style="font-size: 12px; color: var(--gray-600);">Average error rate reduction</div>
        </div>
        <div style="padding: 16px; background: var(--gray-100); border-radius: 8px;">
          <div style="font-size: 12px; color: var(--gray-600); text-transform: uppercase; margin-bottom: 4px;">Help Desk Tickets</div>
          <div style="font-size: 24px; font-weight: 700; color: var(--navy);">${impact.total_ticket_change || 0}</div>
          <div style="font-size: 12px; color: var(--gray-600);">Change in support requests</div>
        </div>
      </div>
    `;
  },

  renderAttributionChart(attribution) {
    const labels = attribution.map(a => a.attribution_confidence.charAt(0).toUpperCase() + a.attribution_confidence.slice(1));
    const values = attribution.map(a => Math.round(a.total_value || 0));
    const colors = attribution.map(a => {
      if (a.attribution_confidence === 'direct') return TriAxisCharts.colors.green;
      if (a.attribution_confidence === 'correlation') return TriAxisCharts.colors.amber;
      return TriAxisCharts.colors.gray500;
    });

    TriAxisCharts.doughnut('attribution-chart', labels, values, colors);
  },

  renderOfficeChart(officeComparison) {
    const labels = officeComparison.map(o => o.office);

    TriAxisCharts.barChart('office-chart', labels, [
      { label: 'Annual Value (£)', data: officeComparison.map(o => Math.round(o.total_value)), backgroundColor: TriAxisCharts.colors.blue, borderRadius: 4 },
      { label: 'Avg Time Saved (min)', data: officeComparison.map(o => Math.round(o.avg_time_saved)), backgroundColor: TriAxisCharts.colors.green, borderRadius: 4 },
    ]);
  },

  renderPracticeChart(practiceComparison) {
    const labels = practiceComparison.map(p => p.practice_area);

    TriAxisCharts.barChart('practice-chart', labels, [
      { label: 'Annual Value (£)', data: practiceComparison.map(p => Math.round(p.total_value)), backgroundColor: TriAxisCharts.colors.blue, borderRadius: 4 },
      { label: 'Avg Time Saved (min)', data: practiceComparison.map(p => Math.round(p.avg_time_saved)), backgroundColor: TriAxisCharts.colors.green, borderRadius: 4 },
    ]);
  },

  renderPortfolioValueChart(portfolio) {
    const labels = portfolio.map(p => p.name.split(' ').slice(0, 2).join(' '));
    const values = portfolio.map(p => Math.round(p.total_value));
    const colors = portfolio.map((_, i) => TriAxisCharts.seriesColors[i]);

    TriAxisCharts.horizontalBar('portfolio-value-chart', labels, values, colors, {
      plugins: { tooltip: { callbacks: { label: ctx => `\u00a3${ctx.raw.toLocaleString()}` } } },
    });
  },
};
