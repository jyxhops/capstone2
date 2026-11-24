const STORAGE_KEY = 'studyflow_data_v1';
const SESSION_KEY = 'studyflow_session_v1';

const DEFAULT_DATA = {
  users: [
    {
      name: 'Juan Dela Cruz',
      email: 'student@gnc.edu.ph',
      password: '123456'
    }
  ],
  tasks: [
    {
      id: 1700000001,
      title: 'Finalize Capstone Chapter 1 & IPO Framework',
      subject: 'Capstone Project 1',
      deadline: '2026-11-24',
      priority: 'High',
      status: 'Ongoing'
    },
    {
      id: 1700000002,
      title: 'Database Normalization Quiz Review',
      subject: 'Information Management',
      deadline: '2026-11-26',
      priority: 'Medium',
      status: 'Pending'
    },
    {
      id: 1700000003,
      title: 'Submit System Prototype Wireframes',
      subject: 'Human-Computer Interaction',
      deadline: '2026-11-20',
      priority: 'High',
      status: 'Completed'
    }
  ],
  schedules: [
    {
      id: 2700000001,
      day: 'Monday',
      time: '6:00 PM - 8:00 PM',
      subject: 'Capstone System Development'
    },
    {
      id: 2700000002,
      day: 'Wednesday',
      time: '4:00 PM - 6:00 PM',
      subject: 'Information Management'
    },
    {
      id: 2700000003,
      day: 'Saturday',
      time: '9:00 AM - 11:30 AM',
      subject: 'Research & Documentation'
    }
  ]
};

function getAppData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DATA));
    return structuredClone(DEFAULT_DATA);
  }
  return JSON.parse(raw);
}

function saveAppData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function showAuthMessage(text, type = 'error') {
  const box = document.getElementById('auth-message');
  box.textContent = text;
  box.className = `auth-message ${type}`;
}

function clearAuthMessage() {
  const box = document.getElementById('auth-message');
  box.textContent = '';
  box.className = 'auth-message hidden';
}

/* AUTHENTICATION */
function switchAuthTab(tab) {
  clearAuthMessage();
  const loginTab = document.getElementById('tab-login');
  const regTab = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');

  if (tab === 'login') {
    loginTab.classList.add('active');
    regTab.classList.remove('active');
    loginForm.classList.remove('hidden');
    regForm.classList.add('hidden');
  } else {
    regTab.classList.add('active');
    loginTab.classList.remove('active');
    regForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  }
}

document.getElementById('register-form').addEventListener('submit', function (e) {
  e.preventDefault();
  clearAuthMessage();

  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const password = document.getElementById('reg-password').value;

  if (!name || !email || !password) {
    showAuthMessage('Please fill in all registration fields.');
    return;
  }

  if (!email.endsWith('@gnc.edu.ph')) {
    showAuthMessage('Please use a valid @gnc.edu.ph student email address.');
    return;
  }

  const data = getAppData();
  const exists = data.users.some((u) => u.email.toLowerCase() === email);
  if (exists) {
    showAuthMessage('An account with this student email already exists.');
    return;
  }

  const newUser = { name, email, password };
  data.users.push(newUser);
  saveAppData(data);

  this.reset();
  switchAuthTab('login');
  document.getElementById('login-email').value = email;
  showAuthMessage('Account created successfully! Please sign in.', 'success');
});

document.getElementById('login-form').addEventListener('submit', function (e) {
  e.preventDefault();
  clearAuthMessage();

  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;

  const data = getAppData();
  const user = data.users.find(
    (u) => u.email.toLowerCase() === email && u.password === password
  );

  if (!user) {
    showAuthMessage('Invalid student email or password.');
    return;
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify({ name: user.name, email: user.email }));
  enterApp(user);
});

function enterApp(user) {
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('app-section').classList.remove('hidden');
  document.getElementById('user-display-name').textContent = user.name;
  document.getElementById('user-display-email').textContent = user.email;
  renderAll();
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  document.getElementById('app-section').classList.add('hidden');
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('login-form').reset();
  clearAuthMessage();
}

/* NAVIGATION */
function switchView(viewName) {
  document.querySelectorAll('.view-section').forEach((sec) => sec.classList.add('hidden'));
  document.getElementById(`view-${viewName}`).classList.remove('hidden');

  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  const titles = {
    dashboard: 'Dashboard Overview',
    tasks: 'Task Management',
    schedule: 'Study Schedule Planner'
  };
  document.getElementById('page-title').textContent = titles[viewName] || 'Dashboard';
}

