/**
 * TriAxis Main Application Controller
 * Handles navigation, user selection, and dashboard loading.
 */
(function () {
  let currentDashboard = 'learner';
  let currentUserId = 1;
  let users = [];

  // ─── INITIALIZATION ──────────────────────────────────────

  async function init() {
    try {
      users = await API.getUsers();
      populateUserSelect(users);
      setupNavigation();
      loadDashboard(currentDashboard);
    } catch (err) {
      showError('Failed to connect to server. Is it running?');
      console.error(err);
    }
  }

  function populateUserSelect(users) {
    const select = document.getElementById('user-select');
    select.innerHTML = users.map(u =>
      `<option value="${u.id}">${u.name} (${u.role})</option>`
    ).join('');
    select.value = currentUserId;
    select.addEventListener('change', () => {
      currentUserId = parseInt(select.value);
      loadDashboard(currentDashboard);
    });
  }

  // ─── NAVIGATION ──────────────────────────────────────────

  function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const dashboard = link.dataset.dashboard;
        if (dashboard === currentDashboard) return;

        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        currentDashboard = dashboard;

        // Show/hide user select for dashboards that need it
        const userSelect = document.querySelector('.nav-user');
        userSelect.style.display = (dashboard === 'lnd' || dashboard === 'leadership') ? 'none' : 'flex';

        loadDashboard(dashboard);
      });
    });
  }

  // ─── DASHBOARD LOADING ───────────────────────────────────

  async function loadDashboard(name) {
    const container = document.getElementById('dashboard-container');
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading dashboard...</p></div>';

    try {
      switch (name) {
        case 'learner':
          await LearnerDashboard.render(container, currentUserId);
          break;
        case 'manager':
          await ManagerDashboard.render(container, currentUserId);
          break;
        case 'lnd':
          await LnDDashboard.render(container);
          break;
        case 'leadership':
          await LeadershipDashboard.render(container);
          break;
      }
    } catch (err) {
      showError(`Failed to load ${name} dashboard: ${err.message}`);
      console.error(err);
    }
  }

  // ─── HELPERS ─────────────────────────────────────────────

  function showError(message) {
    const container = document.getElementById('dashboard-container');
    container.innerHTML = `
      <div class="error-state">
        <p class="error-icon">!</p>
        <p class="error-message">${message}</p>
        <button onclick="location.reload()" class="btn btn-primary">Retry</button>
      </div>
    `;
  }

  // Expose for dashboards that need it
  window.TriAxisApp = { getCurrentUserId: () => currentUserId, getUsers: () => users };

  // Boot
  document.addEventListener('DOMContentLoaded', init);
})();
