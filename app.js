// ===== LOADING SCREEN =====
(function() {
  const savedLogo = localStorage.getItem('ct_logo');
  if (savedLogo) {
    const li = document.getElementById('loaderLogoImg');
    const ld = document.getElementById('loaderLogoDefault');
    if (li && ld) { li.src = savedLogo; li.style.display = 'block'; ld.style.display = 'none'; }
  }
  setTimeout(() => {
    const loader = document.getElementById('loadingScreen');
    loader.classList.add('fade-out');
    setTimeout(() => {
      loader.style.display = 'none';
      if (sessionStorage.getItem('ct_loggedin') === '1') {
        showApp();
      } else {
        document.getElementById('loginScreen').classList.remove('hidden');
        syncLoginLogo();
      }
    }, 520);
  }, 2200);
})();

function syncLoginLogo() {
  const saved = localStorage.getItem('ct_logo');
  if (!saved) return;
  const img = document.getElementById('loginLogoImg');
  const def = document.getElementById('loginLogoDefault');
  if (img && def) { img.src = saved; img.style.display = 'block'; def.style.display = 'none'; }
}

function showApp() {
  document.getElementById('loginScreen').classList.add('hidden');
  const shell = document.getElementById('appShell');
  shell.style.display = 'flex';
  shell.style.opacity = '0';
  shell.style.transition = 'opacity 0.35s ease';
  setTimeout(() => { shell.style.opacity = '1'; }, 30);
}

function getCredentials() {
  return {
    username: localStorage.getItem('ct_username') || 'admin',
    password: localStorage.getItem('ct_password') || 'admin123'
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('loginBtn');
  if (!loginBtn) return;
  const loginErr = document.getElementById('loginError');
  const pwInput = document.getElementById('loginPassword');
  const pwToggle = document.getElementById('loginPwToggle');

  pwToggle && pwToggle.addEventListener('click', () => {
    const isText = pwInput.type === 'text';
    pwInput.type = isText ? 'password' : 'text';
    pwToggle.textContent = isText ? '👁' : '🙈';
  });

  [document.getElementById('loginUsername'), pwInput].forEach(el => {
    el && el.addEventListener('keypress', e => { if (e.key === 'Enter') doLogin(); });
  });

  loginBtn.addEventListener('click', doLogin);

  function doLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const creds = getCredentials();
    loginBtn.textContent = 'Signing in…';
    loginBtn.classList.add('loading');
    loginErr.classList.add('hidden');
    setTimeout(() => {
      if (username === creds.username && password === creds.password) {
        sessionStorage.setItem('ct_loggedin', '1');
        showApp();
        setTimeout(() => { if (typeof initAppAfterLogin === 'function') initAppAfterLogin(); }, 400);
      } else {
        loginBtn.textContent = 'Sign In';
        loginBtn.classList.remove('loading');
        loginErr.classList.remove('hidden');
        pwInput.value = '';
        pwInput.focus();
      }
    }, 700);
  }
});


// ===== STATE =====
const DB = {
  get classes() { return JSON.parse(localStorage.getItem('ct_classes') || '[]'); },
  set classes(v) { localStorage.setItem('ct_classes', JSON.stringify(v)); },
  get students() { return JSON.parse(localStorage.getItem('ct_students') || '[]'); },
  set students(v) { localStorage.setItem('ct_students', JSON.stringify(v)); },
  get records() { return JSON.parse(localStorage.getItem('ct_records') || '[]'); },
  set records(v) { localStorage.setItem('ct_records', JSON.stringify(v)); }
};

// Seed demo data if empty
function seedData() {
  // No default seed — user starts fresh and adds their own classes/students
}

// ===== NAVIGATION =====
let currentPage = 'dashboard';

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  document.getElementById('pageTitle').textContent = {
    dashboard: 'Dashboard',
    'take-attendance': 'Take Attendance',
    students: 'Students',
    reports: 'Reports',
    'qr-checkin': 'QR Check-in'
  }[page];
  currentPage = page;
  closeSidebar();
  pageInit[page] && pageInit[page]();
}

function openSidebar() { document.getElementById('sidebar').classList.add('open'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); }

