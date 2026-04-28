const APP_VERSION = '4.7';
document.getElementById('app-version').textContent = `v${APP_VERSION}`;

/* ===== ДАННЫЕ ===== */
const POSITIONS = {
  'РТС': { salary: 33850, hoursPerShift: 11, cycleType: 'cyclic', cycle: ['day','day','off','off'], is5x2: false },
  'Водитель склад': { salary: 34500, hoursPerShift: 8, cycleType: '5x2', is5x2: true },
  'Начальник смены': { salary: 37500, hoursPerShift: 11, cycleType: 'cyclic', cycle: ['day','day','off','off','night','night','off','off'], is5x2: false }
};

const SHIFT_LABEL = {
  day:'День',
  night:'Ночь',
  off:'Выходной',
  none:''
};

const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DAY_NAMES_HEADER = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

const STORAGE_KEY = 'zp_calc_v4';

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
  $('#month-name').textContent = `${MONTH_NAMES[state.month]} ${state.year}`;
  const grid = $('#calendar-grid');
  grid.innerHTML = '';

  // дни недели
  DAY_NAMES_HEADER.forEach(d => {
    grid.innerHTML += `<div class="day-header">${d}</div>`;
  });

  const first = new Date(state.year, state.month, 1);
  let start = first.getDay();
  if (start === 0) start = 7;

  // отступ
  for (let i = 1; i < start; i++) {
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

/* ===== СВАЙПЫ ===== */
let touchStartX = 0;

document.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', e => {
  const diff = e.changedTouches[0].screenX - touchStartX;

  if (Math.abs(diff) > 50) {
    if (diff > 0) prevMonth();
    else nextMonth();
  }
});

/* ===== ЗАРПЛАТА (упрощённая логика) ===== */
function renderSalary() {
  const pos = POSITIONS[state.position];
  if (!pos) {
    $('#calc-salary').textContent = '—';
    $('#salary-total').textContent = '0 ₽';
    return;
  }

  $('#calc-salary').textContent = `${pos.salary.toLocaleString('ru-RU')} ₽`;

  const hours = 160;
  $('#calc-auto-hours').textContent = hours;

  const ktu = parseFloat($('#ktu-input').value) || 1;

  const total = Math.round(pos.salary * ktu);
  $('#salary-total').textContent = `${total.toLocaleString('ru-RU')} ₽`;
}

/* ===== INIT ===== */
function init() {
  load();

  // позиции
  const sel = $('#position-select');
  sel.innerHTML =
    '<option value="">— Выберите должность —</option>' +
    Object.keys(POSITIONS).map(p => `<option value="${p}">${p}</option>`).join('');

  sel.value = state.position;

  sel.onchange = e => {
    state.position = e.target.value;
    renderSalary();
    save();
  };

  $('#ktu-input').oninput = () => {
    renderSalary();
    save();
  };

  $('#prev-month').onclick = prevMonth;
  $('#next-month').onclick = nextMonth;

  renderAll();
}

/* ===== РЕНДЕР ВСЕГО ===== */
function renderAll() {
  renderCalendar();
  renderSalary();
}

/* ===== PWA INSTALL ===== */
let deferredPrompt;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;

  const btn = $('#btn-install');
  btn.classList.remove('hidden');

  btn.onclick = async () => {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    btn.classList.add('hidden');
  };
});

/* ===== iOS banner ===== */
function iosBanner() {
  const isIOS = /iPhone|iPad/.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone;

  if (isIOS && !isStandalone && !localStorage.getItem('ios_hide')) {
    $('#ios-banner').classList.add('show');

    $('#ios-close').onclick = () => {
      $('#ios-banner').classList.remove('show');
      localStorage.setItem('ios_hide', '1');
    };
  }
}

/* ===== START ===== */
document.addEventListener('DOMContentLoaded', () => {
  init();
  iosBanner();
});