/* DASHBOARD & RENDERING */
function renderDashboard() {
  const { tasks, schedules } = getAppData();
  const total = tasks.length;
  const pending = tasks.filter((t) => t.status === 'Pending').length;
  const ongoing = tasks.filter((t) => t.status === 'Ongoing').length;
  const completed = tasks.filter((t) => t.status === 'Completed').length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-ongoing').textContent = ongoing;
  document.getElementById('stat-completed').textContent = completed;

  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  document.getElementById('progress-percent').textContent = `${percent}%`;
  document.getElementById('progress-fill').style.width = `${percent}%`;

  // Deadline alerts & upcoming list
  const today = new Date().toISOString().split('T')[0];
  const activeTasks = tasks
    .filter((t) => t.status !== 'Completed')
    .sort((a, b) => a.deadline.localeCompare(b.deadline));

  const overdueOrDueToday = activeTasks.filter((t) => t.deadline <= today);
  const alertBanner = document.getElementById('deadline-alert');
  if (overdueOrDueToday.length > 0) {
    alertBanner.textContent = `⚠️ Alert: You have ${overdueOrDueToday.length} task(s) due today or overdue!`;
    alertBanner.classList.remove('hidden');
  } else {
    alertBanner.classList.add('hidden');
  }

  const upcomingList = document.getElementById('upcoming-deadlines-list');
  upcomingList.innerHTML = activeTasks.length
    ? activeTasks
        .slice(0, 5)
        .map(
          (t) => `
        <li>
          <span><strong>${t.title}</strong> (${t.subject})</span>
          <span>${t.deadline}</span>
        </li>`
        )
        .join('')
    : '<li><span>No pending deadlines.</span></li>';

  const schedList = document.getElementById('dashboard-schedule-list');
  schedList.innerHTML = schedules.length
    ? schedules
        .slice(0, 5)
        .map(
          (s) => `
        <li>
          <span><strong>${s.day}</strong> — ${s.subject}</span>
          <span>${s.time}</span>
        </li>`
        )
        .join('')
    : '<li><span>No study sessions scheduled.</span></li>';
}

/* TASK CRUD */
document.getElementById('task-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const data = getAppData();
  const idVal = document.getElementById('task-id').value;

  const taskObj = {
    id: idVal ? Number(idVal) : Date.now(),
    title: document.getElementById('task-title').value.trim(),
    subject: document.getElementById('task-subject').value.trim(),
    deadline: document.getElementById('task-deadline').value,
    priority: document.getElementById('task-priority').value,
    status: document.getElementById('task-status').value
  };

  if (idVal) {
    const idx = data.tasks.findIndex((t) => t.id === Number(idVal));
    if (idx !== -1) data.tasks[idx] = taskObj;
  } else {
    data.tasks.push(taskObj);
  }

  saveAppData(data);
  resetTaskForm();
  renderAll();
});

function renderTasks() {
  const { tasks } = getAppData();
  const statusFilter = document.getElementById('filter-status').value;
  const priorityFilter = document.getElementById('filter-priority').value;

  const filtered = tasks.filter((t) => {
    const matchStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'All' || t.priority === priorityFilter;
    return matchStatus && matchPriority;
  });

  const tbody = document.getElementById('task-table-body');
  tbody.innerHTML = filtered.length
    ? filtered
        .map(
          (t) => `
        <tr>
          <td>
            <strong>${t.title}</strong><br />
            <small style="color: var(--muted)">${t.subject}</small>
          </td>
          <td>${t.deadline}</td>
          <td><span class="pill pill-${t.priority}">${t.priority}</span></td>
          <td><span class="status-${t.status}">${t.status}</span></td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="editTask(${t.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteTask(${t.id})">Delete</button>
          </td>
        </tr>`
        )
        .join('')
    : '<tr><td colspan="5">No tasks match the selected filters.</td></tr>';
}

function editTask(id) {
  const { tasks } = getAppData();
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  document.getElementById('task-id').value = task.id;
  document.getElementById('task-title').value = task.title;
  document.getElementById('task-subject').value = task.subject;
  document.getElementById('task-deadline').value = task.deadline;
  document.getElementById('task-priority').value = task.priority;
  document.getElementById('task-status').value = task.status;

  document.getElementById('task-form-title').textContent = 'Edit Academic Task';
  document.getElementById('task-submit-btn').textContent = 'Update Task';
  document.getElementById('task-cancel-btn').classList.remove('hidden');
}

function resetTaskForm() {
  document.getElementById('task-form').reset();
  document.getElementById('task-id').value = '';
  document.getElementById('task-form-title').textContent = 'Add New Academic Task';
  document.getElementById('task-submit-btn').textContent = 'Save Task';
  document.getElementById('task-cancel-btn').classList.add('hidden');
}

function deleteTask(id) {
  const data = getAppData();
  data.tasks = data.tasks.filter((t) => t.id !== id);
  saveAppData(data);
  renderAll();
}

/* SCHEDULE PLANNER */
document.getElementById('schedule-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const data = getAppData();

  data.schedules.push({
    id: Date.now(),
    day: document.getElementById('sched-day').value,
    time: document.getElementById('sched-time').value.trim(),
    subject: document.getElementById('sched-subject').value.trim()
  });

  saveAppData(data);
  this.reset();
  renderAll();
});

function renderSchedule() {
  const { schedules } = getAppData();
  const grid = document.getElementById('schedule-grid');

  grid.innerHTML = schedules.length
    ? schedules
        .map(
          (s) => `
        <div class="schedule-item">
          <strong>${s.day}</strong>
          <p style="font-size: 0.85rem; color: var(--muted); margin: 4px 0;">${s.time}</p>
          <p style="font-weight: 600; margin-bottom: 8px;">${s.subject}</p>
          <button class="btn btn-danger btn-sm" onclick="deleteSchedule(${s.id})">Remove</button>
        </div>`
        )
        .join('')
    : '<p>No study sessions added yet.</p>';
}

function deleteSchedule(id) {
  const data = getAppData();
  data.schedules = data.schedules.filter((s) => s.id !== id);
  saveAppData(data);
  renderAll();
}

/* EXPORT & INIT */
function exportJSON() {
  const data = getAppData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'studyflow-backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

function renderAll() {
  renderDashboard();
  renderTasks();
  renderSchedule();
}

window.addEventListener('DOMContentLoaded', () => {
  getAppData();
  const sessionRaw = localStorage.getItem(SESSION_KEY);
  if (sessionRaw) {
    enterApp(JSON.parse(sessionRaw));
  }
});