/* shared-nav.js — injects sidebar + topbar into every app page */

function buildShell(activePage) {
  // Auth guard
  if (sessionStorage.getItem('ct_loggedin') !== '1') {
    window.location.href = 'login.html';
    return false;
  }

  const pages = [
    { id: 'dashboard',       label: 'Dashboard',      icon: '⊟', href: 'dashboard.html' },
    { id: 'take-attendance', label: 'Take Attendance', icon: '✓', href: 'attendance.html' },
    { id: 'students',        label: 'Students',        icon: '◉', href: 'students.html' },
    { id: 'reports',         label: 'Reports',         icon: '◈', href: 'reports.html' },
    { id: 'qr-checkin',      label: 'QR Check-in',     icon: '▣', href: 'qr.html' },
  ];

  const navItems = pages.map(p => `
    <a href="${p.href}" class="nav-item${activePage === p.id ? ' active' : ''}">
      <span class="nav-icon">${p.icon}</span> ${p.label}
    </a>
  `).join('');

  const classes = JSON.parse(localStorage.getItem('ct_classes') || '[]');
  const classOpts = '<option value="all">All Classes</option>' +
    classes.map(c => `<option value="${c}">${c}</option>`).join('');

  const savedLogo = localStorage.getItem('ct_logo');
  const logoImgStyle = savedLogo ? 'display:block' : 'display:none';
  const logoDefStyle = savedLogo ? 'display:none' : '';
  const logoSrc = savedLogo || '';

  const pageTitles = {
    'dashboard': 'Dashboard', 'take-attendance': 'Take Attendance',
    'students': 'Students', 'reports': 'Reports', 'qr-checkin': 'QR Check-in'
  };

  document.body.insertAdjacentHTML('afterbegin', `
    <div class="app-shell" id="appShell">
      <!-- Sidebar -->
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <a href="dashboard.html" class="logo" title="Go to Dashboard">
            <span class="logo-icon" id="logoIconWrap">
              <img id="logoImg" src="${logoSrc}" alt="Logo" style="${logoImgStyle};width:28px;height:28px;object-fit:contain;border-radius:4px;">
              <span id="logoDefault" style="${logoDefStyle}">✦</span>
            </span>
            <span class="logo-text">AttendEase</span>
          </a>
          <div style="display:flex;align-items:center;gap:6px">
            <label class="logo-upload-btn" title="Change logo" for="logoUpload">🖼</label>
            <input type="file" id="logoUpload" accept="image/*" style="display:none">
            <button class="sidebar-close" id="sidebarClose">✕</button>
          </div>
        </div>
        <nav class="sidebar-nav">${navItems}</nav>
        <div class="sidebar-footer">
          <div class="class-selector">
            <label>Active Class</label>
            <select id="globalClassSelect">${classOpts}</select>
          </div>
          <button class="logout-btn" id="logoutBtn">⎋ Sign Out</button>
        </div>
      </aside>

      <!-- Main wrapper -->
      <div class="main-content">
        <header class="topbar">
          <button class="menu-btn" id="menuBtn">☰</button>
          <div class="topbar-title">${pageTitles[activePage] || 'AttendEase'}</div>
          <div class="topbar-right">
            <span class="today-badge" id="todayDate"></span>
          </div>
        </header>
        <main class="page-area" id="pageArea">
  `);

  // Close the wrapper after page content — add closing tags as footer script
  return true;
}

function initShell() {
  // Close open divs
  document.getElementById('pageArea').insertAdjacentHTML('afterend', '</div></div>');

  // Date
  const td = document.getElementById('todayDate');
  if (td) td.textContent = new Date().toLocaleDateString('en-PH', {
    weekday:'short', month:'short', day:'numeric', year:'numeric'
  });

  // Sidebar toggle
  document.getElementById('menuBtn')?.addEventListener('click', () =>
    document.getElementById('sidebar').classList.add('open'));
  document.getElementById('sidebarClose')?.addEventListener('click', () =>
    document.getElementById('sidebar').classList.remove('open'));

  // Logo upload
  document.getElementById('logoUpload')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      localStorage.setItem('ct_logo', ev.target.result);
      const img = document.getElementById('logoImg');
      const def = document.getElementById('logoDefault');
      img.src = ev.target.result;
      img.style.display = 'block';
      if (def) def.style.display = 'none';
      showToast('Logo updated!');
    };
    reader.readAsDataURL(file);
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    sessionStorage.removeItem('ct_loggedin');
    window.location.href = 'login.html';
  });
}

// ===== SHARED HELPERS =====
const DB = {
  get classes() { return JSON.parse(localStorage.getItem('ct_classes') || '[]'); },
  set classes(v) { localStorage.setItem('ct_classes', JSON.stringify(v)); },
  get students() { return JSON.parse(localStorage.getItem('ct_students') || '[]'); },
  set students(v) { localStorage.setItem('ct_students', JSON.stringify(v)); },
  get records() { return JSON.parse(localStorage.getItem('ct_records') || '[]'); },
  set records(v) { localStorage.setItem('ct_records', JSON.stringify(v)); }
};

function today() { return new Date().toISOString().split('T')[0]; }
function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' });
}
function initials(name) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
function getAttendancePct(studentId, classFilter) {
  const records = DB.records.filter(r => r.studentId === studentId && (!classFilter || r.class === classFilter));
  if (!records.length) return null;
  const present = records.filter(r => r.status === 'present' || r.status === 'late').length;
  return Math.round((present / records.length) * 100);
}
function pctColor(p) { return p >= 85 ? '#1d7a52' : p >= 75 ? '#8a5c10' : '#b83232'; }

function showToast(msg, type='normal') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.background = type === 'error' ? '#b83232' : '#1a1916';
  t.style.opacity = '1';
  t.style.display = 'block';
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => { t.style.display = 'none'; }, 300);
  }, 2800);
}

function populateClassSelects(ids) {
  const classes = DB.classes;
  ids.forEach(({ id, includeAll }) => {
    const el = document.getElementById(id);
    if (!el) return;
    const opts = classes.map(c => `<option value="${c}">${c}</option>`).join('');
    el.innerHTML = includeAll
      ? '<option value="all">All Classes</option>' + opts
      : opts;
  });
}

function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
