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

  // Format metric name for display
  formatMetricName(name) {
    return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  },

  // Status color helper
  statusColor(value, thresholds = { good: 70, mid: 40 }) {
    if (value >= thresholds.good) return this.colors.green;
    if (value >= thresholds.mid) return this.colors.amber;
    return this.colors.red;
  },
};
