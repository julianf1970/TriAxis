/**
 * TriAxis API Client
 * Thin wrapper around fetch for all backend calls.
 */
const API = {
  BASE: '/api',

  async get(path) {
    const res = await fetch(this.BASE + path);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `API error ${res.status}`);
    }
    return res.json();
  },

  async post(path, body) {
    const res = await fetch(this.BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `API error ${res.status}`);
    }
    return res.json();
  },

  // Users
  getUsers: () => API.get('/users'),
  getUser: (id) => API.get(`/users/${id}`),
  getUserEnrollments: (id) => API.get(`/users/${id}/enrollments`),
  getUserProgress: (id) => API.get(`/users/${id}/progress`),

  // Programs
  getPrograms: () => API.get('/programs'),
  getProgram: (id) => API.get(`/programs/${id}`),
  getProgramParticipants: (id) => API.get(`/programs/${id}/participants`),

  // Dashboards
  getLearnerDashboard: (userId) => API.get(`/dashboards/learner/${userId}`),
  getManagerDashboard: (userId) => API.get(`/dashboards/manager/${userId}`),
  getLnDDashboard: () => API.get('/dashboards/lnd'),
  getLeadershipDashboard: () => API.get('/dashboards/leadership'),

  // Metrics
  getROI: () => API.get('/metrics/roi'),
  updateROIFormula: (data) => API.post('/metrics/roi/formula', data),
};