// ===== HELPERS =====
function today() { return new Date().toISOString().split('T')[0]; }
function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
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

function showToast(msg, type = 'normal') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast';
  if (type === 'error') t.style.background = '#b83232';
  else t.style.background = '#1a1916';
  t.style.opacity = '1';
  t.style.display = 'block';
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.classList.add('hidden'), 300); }, 2800);
}

function populateClassSelects() {
  const classes = DB.classes;
  const opts = classes.map(c => `<option value="${c}">${c}</option>`).join('');
  const allOpts = '<option value="all">All Classes</option>' + opts;
  // These are still selects
  ['attendanceClassSelect','filterClass','reportClass','qrClass'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === 'filterClass' || id === 'reportClass') el.innerHTML = allOpts;
    else el.innerHTML = opts;
  });
  const globalSel = document.getElementById('globalClassSelect');
  if (globalSel) globalSel.innerHTML = allOpts;
  // studentClass is now a text input — no need to populate
}

// ===== CLASS AUTOCOMPLETE for student modal =====
function initClassAutocomplete() {
  const input = document.getElementById('studentClass');
  const list = document.getElementById('classAutocomplete');
  if (!input || !list) return;

  input.addEventListener('input', () => {
    const val = input.value.trim().toLowerCase();
    const classes = DB.classes;
    const matches = val ? classes.filter(c => c.toLowerCase().includes(val)) : classes;
    if (!matches.length) { list.classList.add('hidden'); return; }
    list.innerHTML = matches.map(c => `<div class="autocomplete-item" data-val="${c}">${c}</div>`).join('');
    list.classList.remove('hidden');
  });

  input.addEventListener('focus', () => {
    const classes = DB.classes;
    if (!classes.length) return;
    list.innerHTML = classes.map(c => `<div class="autocomplete-item" data-val="${c}">${c}</div>`).join('');
    list.classList.remove('hidden');
  });

  list.addEventListener('mousedown', e => {
    const item = e.target.closest('.autocomplete-item');
    if (!item) return;
    input.value = item.dataset.val;
    list.classList.add('hidden');
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !list.contains(e.target)) list.classList.add('hidden');
  });
}

// ===== EXPORT CSV =====
function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ===== DASHBOARD =====
let trendChartInstance = null;

