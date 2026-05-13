/**
 * TriAxis Chart Utilities
 * Helpers for creating Chart.js charts with consistent styling.
 */
const TriAxisCharts = {
  // TriAxis colour palette
  colors: {
    navy: '#1a2744',
    slate: '#4a5568',
    blue: '#3182ce',
    lightBlue: '#63b3ed',
    green: '#38a169',
    amber: '#d69e2e',
    red: '#e53e3e',
    white: '#ffffff',
    gray100: '#f7fafc',
    gray200: '#edf2f7',
    gray300: '#e2e8f0',
    gray500: '#a0aec0',
  },

  // Palette for multi-series charts
  seriesColors: [
    '#3182ce', '#38a169', '#d69e2e', '#e53e3e', '#805ad5',
    '#63b3ed', '#68d391', '#fbd38d', '#fc8181', '#b794f4',
  ],

  // Destroy existing chart on a canvas if it exists
  destroy(canvasId) {
    const existing = Chart.getChart(canvasId);
    if (existing) existing.destroy();
  },

  // Line chart for skill progression
  progressLine(canvasId, datasets, labels, options = {}) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    return new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } },
          ...options.plugins,
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: options.beginAtZero || false, grid: { color: '#edf2f7' } },
        },
        ...options,
      },
    });
  },

  // Bar chart for comparisons
  barChart(canvasId, labels, datasets, options = {}) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    return new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } },
          ...options.plugins,
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: '#edf2f7' } },
        },
        ...options,
      },
    });
  },

  // Horizontal bar chart
  horizontalBar(canvasId, labels, data, colors, options = {}) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors || this.seriesColors,
          borderWidth: 0,
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, ...options.plugins },
        scales: {
          x: { beginAtZero: true, grid: { color: '#edf2f7' } },
          y: { grid: { display: false } },
        },
        ...options,
      },
    });
  },

  // Doughnut chart
  doughnut(canvasId, labels, data, colors, options = {}) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } },
          ...options.plugins,
        },
        ...options,
      },
    });
  },

  // Metric label overrides — maps raw metric_name to a display label
  // and an optional summary style. 'neutral' opts out of unit-specific phrasing
  // (e.g. '40% faster') in favour of generic 'improvement'/'decline' language,
  // appropriate when the label has been reframed away from the underlying unit.
  metricLabelOverrides: {
    formatting_errors: { display: 'Formatting Consistency', summaryStyle: 'neutral' },
  },

  // Format metric name for display
  formatMetricName(name) {
    const override = this.metricLabelOverrides[name];
    if (override && override.display) return override.display;
    return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  },

  // Format a metric value with its unit in a compact, scannable form.
  // Used in the heatmap journey row to display baseline and current values.
  formatMetricValue(value, unit) {
    if (value === null || value === undefined) return '—';
    switch (unit) {
      case 'percentage':         return Math.round(value) + '%';
      case 'minutes':            return Math.round(value) + ' mins';
      case 'seconds':            return Math.round(value) + ' sec';
      case 'hours':              return value.toFixed(1) + ' hrs';
      case 'minutes_per_entry':  return value.toFixed(1) + ' min/entry';
      case 'times_per_day':      return value.toFixed(1) + '/day';
      case 'count_per_doc':      return value.toFixed(1) + '/doc';
      case 'rating_1to10':       return value.toFixed(1) + '/10';
      default:                   return Math.round(value).toString();
    }
  },

  // Return a positively-framed summary phrase for a (unit, pctChange) pair.
  // pctChange is polarity-corrected upstream: positive = improvement regardless of
  // whether the underlying metric is 'more is better' or 'less is better'.
  // metric_name is consulted to allow overrides (e.g. 'neutral' style for renamed metrics).
  summaryPhrase(unit, pctChange, metric_name = null) {
    const abs = Math.abs(pctChange);
    const isImprove = pctChange >= 0;

    if (abs < 3) return 'no meaningful change';

    // Large-multiplier improvements get plain-English phrasing
    if (isImprove && abs >= 200) return 'more than tripled';
    if (isImprove && abs >= 100) return 'more than doubled';

    // If the metric has been renamed away from its unit (e.g. errors → Consistency),
    // use neutral improvement/decline language instead of unit-specific phrasing.
    const override = metric_name && this.metricLabelOverrides[metric_name];
    if (override && override.summaryStyle === 'neutral') {
      return isImprove ? abs + '% improvement' : abs + '% decline';
    }

    const timeUnits = ['minutes', 'seconds', 'hours', 'minutes_per_entry'];
    const countUnits = ['count_per_doc'];
    const freqUnits = ['times_per_day'];

    if (timeUnits.includes(unit))  return isImprove ? abs + '% faster'      : abs + '% slower';
    if (countUnits.includes(unit)) return isImprove ? abs + '% reduction'   : abs + '% more';
    if (freqUnits.includes(unit))  return isImprove ? abs + '% more often'  : abs + '% less often';
    return                                  isImprove ? abs + '% gain'         : abs + '% decline';
  },

  // Status color helper
  statusColor(value, thresholds = { good: 70, mid: 40 }) {
    if (value >= thresholds.good) return this.colors.green;
    if (value >= thresholds.mid) return this.colors.amber;
    return this.colors.red;
  },
};
