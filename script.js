const SUPABASE_URL = 'https://firqcvxlwjjubycsafgt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_5Hvm8P_CXGH-jLVIADq4QQ_ZIvzMHYl';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let cachedTasks = [];
let cachedSchedules = [];

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

document.getElementById('register-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  clearAuthMessage();

  const fullName = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const password = document.getElementById('reg-password').value;

  if (!email.endsWith('@gnc.edu.ph')) {
    showAuthMessage('Please use a valid @gnc.edu.ph student email address.');
    return;
  }

  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  });

  if (error) {
    showAuthMessage(error.message);
    return;
  }

  if (data.user) {
    await db.from('profiles').upsert({
      id: data.user.id,
      full_name: fullName,
      email
    });
  }

  this.reset();
  switchAuthTab('login');
  document.getElementById('login-email').value = email;

  if (data.session) {
    await enterApp(data.user);
  } else {
    showAuthMessage('Account registered! Check your email for confirmation or sign in.', 'success');
  }
});

document.getElementById('login-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  clearAuthMessage();

  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;

  const { data, error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    showAuthMessage(error.message);
    return;
  }

  await enterApp(data.user);
});

async function enterApp(user) {
  currentUser = user;

  const fullName = user.user_metadata?.full_name || user.email.split('@')[0];

  await db.from('profiles').upsert({
    id: user.id,
    full_name: fullName,
    email: user.email,
    last_login_at: new Date().toISOString()
  });

  const { data: profile } = await db
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single();

  const displayName = profile?.full_name || fullName;
  const displayEmail = profile?.email || user.email;

  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('app-section').classList.remove('hidden');
  document.getElementById('user-display-name').textContent = displayName;
  document.getElementById('user-display-email').textContent = displayEmail;

  await refreshAllData();
}

async function logout() {
  await db.auth.signOut();
  currentUser = null;
  cachedTasks = [];
  cachedSchedules = [];
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

/* DATA FETCHING & RENDERING */
async function refreshAllData() {
  if (!currentUser) return;

  const [tasksRes, schedRes] = await Promise.all([
    db.from('tasks').select('*').order('deadline', { ascending: true }),
    db.from('schedules').select('*').order('id', { ascending: true })
  ]);

  cachedTasks = tasksRes.data || [];
  cachedSchedules = schedRes.data || [];

  renderDashboard();
  renderTasks();
  renderSchedule();
}

function renderDashboard() {
  const tasks = cachedTasks;
  const schedules = cachedSchedules;

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
          <span>${s.time_slot}</span>
        </li>`
        )
        .join('')
    : '<li><span>No study sessions scheduled.</span></li>';
}

/* TASK CRUD */
document.getElementById('task-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  if (!currentUser) return;

  const idVal = document.getElementById('task-id').value;
  const payload = {
    user_id: currentUser.id,
    title: document.getElementById('task-title').value.trim(),
    subject: document.getElementById('task-subject').value.trim(),
    deadline: document.getElementById('task-deadline').value,
    priority: document.getElementById('task-priority').value,
    status: document.getElementById('task-status').value
  };

  let error;
  if (idVal) {
    ({ error } = await db.from('tasks').update(payload).eq('id', Number(idVal)));
  } else {
    ({ error } = await db.from('tasks').insert(payload));
  }

  if (error) {
    alert(`Error saving task: ${error.message}`);
    return;
  }

  resetTaskForm();
  await refreshAllData();
});

function renderTasks() {
  const statusFilter = document.getElementById('filter-status').value;
  const priorityFilter = document.getElementById('filter-priority').value;

  const filtered = cachedTasks.filter((t) => {
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
  const task = cachedTasks.find((t) => t.id === id);
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

async function deleteTask(id) {
  const { error } = await db.from('tasks').delete().eq('id', id);
  if (error) {
    alert(`Error deleting task: ${error.message}`);
    return;
  }
  await refreshAllData();
}

/* SCHEDULE PLANNER */
document.getElementById('schedule-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  if (!currentUser) return;

  const { error } = await db.from('schedules').insert({
    user_id: currentUser.id,
    day: document.getElementById('sched-day').value,
    time_slot: document.getElementById('sched-time').value.trim(),
    subject: document.getElementById('sched-subject').value.trim()
  });

  if (error) {
    alert(`Error adding schedule: ${error.message}`);
    return;
  }

  this.reset();
  await refreshAllData();
});

function renderSchedule() {
  const grid = document.getElementById('schedule-grid');
  grid.innerHTML = cachedSchedules.length
    ? cachedSchedules
        .map(
          (s) => `
        <div class="schedule-item">
          <strong>${s.day}</strong>
          <p style="font-size: 0.85rem; color: var(--muted); margin: 4px 0;">${s.time_slot}</p>
          <p style="font-weight: 600; margin-bottom: 8px;">${s.subject}</p>
          <button class="btn btn-danger btn-sm" onclick="deleteSchedule(${s.id})">Remove</button>
        </div>`
        )
        .join('')
    : '<p>No study sessions added yet.</p>';
}

async function deleteSchedule(id) {
  const { error } = await db.from('schedules').delete().eq('id', id);
  if (error) {
    alert(`Error removing schedule: ${error.message}`);
    return;
  }
  await refreshAllData();
}

/* EXPORT & SESSION RESTORE */
function exportJSON() {
  const exportPayload = {
    user: currentUser?.email || null,
    tasks: cachedTasks,
    schedules: cachedSchedules
  };
  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'studyflow-supabase-backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

window.addEventListener('DOMContentLoaded', async () => {
  const { data } = await db.auth.getSession();
  if (data.session?.user) {
    await enterApp(data.session.user);
  }
});