/**
 * SmartResolve AI: Shared JavaScript Utilities
 * Handles: Auth, API calls, Toasts, Routing helpers, DOM utilities
 */

// ── Constants ────────────────────────────────────────────────
const API_BASE = '/api';

// ── Auth Helpers ─────────────────────────────────────────────
const Auth = {
  getToken()  { return localStorage.getItem('sr_token'); },
  getUser()   {
    try { return JSON.parse(localStorage.getItem('sr_user')); }
    catch { return null; }
  },
  setSession(token, user) {
    localStorage.setItem('sr_token', token);
    localStorage.setItem('sr_user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('sr_token');
    localStorage.removeItem('sr_user');
  },
  isLoggedIn() { return !!this.getToken(); },
  hasRole(role) {
    const user = this.getUser();
    return user && user.role === role;
  },
  requireAuth(redirect = '/login.html') {
    if (!this.isLoggedIn()) {
      window.location.href = redirect;
      return false;
    }
    return true;
  },
  requireRole(role, redirect = '/login.html') {
    if (!this.isLoggedIn() || !this.hasRole(role)) {
      window.location.href = redirect;
      return false;
    }
    return true;
  },
  logout() {
    this.clearSession();
    window.location.href = '/login.html';
  }
};

// ── API Helper ───────────────────────────────────────────────
const Api = {
  async request(method, path, body = null, requiresAuth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (requiresAuth) {
      const token = Auth.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    try {
      const res = await fetch(`${API_BASE}${path}`, config);
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error?.message || data?.message || `Request failed (${res.status})`;
        if (res.status === 401) {
          Auth.clearSession();
          window.location.href = '/login.html';
        }
        throw new ApiError(msg, res.status, data);
      }
      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(err.message || 'Network error', 0, null);
    }
  },

  get(path, requiresAuth = true)       { return this.request('GET',    path, null, requiresAuth); },
  post(path, body, requiresAuth = true) { return this.request('POST',   path, body, requiresAuth); },
  put(path, body, requiresAuth = true)  { return this.request('PUT',    path, body, requiresAuth); },
  patch(path, body, requiresAuth = true){ return this.request('PATCH',  path, body, requiresAuth); },
  delete(path, requiresAuth = true)     { return this.request('DELETE', path, null, requiresAuth); },
};

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// ── Toast Notifications ──────────────────────────────────────
const Toast = {
  container: null,
  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  show(message, type = 'info', duration = 3500) {
    this.init();
    const icons = {
      success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
      error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
    };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `${icons[type] || icons.info}<span>${escapeHtml(message)}</span>`;
    this.container.appendChild(el);
    setTimeout(() => {
      el.classList.add('removing');
      setTimeout(() => el.remove(), 260);
    }, duration);
  },
  success(msg) { this.show(msg, 'success'); },
  error(msg)   { this.show(msg, 'error', 5000); },
  warning(msg) { this.show(msg, 'warning'); },
  info(msg)    { this.show(msg, 'info'); }
};

// ── DOM Utilities ────────────────────────────────────────────
function $(sel, ctx = document)  { return ctx.querySelector(sel); }
function $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatCurrency(amount) {
  if (amount == null) return 'N/A';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function pct(val) {
  if (val == null) return 'N/A';
  return `${Math.round(val * 100)}%`;
}

function badgeClass(val) {
  if (!val) return 'badge-default';
  const map = {
    // Urgency
    LOW: 'badge-LOW', MEDIUM: 'badge-MEDIUM', HIGH: 'badge-HIGH', CRITICAL: 'badge-CRITICAL',
    // Status
    ESCALATED: 'badge-ESCALATED', RESOLVED: 'badge-RESOLVED', ACTIVE: 'badge-ACTIVE',
    OPEN: 'badge-OPEN', CLOSED: 'badge-RESOLVED', IN_PROGRESS: 'badge-ACTIVE',
    // Order
    DELIVERED: 'badge-DELIVERED', PROCESSING: 'badge-PROCESSING', SHIPPED: 'badge-SHIPPED',
    IN_TRANSIT: 'badge-ACTIVE', OUT_FOR_DELIVERY: 'badge-WARNING', DELAYED: 'badge-MEDIUM',
    CANCELLED: 'badge-CANCELLED',
    // Sentiment
    calm: 'badge-success', neutral: 'badge-default', satisfied: 'badge-success',
    frustrated: 'badge-warning', angry: 'badge-danger', very_angry: 'badge-CRITICAL',
    confused: 'badge-info', urgent: 'badge-HIGH',
  };
  return map[val] || 'badge-default';
}

function sentimentColor(sentiment) {
  const map = {
    calm: '#22c55e', satisfied: '#22c55e', neutral: '#9ba3b5',
    confused: '#06b6d4', frustrated: '#f59e0b',
    angry: '#f97316', very_angry: '#ef4444', urgent: '#a855f7'
  };
  return map[sentiment] || '#9ba3b5';
}

// ── Navbar User Menu ─────────────────────────────────────────
function renderNavbarUser() {
  const user = Auth.getUser();
  const el = document.getElementById('navbar-user');
  if (!el) return;
  if (user) {
    el.innerHTML = `
      <span class="text-sm text-secondary">${escapeHtml(user.name)}</span>
      <button class="btn btn-ghost btn-sm" onclick="Auth.logout()" id="logout-btn">Logout</button>
    `;
  } else {
    el.innerHTML = `<a href="/login.html" class="btn btn-primary btn-sm">Login</a>`;
  }
}

// ── Sidebar Active Link ──────────────────────────────────────
function highlightSidebarActive() {
  const path = window.location.pathname.split('/').pop();
  $$('.sidebar-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href === path || href.endsWith('/' + path)) {
      link.classList.add('active');
    }
  });
}

// ── Skeleton helpers ─────────────────────────────────────────
function skeletonRows(n, cols) {
  return Array.from({ length: n }, () =>
    `<tr>${Array.from({ length: cols }, () =>
      `<td><div class="skeleton" style="height:14px;width:${60+Math.random()*30}%"></div></td>`
    ).join('')}</tr>`
  ).join('');
}

// ── Modal helpers ────────────────────────────────────────────
function openModal(id)  { const m = document.getElementById(id); if(m) m.style.display = 'flex'; }
function closeModal(id) { const m = document.getElementById(id); if(m) m.style.display = 'none'; }

// ── Sidebar toggle (mobile) ──────────────────────────────────
function toggleSidebar() {
  const sidebar = $('.sidebar');
  if (sidebar) sidebar.classList.toggle('open');
}

// ── Chart.js default colors ───────────────────────────────────
const CHART_COLORS = [
  '#3d7fff', '#22c55e', '#f59e0b', '#ef4444',
  '#06b6d4', '#a855f7', '#f97316', '#10b981'
];

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: '#9ba3b5', font: { family: 'Inter', size: 12 }, padding: 16 }
    },
    tooltip: {
      backgroundColor: '#1e2128', borderColor: '#363a45', borderWidth: 1,
      titleColor: '#e8eaf0', bodyColor: '#9ba3b5',
      padding: 12, cornerRadius: 8
    }
  },
  scales: {
    x: { ticks: { color: '#5e6478', font: { size: 11 } }, grid: { color: '#2a2d35' } },
    y: { ticks: { color: '#5e6478', font: { size: 11 } }, grid: { color: '#2a2d35' } }
  }
};

// ── Init on DOM ready ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderNavbarUser();
  highlightSidebarActive();
});
