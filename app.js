/* ===== VERSION ===== */
const APP_VERSION = '5.0';
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('app-version').textContent = `v${APP_VERSION}`;
});

/* ===== ДАННЫЕ ===== */
const POSITIONS = {
  'РТС': { salary: 33850, hoursPerShift: 11, cycleType: 'cyclic', cycle: ['day','day','off','off'], is5x2: false },
  'Прессовщик': { salary: 33850, hoursPerShift: 11, cycleType: 'cyclic', cycle: ['day','day','off','off'], is5x2: false },
  'Водитель склад': { salary: 34500, hoursPerShift: 8, cycleType: '5x2', is5x2: true },
  'Водитель смена': { salary: 34500, hoursPerShift: 11, cycleType: 'cyclic', cycle: ['day','day','off','off'], is5x2: false },
  'Разнорабочий': { salary: 33850, hoursPerShift: 8, cycleType: '5x2', is5x2: true },
  'Упаковщик': { salary: 33850, hoursPerShift: 11, cycleType: 'cyclic', cycle: ['day','day','off','off'], is5x2: false },
  'Диспетчер': { salary: 34500, hoursPerShift: 11, cycleType: 'cyclic', cycle: ['day','day','off','off'], is5x2: false },
  'Начальник смены': { salary: 37500, hoursPerShift: 11, cycleType: 'cyclic', cycle: ['day','day','off','off','night','night','off','off'], is5x2: false },
  'Мельник': { salary: 33850, hoursPerShift: 11, cycleType: 'cyclic', cycle: ['day','day','off','off','night','night','off','off'], is5x2: false },
  'Автоклавщик': { salary: 33850, hoursPerShift: 11, cycleType: 'cyclic', cycle: ['day','night','off','off'], is5x2: false }
};

const SHIFT_LABEL = {
  day:'День',
  night:'Ночь',
  off:'Выходной',
  extra:'Доп',
  none:''
};

const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DAY_NAMES_HEADER = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

const STORAGE_KEY = 'zp_calc_v5';

/* ===== STATE ===== */
const state = {
  position: '',
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  months: {}
};

const $ = s => document.querySelector(s);

/* ===== STORAGE ===== */
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function load() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) Object.assign(state, JSON.parse(data));
}

/* ===== КАЛЕНДАРЬ ===== */
function renderCalendar() {
  const grid = $('#calendar-grid');
  grid.innerHTML = '';

  $('#month-name').textContent = `${MONTH_NAMES[state.month]} ${state.year}`;

  DAY_NAMES_HEADER.forEach(d => {
    grid.innerHTML += `<div class="day-header">${d}</div>`;
  });

  let first = new Date(state.year, state.month, 1).getDay();
  if (first === 0) first = 7;

  for (let i = 1; i < first; i++) {
    grid.innerHTML += `<div class="day-cell empty"></div>`;
  }

  const days = new Date(state.year, state.month + 1, 0).getDate();

  for (let d = 1; d <= days; d++) {
    const isToday =
      d === new Date().getDate() &&
      state.month === new Date().getMonth() &&
      state.year === new Date().getFullYear();

    grid.innerHTML += `
      <div class="day-cell ${isToday ? 'today' : ''}" data-day="${d}">
        <span>${d}</span>
      </div>
    `;
  }
}

/* ===== МОДАЛКА ===== */
let modalDay = null;

function openModal(day) {
  modalDay = day;

  $('#modal-date').textContent =
    `${day} ${MONTH_NAMES[state.month]} ${state.year}`;

  const grid = $('#shift-grid');

  grid.innerHTML = Object.keys(SHIFT_LABEL)
    .filter(k => k !== 'none')
    .map(k => `<button class="btn-secondary shift-btn" data-type="${k}">${SHIFT_LABEL[k]}</button>`)
    .join('');

  document.querySelectorAll('.shift-btn').forEach(btn => {
    btn.onclick = () => btn.classList.toggle('active');
  });

  $('#day-modal').classList.remove('hidden');
}

function saveDay() {
  $('#day-modal').classList.add('hidden');
}

/* ===== МЕСЯЦ ===== */
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

/* ===== СВАЙП ===== */
let touchStartX = 0;

document.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', e => {
  const diff = e.changedTouches[0].screenX - touchStartX;

  if (Math.abs(diff) > 60) {
    diff > 0 ? prevMonth() : nextMonth();
  }
});

/* ===== ТЕМЫ ===== */
function applyTheme(theme, accent) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-accent', accent);
  localStorage.setItem('ui_theme', theme);
  localStorage.setItem('ui_accent', accent);
}

function initTheme() {
  const t = localStorage.getItem('ui_theme') || 'light';
  const a = localStorage.getItem('ui_accent') || 'blue';
  applyTheme(t, a);

  document.querySelectorAll('.theme-option').forEach(btn => {
    btn.onclick = () => {
      applyTheme(btn.dataset.theme, btn.dataset.accent);
    };
  });

  $('#theme-toggle').onclick = () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark',
      localStorage.getItem('ui_accent') || 'blue');
  };
}

/* ===== COLLAPSIBLE ===== */
function togglePanel(btnId, panelId, chevronId) {
  $(btnId).onclick = () => {
    const panel = $(panelId);
    panel.classList.toggle('open');

    const ch = $(chevronId);
    ch.style.transform = panel.classList.contains('open')
      ? 'rotate(180deg)'
      : 'rotate(0deg)';
  };
}

/* ===== INIT ===== */
function init() {
  load();

  const sel = $('#position-select');

  sel.innerHTML =
    '<option value="">— Выберите должность —</option>' +
    Object.keys(POSITIONS)
      .map(p => `<option value="${p}">${p}</option>`)
      .join('');

  sel.value = state.position;

  sel.onchange = e => {
    state.position = e.target.value;
    save();
  };

  $('#calendar-grid').onclick = e => {
    const d = e.target.closest('.day-cell')?.dataset.day;
    if (d) openModal(d);
  };

  $('#btn-save-day').onclick = saveDay;
  $('#btn-cancel-day').onclick = () => {
    $('#day-modal').classList.add('hidden');
  };

  $('#prev-month').onclick = prevMonth;
  $('#next-month').onclick = nextMonth;

  togglePanel('#toggle-settings', '#settings-panel', '#chevron-settings');
  togglePanel('#toggle-theme-panel', '#theme-panel', '#chevron-theme');

  initTheme();

  renderAll();
}

/* ===== RENDER ===== */
function renderAll() {
  renderCalendar();
}

/* ===== START ===== */
document.addEventListener('DOMContentLoaded', init);