function initDashboard() {
  const students = DB.students;
  const records = DB.records;
  const todayStr = today();

  // Stats
  const todayRecs = records.filter(r => r.date === todayStr);
  const presentToday = todayRecs.filter(r => r.status === 'present').length;
  const absentToday = todayRecs.filter(r => r.status === 'absent').length;
  const lateToday = todayRecs.filter(r => r.status === 'late').length;
  const totalStudents = students.length;

  // Calculate overall attendance %
  const last30 = records.filter(r => r.date >= new Date(Date.now() - 30*86400000).toISOString().split('T')[0]);
  const overall = last30.length ? Math.round(last30.filter(r => r.status !== 'absent').length / last30.length * 100) : 0;

  document.getElementById('dashboardStats').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total Students</div>
      <div class="stat-value">${totalStudents}</div>
      <div class="stat-sub">${DB.classes.length} classes</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Present Today</div>
      <div class="stat-value green">${presentToday}</div>
      <div class="stat-sub">out of ${todayRecs.length} marked</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Absent Today</div>
      <div class="stat-value red">${absentToday}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Late Today</div>
      <div class="stat-value amber">${lateToday}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">30-Day Rate</div>
      <div class="stat-value" style="color:${pctColor(overall)}">${overall}%</div>
    </div>
  `;

  // Today's list
  const todayDiv = document.getElementById('todayList');
  if (todayRecs.length === 0) {
    todayDiv.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div>No attendance recorded today yet.</div>`;
  } else {
    const grouped = {};
    todayRecs.forEach(r => {
      const s = students.find(st => st.id === r.studentId);
      if (!s) return;
      if (!grouped[r.class]) grouped[r.class] = [];
      grouped[r.class].push({ ...r, name: s.name });
    });
    todayDiv.innerHTML = Object.entries(grouped).map(([cl, recs]) => `
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin:10px 0 6px">${cl}</div>
      ${recs.slice(0,5).map(r => `
        <div class="today-item">
          <div class="student-avatar" style="width:28px;height:28px;font-size:10px">${initials(r.name)}</div>
          <div class="today-item-name">${r.name}</div>
          <span class="tag ${r.status==='present'?'tag-green':r.status==='absent'?'tag-red':'tag-warn'}">${r.status}</span>
        </div>
      `).join('')}
      ${recs.length > 5 ? `<div class="muted-text" style="padding:6px 0">+${recs.length-5} more</div>` : ''}
    `).join('');
  }

  // Trend chart
  const last7Dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (d.getDay() !== 0 && d.getDay() !== 6) last7Dates.push(d.toISOString().split('T')[0]);
  }
  const presentData = last7Dates.map(d => records.filter(r => r.date === d && r.status === 'present').length);
  const absentData = last7Dates.map(d => records.filter(r => r.date === d && r.status === 'absent').length);
  const labels = last7Dates.map(d => formatDate(d).replace(/,.*/, ''));

  const ctx = document.getElementById('trendChart');
  if (trendChartInstance) trendChartInstance.destroy();
  trendChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Present', data: presentData, backgroundColor: '#c8eedd', borderColor: '#1d7a52', borderWidth: 1.5, borderRadius: 4 },
        { label: 'Absent', data: absentData, backgroundColor: '#f5d0d0', borderColor: '#b83232', borderWidth: 1.5, borderRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { font: { family: 'DM Sans', size: 11 }, boxWidth: 12 } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 11 } } },
        y: { grid: { color: '#f0efe9' }, ticks: { font: { family: 'DM Mono', size: 11 }, stepSize: 1 } }
      }
    }
  });

  // At-risk
  const atRisk = students.map(s => ({ ...s, pct: getAttendancePct(s.id) }))
    .filter(s => s.pct !== null && s.pct < 75)
    .sort((a, b) => a.pct - b.pct);

  const arDiv = document.getElementById('atRiskList');
  if (!atRisk.length) {
    arDiv.innerHTML = `<div class="empty-state" style="padding:20px"><span style="color:#1d7a52">✓ No at-risk students — great attendance!</span></div>`;
  } else {
    arDiv.innerHTML = atRisk.map(s => `
      <div class="risk-item">
        <div class="student-avatar" style="background:#fbeaea;color:#b83232;width:30px;height:30px;font-size:10px">${initials(s.name)}</div>
        <div class="risk-name">${s.name}</div>
        <span style="font-size:12px;color:var(--text3)">${s.class}</span>
        <span class="risk-pct">${s.pct}%</span>
      </div>
    `).join('');
  }
}

// ===== TAKE ATTENDANCE =====
let currentRosterStudents = [];

function initTakeAttendance() {
  populateClassSelects();
  document.getElementById('attendanceDate').value = today();
}

function loadAttendanceSheet() {
  const cl = document.getElementById('attendanceClassSelect').value;
  const date = document.getElementById('attendanceDate').value;
  if (!cl || !date) { showToast('Please select a class and date', 'error'); return; }

  const classStudents = DB.students.filter(s => s.class === cl);
  if (!classStudents.length) { showToast('No students in this class', 'error'); return; }
  currentRosterStudents = classStudents;

  // Load existing records for this date/class
  const existing = DB.records.filter(r => r.date === date && r.class === cl);

  const sheet = document.getElementById('attendanceSheet');
  sheet.classList.remove('hidden');

  const roster = document.getElementById('studentRoster');
  roster.innerHTML = classStudents.map(s => {
    const rec = existing.find(r => r.studentId === s.id);
    const status = rec ? rec.status : '';
    const remarks = rec ? rec.remarks : '';
    return `
    <div class="student-row status-${status}" id="row-${s.id}" data-id="${s.id}">
      <div class="student-avatar">${initials(s.name)}</div>
      <div class="student-info">
        <div class="student-name">${s.name}</div>
        <div class="student-id">${s.id}</div>
      </div>
      <div class="status-btns">
        <button class="status-btn ${status==='present'?'active-present':''}" onclick="setStatus('${s.id}','present')">Present</button>
        <button class="status-btn ${status==='absent'?'active-absent':''}" onclick="setStatus('${s.id}','absent')">Absent</button>
        <button class="status-btn ${status==='late'?'active-late':''}" onclick="setStatus('${s.id}','late')">Late</button>
      </div>
      <input type="text" class="remarks-input" id="remarks-${s.id}" placeholder="Remarks..." value="${remarks}">
    </div>`;
  }).join('');

  updateLiveCounts();
}

