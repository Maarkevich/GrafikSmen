/* ===== VERSION ===== */
const APP_VERSION = '6.1';

/* ===== CONSTANTS ===== */
const STORAGE_KEY = 'grafik_full_v6';

const POSITIONS_DEFAULT = {
  'РТС': { salary: 33850, hours: 11, cycle: ['day','day','off','off'], type:'cycle' },
  'Прессовщик': { salary: 33850, hours: 11, cycle: ['day','day','off','off'], type:'cycle' },
  'Водитель склад': { salary: 34500, hours: 8, type:'5x2' },
  'Водитель смена': { salary: 34500, hours: 11, cycle: ['day','day','off','off'], type:'cycle' },
  'Разнорабочий': { salary: 33850, hours: 8, type:'5x2' },
  'Упаковщик': { salary: 33850, hours: 11, cycle: ['day','day','off','off'], type:'cycle' },
  'Диспетчер': { salary: 34500, hours: 11, cycle: ['day','day','off','off'], type:'cycle' },
  'Начальник смены': { salary: 37500, hours: 11, cycle: ['day','day','off','off','night','night','off','off'], type:'cycle' },
  'Мельник': { salary: 33850, hours: 11, cycle: ['day','day','off','off','night','night','off','off'], type:'cycle' },
  'Автоклавщик': { salary: 33850, hours: 11, cycle: ['day','night','sleep','off'], type:'cycle' }
};

const SHIFT_LABEL = {
  day:'День',
  night:'Ночь',
  sleep:'Отсыпной',
  off:'Выходной',
  extra:'Доп.'
};

/* ===== STATE ===== */
let state = {
  position: '',
  positions: {},
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  cycleStartDate: '',
  cycleStartType: '',
  months: {}
};

const $ = s => document.querySelector(s);

/* ===== STORAGE ===== */
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function load() {
  const d = localStorage.getItem(STORAGE_KEY);
  if (d) state = JSON.parse(d);
}

/* ===== INIT ===== */
function init() {
  load();

  if (!state.positions || Object.keys(state.positions).length === 0) {
    state.positions = POSITIONS_DEFAULT;
  }

  fillPositions();
  initTheme();
  bindUI();
  renderAll();

  $('#app-version').textContent = 'v' + APP_VERSION;
}

/* ===== POSITIONS ===== */
function fillPositions() {
  const sel = $('#position-select');

  sel.innerHTML =
    '<option value="">Выберите</option>' +
    Object.keys(state.positions)
      .map(p => `<option value="${p}">${p}</option>`).join('');

  sel.value = state.position;

  sel.onchange = e => {
    state.position = e.target.value;
    renderAll();
    save();
  };
}

/* ===== SHIFT CALC ===== */
function getShift(y,m,d) {
  const pos = state.positions[state.position];
  if (!pos) return null;

  if (pos.type === '5x2') {
    const dow = new Date(y,m,d).getDay();
    return (dow === 0 || dow === 6) ? 'off' : 'day';
  }

  if (!state.cycleStartDate || !state.cycleStartType) return null;

  const start = new Date(state.cycleStartDate);
  const current = new Date(y,m,d);

  const diff = Math.floor((current - start) / 86400000);

  const idx = pos.cycle.indexOf(state.cycleStartType);
  if (idx === -1) return null;

  return pos.cycle[(idx + diff % pos.cycle.length + pos.cycle.length) % pos.cycle.length];
}

/* ===== CALENDAR ===== */
function renderCalendar() {
  const grid = $('#calendar-grid');

  grid.classList.remove('animate');
  void grid.offsetWidth;
  grid.classList.add('animate');

  grid.innerHTML = '';

  const monthName = new Date(state.year, state.month)
    .toLocaleString('ru', { month: 'long', year: 'numeric' });

  $('#month-name').textContent = monthName;

  const firstDay = new Date(state.year, state.month, 1).getDay() || 7;

  for (let i = 1; i < firstDay; i++) {
    grid.innerHTML += '<div></div>';
  }

  const days = new Date(state.year, state.month+1,0).getDate();

  for (let d=1; d<=days; d++) {
    const shift = getShift(state.year,state.month,d) || 'off';

    grid.innerHTML += `
      <div class="day-cell shift-${shift}" data-day="${d}">
        ${d}
      </div>
    `;
  }
}

/* ===== NAV ===== */
function prevMonth() {
  state.month--;
  if (state.month < 0) {
    state.month = 11;
    state.year--;
  }
  renderAll();
  save();
}

function nextMonth() {
  state.month++;
  if (state.month > 11) {
    state.month = 0;
    state.year++;
  }
  renderAll();
  save();
}

/* ===== SETTINGS ===== */
function bindSettings() {
  $('#toggle-settings').onclick = () => {
    $('#settings-panel').classList.toggle('open');
  };

  $('#cycle-start').oninput = e => {
    state.cycleStartDate = e.target.value;
  };

  $('#cycle-type').onchange = e => {
    state.cycleStartType = e.target.value;
  };

  $('#btn-apply-cycle').onclick = () => {
    renderAll();
    save();
  };

  $('#btn-clear-month').onclick = () => {
    if (confirm('Очистить?')) {
      state.months = {};
      renderAll();
      save();
    }
  };
}

/* ===== MODAL ===== */
let modalDay = null;
let modalType = null;

function openModal(day) {
  modalDay = day;

  $('#modal-date').textContent = `${day}`;

  $('#day-modal').classList.remove('hidden');

  document.querySelectorAll('.shift-btn').forEach(btn => {
    btn.onclick = () => {
      modalType = btn.dataset.type;
    };
  });
}

function saveDay() {
  if (!modalDay) return;

  const key = `${state.year}-${state.month}-${modalDay}`;
  if (!state.months[key]) state.months[key] = {};

  state.months[key].type = modalType;

  $('#day-modal').classList.add('hidden');

  renderAll();
  save();
}

/* ===== SALARY ===== */
function renderSalary() {
  const pos = state.positions[state.position];
  if (!pos) return;

  $('#calc-salary').textContent = pos.salary + ' ₽';
}

/* ===== THEME ===== */
function initTheme() {
  const t = localStorage.getItem('theme') || 'dark';
  const a = localStorage.getItem('accent') || 'blue';

  applyTheme(t,a);

  document.querySelectorAll('.theme-option').forEach(btn=>{
    btn.onclick = ()=>{
      applyTheme(btn.dataset.theme, btn.dataset.accent);
    };
  });

  $('#theme-toggle').onclick = ()=>{
    const cur = document.documentElement.dataset.theme;
    applyTheme(cur==='dark'?'light':'dark',
      localStorage.getItem('accent')||'blue');
  };
}

function applyTheme(t,a) {
  document.documentElement.dataset.theme = t;
  document.documentElement.dataset.accent = a;

  localStorage.setItem('theme',t);
  localStorage.setItem('accent',a);
}

/* ===== UI ===== */
function bindUI() {
  $('#prev-month').onclick = prevMonth;
  $('#next-month').onclick = nextMonth;

  $('#calendar-grid').onclick = e=>{
    const d = e.target.dataset.day;
    if (d) openModal(+d);
  };

  $('#btn-save-day').onclick = saveDay;
  $('#btn-cancel-day').onclick = ()=>{
    $('#day-modal').classList.add('hidden');
  };

  bindSettings();
}

/* ===== RENDER ===== */
function renderAll() {
  renderCalendar();
  renderSalary();
}

/* ===== START ===== */
document.addEventListener('DOMContentLoaded', init);