/**
 * Manager Dashboard
 * Team overview, adoption tracking, support queue, team ROI, team comparison
 */
const ManagerDashboard = {
  async render(container, userId) {
    const data = await API.getManagerDashboard(userId);
    const { manager, team, teamROI, allTeamROI, supportQueue } = data;

    container.innerHTML = `
      <div class="dashboard-header">
        <h1>${manager.practice_area} Team</h1>
        <p class="subtitle">Managed by ${manager.name} &middot; ${team.length} team member${team.length !== 1 ? 's' : ''}</p>
      </div>

      <!-- Stats Row -->
      <div class="stats-row">
        ${this.renderStatCards(team, teamROI)}
      </div>

      <!-- Team Overview + Support Queue -->
      <div class="grid-2-1">
        <div class="card">
          <div class="card-header"><h2>Team Overview</h2></div>
          <div class="card-body" style="overflow-x: auto;">${this.renderTeamTable(team)}</div>
        </div>
        <div class="card">
          <div class="card-header">
            <h2>Needs Attention</h2>
            <span class="card-badge">${supportQueue.length}</span>
          </div>
          <div class="card-body">${this.renderSupportQueue(supportQueue)}</div>
        </div>
      </div>

      <!-- Adoption Tracking + Team Comparison -->
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h2>Skill Adoption</h2></div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="adoption-chart"></canvas>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h2>Team Comparison</h2></div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="team-comparison-chart"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- Team Business Metrics -->
      <div class="card">
        <div class="card-header"><h2>Team Business Impact</h2></div>
        <div class="card-body">
          <div class="chart-container-sm">
            <canvas id="team-roi-chart"></canvas>
          </div>
        </div>
      </div>
    `;

    this.renderAdoptionChart(team);
    this.renderTeamComparisonChart(allTeamROI, manager.practice_area);
    this.renderTeamROIChart(team);
  },

  renderStatCards(team, teamROI) {
    const totalActive = team.reduce((s, m) => s + m.active_programs, 0);
    const totalCompleted = team.reduce((s, m) => s + m.completed_programs, 0);
    const totalValue = teamROI.total_value || 0;
    const avgTimeSaved = teamROI.metric_count > 0
      ? Math.round(teamROI.total_time_saved / teamROI.metric_count)
      : 0;

    return `
      <div class="stat-card">
        <div class="stat-label">Team Members</div>
        <div class="stat-value">${team.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Active Programmes</div>
        <div class="stat-value">${totalActive}</div>
        <div class="stat-detail">${totalCompleted} completed</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Team Annual Value</div>
        <div class="stat-value">&pound;${Math.round(totalValue).toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg Time Saved</div>
        <div class="stat-value">${avgTimeSaved} min</div>
        <div class="stat-detail">per person per week</div>
      </div>
    `;
  },

  renderTeamTable(team) {
    if (!team.length) return '<div class="empty-state">No team members found</div>';

    return `<table class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Role</th>
          <th>Active</th>
          <th>Completed</th>
          <th>Skills Progress</th>
        </tr>
      </thead>
      <tbody>
        ${team.map(m => {
          // Calculate average improvement across skills
          let totalImprove = 0, skillCount = 0;
          m.skills.forEach(s => {
            if (s.baseline_value && s.baseline_value !== 0) {
              const pct = ((s.metric_value - s.baseline_value) / Math.abs(s.baseline_value)) * 100;
              totalImprove += Math.abs(pct);
              skillCount++;
            }
          });
          const avgImprove = skillCount > 0 ? Math.round(totalImprove / skillCount) : 0;
          const color = avgImprove >= 20 ? 'green' : avgImprove >= 10 ? 'amber' : 'red';

          return `<tr>
            <td><strong>${m.name}</strong></td>
            <td>${m.role}</td>
            <td>${m.active_programs}</td>
            <td>${m.completed_programs}</td>
            <td>
              <span class="status-dot ${color}"></span>
              ${avgImprove}% avg improvement
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
  },

  renderSupportQueue(queue) {
    if (!queue.length) return '<div class="empty-state">No one needs intervention right now</div>';

    return queue.map(q => `
      <div style="padding: 10px 0; border-bottom: 1px solid var(--gray-200);">
        <div style="font-weight: 600; font-size: 13px;">${q.name}</div>
        <div style="font-size: 12px; color: var(--gray-600);">${q.program_name}</div>
        <div style="margin-top: 4px;">
          ${q.difficulty_level === 'too_hard' ? '<span class="badge badge-red">Too Hard</span>' : ''}
          ${q.confidence_after && q.confidence_after <= 2 ? '<span class="badge badge-amber">Low Confidence</span>' : ''}
          ${q.usefulness_rating && q.usefulness_rating <= 2 ? '<span class="badge badge-gray">Low Engagement</span>' : ''}
        </div>
      </div>
    `).join('');
  },

  renderAdoptionChart(team) {
    const memberNames = team.map(m => m.name.split(' ')[0]);
    const datasets = [];

    // Collect all unique metric names
    const allMetrics = new Set();
    team.forEach(m => m.skills.forEach(s => allMetrics.add(s.metric_name)));

    let colorIdx = 0;
    allMetrics.forEach(metricName => {
      const data = team.map(m => {
        const skill = m.skills.find(s => s.metric_name === metricName);
        return skill ? skill.metric_value : 0;
      });

      if (data.some(v => v > 0)) {
        datasets.push({
          label: TriAxisCharts.formatMetricName(metricName),
          data,
          backgroundColor: TriAxisCharts.seriesColors[colorIdx % TriAxisCharts.seriesColors.length] + '80',
          borderColor: TriAxisCharts.seriesColors[colorIdx % TriAxisCharts.seriesColors.length],
          borderWidth: 1,
          borderRadius: 3,
        });
        colorIdx++;
      }
    });

    // Only show top 4 metrics to keep readable
    TriAxisCharts.barChart('adoption-chart', memberNames, datasets.slice(0, 4));
  },

  renderTeamComparisonChart(allTeamROI, currentPracticeArea) {
    const labels = allTeamROI.map(t => t.practice_area);
    const values = allTeamROI.map(t => Math.round(t.total_value || 0));
    const colors = allTeamROI.map(t =>
      t.practice_area === currentPracticeArea ? TriAxisCharts.colors.blue : TriAxisCharts.colors.gray300
    );

    TriAxisCharts.horizontalBar('team-comparison-chart', labels, values, colors, {
      plugins: { tooltip: { callbacks: { label: ctx => `\u00a3${ctx.raw.toLocaleString()}` } } },
    });
  },

  renderTeamROIChart(team) {
    // Show improvement per team member
    const labels = team.map(m => m.name.split(' ')[0]);
    const improvements = team.map(m => {
      let totalPct = 0, count = 0;
      m.skills.forEach(s => {
        if (s.baseline_value && s.baseline_value !== 0) {
          totalPct += Math.abs(((s.metric_value - s.baseline_value) / Math.abs(s.baseline_value)) * 100);
          count++;
        }
      });
      return count > 0 ? Math.round(totalPct / count) : 0;
    });

    const colors = improvements.map(v =>
      v >= 20 ? TriAxisCharts.colors.green : v >= 10 ? TriAxisCharts.colors.amber : TriAxisCharts.colors.red
    );

    TriAxisCharts.barChart('team-roi-chart', labels, [{
      label: 'Avg Skill Improvement %',
      data: improvements,
      backgroundColor: colors,
      borderRadius: 4,
    }]);
  },
};
