/**
 * L&D Dashboard
 * Programme health, engagement vs skill correlation, drop-off analysis,
 * intervention queue, success patterns
 */
const LnDDashboard = {
  async render(container) {
    const data = await API.getLnDDashboard();
    const { programHealth, engagementCorrelation, dropoffs, interventionQueue, successPatterns } = data;

    container.innerHTML = `
      <div class="dashboard-header">
        <h1>L&amp;D Overview</h1>
        <p class="subtitle">Programme health, engagement analysis and intervention tracking</p>
      </div>

      <!-- Stats Row -->
      <div class="stats-row">
        ${this.renderStatCards(programHealth)}
      </div>

      <!-- Programme Health -->
      <div class="card">
        <div class="card-header"><h2>Programme Health</h2></div>
        <div class="card-body" style="overflow-x: auto;">${this.renderProgramTable(programHealth)}</div>
      </div>

      <!-- Completion Rates + Engagement Correlation -->
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h2>Completion Rates</h2></div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="completion-chart"></canvas>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h2>Engagement vs Improvement</h2></div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="engagement-chart"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- Drop-off Analysis + Intervention Queue -->
      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <h2>Drop-off Analysis</h2>
            <span class="card-badge badge-red">${dropoffs.length} dropped</span>
          </div>
          <div class="card-body">${this.renderDropoffs(dropoffs)}</div>
        </div>
        <div class="card">
          <div class="card-header">
            <h2>Intervention Queue</h2>
            <span class="card-badge badge-amber">${interventionQueue.length} flagged</span>
          </div>
          <div class="card-body">${this.renderInterventionQueue(interventionQueue)}</div>
        </div>
      </div>

      <!-- Success Patterns -->
      <div class="card">
        <div class="card-header"><h2>Success Patterns</h2></div>
        <div class="card-body">
          <div class="chart-container">
            <canvas id="success-chart"></canvas>
          </div>
        </div>
      </div>
    `;

    this.renderCompletionChart(programHealth);
    this.renderEngagementChart(engagementCorrelation);
    this.renderSuccessChart(successPatterns);
  },

  renderStatCards(programHealth) {
    const totalEnrolled = programHealth.reduce((s, p) => s + p.total_enrolled, 0);
    const totalCompleted = programHealth.reduce((s, p) => s + p.completed, 0);
    const totalDropped = programHealth.reduce((s, p) => s + p.dropped, 0);
    const avgUsefulness = programHealth.reduce((s, p) => s + (p.avg_usefulness || 0), 0) / programHealth.length;
    const completionRate = totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 100) : 0;

    return `
      <div class="stat-card">
        <div class="stat-label">Total Enrolments</div>
        <div class="stat-value">${totalEnrolled}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Completion Rate</div>
        <div class="stat-value">${completionRate}%</div>
        <div class="stat-trend ${completionRate >= 80 ? 'positive' : completionRate >= 60 ? 'neutral' : 'negative'}">${totalCompleted} of ${totalEnrolled}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Drop-off Count</div>
        <div class="stat-value">${totalDropped}</div>
        <div class="stat-trend negative">${totalEnrolled > 0 ? Math.round((totalDropped / totalEnrolled) * 100) : 0}% drop rate</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg Usefulness</div>
        <div class="stat-value">${avgUsefulness.toFixed(1)}</div>
        <div class="stat-detail">out of 5</div>
      </div>
    `;
  },

  renderProgramTable(programHealth) {
    return `<table class="data-table">
      <thead>
        <tr>
          <th>Programme</th>
          <th>Enrolled</th>
          <th>Completed</th>
          <th>Active</th>
          <th>Dropped</th>
          <th>Avg Rating</th>
          <th>Confidence Gain</th>
        </tr>
      </thead>
      <tbody>
        ${programHealth.map(p => {
          const completionRate = p.total_enrolled > 0 ? Math.round((p.completed / p.total_enrolled) * 100) : 0;
          const rateColor = completionRate >= 80 ? 'green' : completionRate >= 60 ? 'amber' : 'red';
          return `<tr>
            <td><strong>${p.name}</strong><br><span style="font-size:11px;color:var(--gray-500)">${p.duration_weeks} weeks &middot; Target: +${p.target_skill_improvement}%</span></td>
            <td>${p.total_enrolled}</td>
            <td><span class="status-dot ${rateColor}"></span>${p.completed} (${completionRate}%)</td>
            <td>${p.active}</td>
            <td>${p.dropped > 0 ? `<span class="badge badge-red">${p.dropped}</span>` : '0'}</td>
            <td>${p.avg_usefulness ? p.avg_usefulness.toFixed(1) : '-'}/5</td>
            <td>${p.avg_confidence_gain ? `+${p.avg_confidence_gain.toFixed(1)}` : '-'}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
  },

  renderCompletionChart(programHealth) {
    const labels = programHealth.map(p => p.name.split(' ').slice(0, 2).join(' '));

    TriAxisCharts.barChart('completion-chart', labels, [
      { label: 'Completed', data: programHealth.map(p => p.completed), backgroundColor: TriAxisCharts.colors.green, borderRadius: 4 },
      { label: 'Active', data: programHealth.map(p => p.active), backgroundColor: TriAxisCharts.colors.blue, borderRadius: 4 },
      { label: 'Dropped', data: programHealth.map(p => p.dropped), backgroundColor: TriAxisCharts.colors.red, borderRadius: 4 },
    ], { scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } });
  },

  renderEngagementChart(correlation) {
    const valid = correlation.filter(c => c.usefulness_rating && c.avg_improvement_pct !== null);
    if (!valid.length) return;

    // Scatter-like: group by usefulness rating
    const byRating = {};
    valid.forEach(c => {
      const r = c.usefulness_rating;
      if (!byRating[r]) byRating[r] = [];
      byRating[r].push(Math.round(Math.abs(c.avg_improvement_pct)));
    });

    const labels = Object.keys(byRating).sort().map(r => `Rating ${r}`);
    const avgImprovements = Object.keys(byRating).sort().map(r => {
      const vals = byRating[r];
      return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
    });

    TriAxisCharts.barChart('engagement-chart', labels, [{
      label: 'Avg Improvement %',
      data: avgImprovements,
      backgroundColor: labels.map((_, i) => TriAxisCharts.seriesColors[i]),
      borderRadius: 4,
    }]);
  },

  renderDropoffs(dropoffs) {
    if (!dropoffs.length) return '<div class="empty-state">No drop-offs - excellent retention!</div>';

    return dropoffs.map(d => `
      <div style="padding: 12px 0; border-bottom: 1px solid var(--gray-200);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 600; font-size: 13px;">${d.user_name}</div>
            <div style="font-size: 12px; color: var(--gray-500);">${d.role} &middot; ${d.program_name}</div>
          </div>
          <span class="badge badge-red">Dropped</span>
        </div>
        ${d.difficulty_level ? `<div style="font-size: 12px; color: var(--gray-600); margin-top: 4px;">Difficulty: ${d.difficulty_level.replace('_', ' ')}</div>` : ''}
        ${d.blocked_application ? `<div style="font-size: 12px; color: var(--amber); margin-top: 2px;">Blocker: ${d.blocked_application}</div>` : ''}
      </div>
    `).join('');
  },

  renderInterventionQueue(queue) {
    if (!queue.length) return '<div class="empty-state">No learners flagged for intervention</div>';

    return queue.map(q => `
      <div style="padding: 10px 0; border-bottom: 1px solid var(--gray-200);">
        <div style="font-weight: 600; font-size: 13px;">${q.user_name}</div>
        <div style="font-size: 12px; color: var(--gray-500);">${q.role} &middot; ${q.office} &middot; ${q.program_name}</div>
        <div style="margin-top: 4px;">
          ${q.difficulty_level === 'too_hard' ? '<span class="badge badge-red">Too Hard</span> ' : ''}
          ${q.confidence_after && q.confidence_after <= 2 ? '<span class="badge badge-amber">Low Confidence</span> ' : ''}
          ${q.blocked_application ? `<span class="badge badge-gray">${q.blocked_application}</span>` : ''}
        </div>
      </div>
    `).join('');
  },

  renderSuccessChart(patterns) {
    if (!patterns.length) return;

    const labels = patterns.map(p => `${p.program_name.split(' ')[0]} (${p.role})`);
    const usefulness = patterns.map(p => p.avg_usefulness ? parseFloat(p.avg_usefulness.toFixed(1)) : 0);
    const confGain = patterns.map(p => p.avg_confidence_gain ? parseFloat(p.avg_confidence_gain.toFixed(1)) : 0);

    TriAxisCharts.barChart('success-chart', labels, [
      { label: 'Avg Usefulness (1-5)', data: usefulness, backgroundColor: TriAxisCharts.colors.blue + '80', borderRadius: 4 },
      { label: 'Avg Confidence Gain', data: confGain, backgroundColor: TriAxisCharts.colors.green + '80', borderRadius: 4 },
    ]);
  },
};