function setStatus(studentId, status) {
  const row = document.getElementById('row-' + studentId);
  row.className = `student-row status-${status}`;
  row.querySelectorAll('.status-btn').forEach(b => {
    b.className = 'status-btn';
    if (b.textContent.toLowerCase() === status) b.classList.add(`active-${status}`);
  });
  updateLiveCounts();
}

function markAll(status) {
  currentRosterStudents.forEach(s => setStatus(s.id, status));
}

function updateLiveCounts() {
  let p = 0, a = 0, l = 0;
  currentRosterStudents.forEach(s => {
    const row = document.getElementById('row-' + s.id);
    if (!row) return;
    if (row.classList.contains('status-present')) p++;
    else if (row.classList.contains('status-absent')) a++;
    else if (row.classList.contains('status-late')) l++;
  });
  document.getElementById('livePresentCount').textContent = `Present: ${p}`;
  document.getElementById('liveAbsentCount').textContent = `Absent: ${a}`;
  document.getElementById('liveLateCount').textContent = `Late: ${l}`;
}

function saveAttendance() {
  const cl = document.getElementById('attendanceClassSelect').value;
  const date = document.getElementById('attendanceDate').value;
  const subject = document.getElementById('attendanceSubject').value;

  const newRecords = DB.records.filter(r => !(r.date === date && r.class === cl));

  currentRosterStudents.forEach(s => {
    const row = document.getElementById('row-' + s.id);
    let status = 'absent';
    if (row.classList.contains('status-present')) status = 'present';
    else if (row.classList.contains('status-late')) status = 'late';
    const remarks = document.getElementById('remarks-' + s.id).value;
    newRecords.push({ studentId: s.id, date, class: cl, status, subject, remarks });
  });

  DB.records = newRecords;
  showToast(`Attendance saved for ${formatDate(date)} — ${cl}`);
}

// ===== STUDENTS =====
let editingStudentId = null;

function initStudents() {
  populateClassSelects();
  renderStudentsTable();
}

function renderStudentsTable(filter = '') {
  const students = DB.students;
  const classFilter = document.getElementById('filterClass').value;
  const search = filter.toLowerCase();

  let filtered = students.filter(s =>
    (!search || s.name.toLowerCase().includes(search) || s.id.toLowerCase().includes(search)) &&
    (classFilter === 'all' || s.class === classFilter)
  );

  const tbody = document.getElementById('studentsTableBody');
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">👥</div>No students found.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => {
    const pct = getAttendancePct(s.id);
    const pctStr = pct === null ? '—' : pct + '%';
    const color = pct === null ? '#8f8c83' : pctColor(pct);
    return `
    <tr>
      <td><span style="font-family:var(--mono);font-size:12px">${s.id}</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="student-avatar" style="width:28px;height:28px;font-size:10px">${initials(s.name)}</div>
          ${s.name}
        </div>
      </td>
      <td><span class="tag tag-blue">${s.class}</span></td>
      <td style="color:var(--text3)">${s.email || '—'}</td>
      <td>
        <div class="pct-bar-cell">
          <div class="pct-bar"><div class="pct-fill" style="width:${pct||0}%;background:${color}"></div></div>
          <span class="pct-label" style="color:${color}">${pctStr}</span>
        </div>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" onclick="editStudent('${s.id}')">✎ Edit</button>
          <button class="btn-icon danger" onclick="deleteStudent('${s.id}')">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function openAddStudentModal() {
  editingStudentId = null;
  document.getElementById('modalTitle').textContent = 'Add Student';
  document.getElementById('studentName').value = '';
  document.getElementById('studentId').value = '';
  document.getElementById('studentEmail').value = '';
  document.getElementById('studentPhone').value = '';
  document.getElementById('studentClass').value = '';
  document.getElementById('classAutocomplete').classList.add('hidden');
  document.getElementById('studentModalBackdrop').classList.remove('hidden');
}

function editStudent(id) {
  editingStudentId = id;
  const s = DB.students.find(s => s.id === id);
  if (!s) return;
  document.getElementById('modalTitle').textContent = 'Edit Student';
  document.getElementById('studentName').value = s.name;
  document.getElementById('studentId').value = s.id;
  document.getElementById('studentEmail').value = s.email || '';
  document.getElementById('studentPhone').value = s.phone || '';
  document.getElementById('studentClass').value = s.class;
  document.getElementById('classAutocomplete').classList.add('hidden');
  document.getElementById('studentModalBackdrop').classList.remove('hidden');
}

function saveStudent() {
  const name = document.getElementById('studentName').value.trim();
  const sid = document.getElementById('studentId').value.trim();
  const cl = document.getElementById('studentClass').value.trim();
  const email = document.getElementById('studentEmail').value.trim();
  const phone = document.getElementById('studentPhone').value.trim();

  if (!name || !sid || !cl) { showToast('Name, ID and Class are required', 'error'); return; }

  // Auto-add class to the known classes list if new
  const classes = DB.classes;
  if (!classes.includes(cl)) {
    classes.push(cl);
    DB.classes = classes;
    populateClassSelects();
  }

  const students = DB.students;
  if (!editingStudentId) {
    if (students.find(s => s.id === sid)) { showToast('Student ID already exists', 'error'); return; }
    students.push({ id: sid, name, class: cl, email, phone });
    showToast('Student added successfully');
  } else {
    const idx = students.findIndex(s => s.id === editingStudentId);
    students[idx] = { id: sid, name, class: cl, email, phone };
    showToast('Student updated');
  }
  DB.students = students;
  document.getElementById('studentModalBackdrop').classList.add('hidden');
  renderStudentsTable();
}

function deleteStudent(id) {
  if (!confirm('Delete this student? Their attendance records will also be removed.')) return;
  DB.students = DB.students.filter(s => s.id !== id);
  DB.records = DB.records.filter(r => r.studentId !== id);
  showToast('Student deleted');
  renderStudentsTable();
}

function openClassesModal() {
  renderClassList();
  document.getElementById('classModalBackdrop').classList.remove('hidden');
}

function renderClassList() {
  const classes = DB.classes;
  document.getElementById('classList').innerHTML = `
    <div class="class-tag-list">
      ${classes.map(c => `
        <span class="class-chip">
          ${c}
          <button class="class-chip-del" onclick="deleteClass('${c.replace(/'/g,"\\'")}')">✕</button>
        </span>
      `).join('')}
    </div>`;
}

function addNewClass() {
  const val = document.getElementById('newClassName').value.trim();
  if (!val) return;
  const classes = DB.classes;
  if (classes.includes(val)) { showToast('Class already exists', 'error'); return; }
  classes.push(val);
  DB.classes = classes;
  document.getElementById('newClassName').value = '';
  renderClassList();
  populateClassSelects();
  showToast(`Class "${val}" added`);
}

function deleteClass(name) {
  const students = DB.students.filter(s => s.class === name);
  if (students.length > 0 && !confirm(`Delete class "${name}"? It has ${students.length} students.`)) return;
  DB.classes = DB.classes.filter(c => c !== name);
  renderClassList();
  populateClassSelects();
  showToast(`Class deleted`);
}

function exportStudents() {
  const students = DB.students;
  const rows = [['Student ID','Name','Class','Email','Phone','Attendance %']];
  students.forEach(s => {
    const pct = getAttendancePct(s.id);
    rows.push([s.id, s.name, s.class, s.email, s.phone, pct !== null ? pct + '%' : 'N/A']);
  });
  downloadCSV(rows, 'students.csv');
  showToast('Students exported');
}

// ===== REPORTS =====
function initReports() {
  populateClassSelects();
  const to = new Date();
  const from = new Date(); from.setDate(from.getDate() - 30);
  document.getElementById('reportFrom').value = from.toISOString().split('T')[0];
  document.getElementById('reportTo').value = to.toISOString().split('T')[0];
}

function generateReport() {
  const cl = document.getElementById('reportClass').value;
  const from = document.getElementById('reportFrom').value;
  const to = document.getElementById('reportTo').value;
  if (!from || !to) { showToast('Select a date range', 'error'); return; }

  let records = DB.records.filter(r => r.date >= from && r.date <= to);
  let students = DB.students;
  if (cl !== 'all') {
    records = records.filter(r => r.class === cl);
    students = students.filter(s => s.class === cl);
  }

  const totalSessions = [...new Set(records.map(r => r.date + r.class))].length;
  const totalPresent = records.filter(r => r.status === 'present').length;
  const totalAbsent = records.filter(r => r.status === 'absent').length;
  const totalLate = records.filter(r => r.status === 'late').length;
  const totalRecs = records.length;
  const rate = totalRecs ? Math.round((totalPresent + totalLate) / totalRecs * 100) : 0;

  const studentStats = students.map(s => {
    const recs = records.filter(r => r.studentId === s.id);
    const present = recs.filter(r => r.status === 'present').length;
    const absent = recs.filter(r => r.status === 'absent').length;
    const late = recs.filter(r => r.status === 'late').length;
    const pct = recs.length ? Math.round((present + late) / recs.length * 100) : null;
    return { ...s, present, absent, late, total: recs.length, pct };
  }).sort((a, b) => (a.pct ?? 999) - (b.pct ?? 999));

  document.getElementById('reportContent').innerHTML = `
    <div class="report-summary">
      <div class="stat-card"><div class="stat-label">Total Sessions</div><div class="stat-value">${totalSessions}</div></div>
      <div class="stat-card"><div class="stat-label">Attendance Rate</div><div class="stat-value" style="color:${pctColor(rate)}">${rate}%</div></div>
      <div class="stat-card"><div class="stat-label">Present</div><div class="stat-value green">${totalPresent}</div></div>
      <div class="stat-card"><div class="stat-label">Absent</div><div class="stat-value red">${totalAbsent}</div></div>
      <div class="stat-card"><div class="stat-label">Late</div><div class="stat-value amber">${totalLate}</div></div>
    </div>
    <div class="report-table-wrapper">
      <div class="report-title">Per-Student Summary — ${cl === 'all' ? 'All Classes' : cl} — ${formatDate(from)} to ${formatDate(to)}</div>
      <div class="table-wrapper" style="border-radius:0;border:none">
        <table class="data-table">
          <thead><tr>
            <th>Student ID</th><th>Name</th><th>Class</th>
            <th>Present</th><th>Absent</th><th>Late</th><th>Total</th><th>Rate</th>
          </tr></thead>
          <tbody>
            ${studentStats.map(s => `
            <tr>
              <td><span style="font-family:var(--mono);font-size:12px">${s.id}</span></td>
              <td>${s.name}</td>
              <td><span class="tag tag-blue">${s.class}</span></td>
              <td><span class="tag tag-green">${s.present}</span></td>
              <td><span class="tag tag-red">${s.absent}</span></td>
              <td><span class="tag tag-warn">${s.late}</span></td>
              <td>${s.total}</td>
              <td>
                <div class="pct-bar-cell">
                  <div class="pct-bar"><div class="pct-fill" style="width:${s.pct??0}%;background:${pctColor(s.pct??0)}"></div></div>
                  <span class="pct-label" style="color:${pctColor(s.pct??0)}">${s.pct !== null ? s.pct+'%' : '—'}</span>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function exportReport() {
  const cl = document.getElementById('reportClass').value;
  const from = document.getElementById('reportFrom').value;
  const to = document.getElementById('reportTo').value;
  if (!from || !to) { showToast('Generate a report first', 'error'); return; }

  let records = DB.records.filter(r => r.date >= from && r.date <= to);
  let students = DB.students;
  if (cl !== 'all') {
    records = records.filter(r => r.class === cl);
    students = students.filter(s => s.class === cl);
  }

  const rows = [['Student ID','Name','Class','Date','Status','Subject','Remarks']];
  records.forEach(r => {
    const s = students.find(st => st.id === r.studentId);
    if (!s) return;
    rows.push([r.studentId, s.name, r.class, r.date, r.status, r.subject||'', r.remarks||'']);
  });
  downloadCSV(rows, `attendance-report-${from}-to-${to}.csv`);
  showToast('Report exported');
}

// ===== QR CHECK-IN =====
let qrSession = null;
let qrTimer = null;

function initQR() {
  populateClassSelects();
  document.getElementById('qrDate').value = today();
}

function generateQR() {
  const cl = document.getElementById('qrClass').value;
  const date = document.getElementById('qrDate').value;
  const subject = document.getElementById('qrSubject').value;
  const expiry = parseInt(document.getElementById('qrExpiry').value);
  if (!cl || !date) { showToast('Select class and date', 'error'); return; }

  const sessionId = Math.random().toString(36).substr(2, 9).toUpperCase();
  const expiresAt = Date.now() + expiry * 60000;
  qrSession = { cl, date, subject, sessionId, expiresAt, checkedIn: [] };

  if (qrTimer) clearInterval(qrTimer);

  const container = document.getElementById('qrCodeContainer');
  container.innerHTML = '<canvas id="qrCanvas"></canvas>';

  const qrData = JSON.stringify({ session: sessionId, class: cl, date, subject });
  QRCode.toCanvas(document.getElementById('qrCanvas'), qrData, { width: 200, margin: 2 }, err => {
    if (err) { showToast('QR generation failed', 'error'); return; }
  });

  document.getElementById('qrInfo').classList.remove('hidden');
  document.getElementById('qrSessionInfo').textContent = `Class: ${cl} | ${formatDate(date)}${subject ? ' | ' + subject : ''}`;
  document.getElementById('qrCheckInForm').classList.remove('hidden');
  document.getElementById('qrCheckedCount').textContent = '0';

  function tick() {
    const rem = Math.max(0, Math.round((qrSession.expiresAt - Date.now()) / 1000));
    const min = Math.floor(rem / 60);
    const sec = String(rem % 60).padStart(2, '0');
    document.getElementById('qrExpireInfo').textContent = rem > 0 ? `Expires in ${min}:${sec}` : 'Session expired';
    if (rem === 0) { clearInterval(qrTimer); container.innerHTML = '<div class="qr-placeholder"><span>Session expired. Generate a new QR code.</span></div>'; }
  }
  tick();
  qrTimer = setInterval(tick, 1000);
  showToast('QR code generated');
}

function qrCheckIn() {
  if (!qrSession) { showToast('No active session', 'error'); return; }
  if (Date.now() > qrSession.expiresAt) { showToast('Session expired', 'error'); return; }

  const sid = document.getElementById('qrStudentInput').value.trim();
  if (!sid) return;

  const student = DB.students.find(s => s.id === sid && s.class === qrSession.cl);
  if (!student) {
    document.getElementById('qrCheckinResult').innerHTML = `<div class="tag tag-red" style="margin-top:8px">Student ID not found in this class.</div>`;
    return;
  }
  if (qrSession.checkedIn.includes(sid)) {
    document.getElementById('qrCheckinResult').innerHTML = `<div class="tag tag-warn" style="margin-top:8px">Already checked in.</div>`;
    return;
  }

  qrSession.checkedIn.push(sid);

  // Save to records
  const records = DB.records.filter(r => !(r.studentId === sid && r.date === qrSession.date && r.class === qrSession.cl));
  records.push({ studentId: sid, date: qrSession.date, class: qrSession.cl, status: 'present', subject: qrSession.subject, remarks: 'QR check-in' });
  DB.records = records;

  document.getElementById('qrCheckedCount').textContent = qrSession.checkedIn.length;
  document.getElementById('qrCheckinResult').innerHTML = `<div class="tag tag-green" style="margin-top:8px">✓ ${student.name} checked in!</div>`;
  document.getElementById('qrStudentInput').value = '';

  const listEl = document.getElementById('qrCheckedInList');
  listEl.innerHTML += `<div class="today-item"><div class="student-avatar" style="width:26px;height:26px;font-size:10px">${initials(student.name)}</div><span>${student.name}</span><span class="tag tag-green" style="font-size:11px">✓ present</span></div>`;
}

// ===== PAGE INIT MAP =====
const pageInit = {
  dashboard: initDashboard,
  'take-attendance': initTakeAttendance,
  students: initStudents,
  reports: initReports,
  'qr-checkin': initQR
};

// ===== LOGO =====
function initLogo() {
  const saved = localStorage.getItem('ct_logo');
  if (saved) applyLogo(saved);

  document.getElementById('logoUpload').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      localStorage.setItem('ct_logo', ev.target.result);
      applyLogo(ev.target.result);
      showToast('Logo updated!');
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('logoLink').addEventListener('click', e => {
    e.preventDefault();
    navigateTo('dashboard');
  });
}

function applyLogo(src) {
  const img = document.getElementById('logoImg');
  const def = document.getElementById('logoDefault');
  img.src = src;
  img.style.display = 'block';
  def.style.display = 'none';
}

// ===== EVENT LISTENERS =====
function initAppAfterLogin() {
  seedData();
  populateClassSelects();
  initLogo();
  initClassAutocomplete();

  // Date display
  document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-PH', { weekday:'short', month:'short', day:'numeric', year:'numeric' });

  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => { e.preventDefault(); navigateTo(item.dataset.page); });
  });

  document.getElementById('menuBtn').addEventListener('click', openSidebar);
  document.getElementById('sidebarClose').addEventListener('click', closeSidebar);

  // Attendance
  document.getElementById('loadAttendanceBtn').addEventListener('click', loadAttendanceSheet);
  document.getElementById('saveAttendanceBtn').addEventListener('click', saveAttendance);

  // Students
  document.getElementById('addStudentBtn').addEventListener('click', openAddStudentModal);
  document.getElementById('saveStudentBtn').addEventListener('click', saveStudent);
  document.getElementById('cancelStudentBtn').addEventListener('click', () => document.getElementById('studentModalBackdrop').classList.add('hidden'));
  document.getElementById('modalCloseBtn').addEventListener('click', () => document.getElementById('studentModalBackdrop').classList.add('hidden'));
  document.getElementById('manageClassesBtn').addEventListener('click', openClassesModal);
  document.getElementById('classModalClose').addEventListener('click', () => document.getElementById('classModalBackdrop').classList.add('hidden'));
  document.getElementById('addClassBtn').addEventListener('click', addNewClass);
  document.getElementById('newClassName').addEventListener('keypress', e => { if (e.key === 'Enter') addNewClass(); });
  document.getElementById('exportStudentsBtn').addEventListener('click', exportStudents);
  document.getElementById('studentSearch').addEventListener('input', e => renderStudentsTable(e.target.value));
  document.getElementById('filterClass').addEventListener('change', () => renderStudentsTable(document.getElementById('studentSearch').value));

  // Reports
  document.getElementById('generateReportBtn').addEventListener('click', generateReport);
  document.getElementById('exportReportBtn').addEventListener('click', exportReport);

  // QR
  document.getElementById('generateQrBtn').addEventListener('click', generateQR);
  document.getElementById('qrCheckinBtn').addEventListener('click', qrCheckIn);
  document.getElementById('qrStudentInput').addEventListener('keypress', e => { if (e.key === 'Enter') qrCheckIn(); });

  // Backdrop clicks
  document.getElementById('studentModalBackdrop').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden'); });
  document.getElementById('classModalBackdrop').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden'); });

  // Init dashboard
  initDashboard();

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('ct_loggedin');
      const shell = document.getElementById('appShell');
      shell.style.opacity = '0';
      setTimeout(() => {
        shell.style.display = 'none';
        const loginScreen = document.getElementById('loginScreen');
        loginScreen.classList.remove('hidden');
        syncLoginLogo();
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginError').classList.add('hidden');
        document.getElementById('loginBtn').textContent = 'Sign In';
      }, 350);
    });
  }
}
