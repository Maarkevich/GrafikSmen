// === БЛОК 1: ВЕРСИЯ И КОНФИГ ===
const APP_VERSION = '3.1';
document.getElementById('app-version').textContent = `v${APP_VERSION}`;

export const POSITIONS = {
  'РТС': { salary: 33850, hoursPerShift: 11, shiftHours: 12, cycleType: 'cyclic', cycle: ['day','day','off','off'], dayTimeWD: '11:00', dayTimeWE: '09:00', hasNight: false, hasSleep: false, is5x2: false },
  'Прессовщик': { salary: 33850, hoursPerShift: 11, shiftHours: 12, cycleType: 'cyclic', cycle: ['day','day','off','off'], dayTimeWD: '11:00', dayTimeWE: '09:00', hasNight: false, hasSleep: false, is5x2: false },
  'Водитель склад': { salary: 34500, hoursPerShift: 8, shiftHours: 9, cycleType: '5x2', hasNight: false, hasSleep: false, is5x2: true },
  'Водитель смена': { salary: 34500, hoursPerShift: 11, shiftHours: 12, cycleType: 'cyclic', cycle: ['day','day','off','off'], dayTimeWD: '11:00', dayTimeWE: '09:00', hasNight: false, hasSleep: false, is5x2: false },
  'Разнорабочий': { salary: 33850, hoursPerShift: 8, shiftHours: 9, cycleType: '5x2', hasNight: false, hasSleep: false, is5x2: true },
  'Упаковщик': { salary: 33850, hoursPerShift: 11, shiftHours: 12, cycleType: 'cyclic', cycle: ['day','day','off','off'], dayTimeCustom: true, hasNight: false, hasSleep: false, is5x2: false },
  'Диспетчер': { salary: 34500, hoursPerShift: 11, shiftHours: 12, cycleType: 'cyclic', cycle: ['day','day','off','off'], dayTimeWD: '11:00', dayTimeWE: '09:00', hasNight: false, hasSleep: false, is5x2: false },
  'Начальник смены': { salary: 37500, hoursPerShift: 11, shiftHours: 12, cycleType: 'cyclic', cycle: ['day','day','off','off','night','night','off','off'], dayTimeWD: '11:00', dayTimeWE: '09:00', nightTimeWD: '23:00', nightTimeWE: '21:00', hasNight: true, hasSleep: false, is5x2: false },
  'Мельник': { salary: 33850, hoursPerShift: 11, shiftHours: 12, cycleType: 'cyclic', cycle: ['day','day','off','off','night','night','off','off'], dayTimeWD: '11:00', dayTimeWE: '09:00', nightTimeWD: '23:00', nightTimeWE: '21:00', hasNight: true, hasSleep: false, is5x2: false },
  'Автоклавщик': { salary: 33850, hoursPerShift: 11, shiftHours: 12, cycleType: 'cyclic', cycle: ['day','night','sleep','off'], dayTime: '09:00', nightTime: '21:00', hasNight: true, hasSleep: true, is5x2: false }
};

export const SHIFT_LABEL = { day:'День', night:'Ночь', sleep:'Отсыпной', off:'Выходной', extra:'Доп.', none:'' };
export const SHIFT_CLASS = { day:'shift-day', night:'shift-night', sleep:'shift-sleep', off:'shift-off', extra:'shift-extra', none:'shift-none' };
export const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
export const DAY_NAMES_HEADER = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
export const NORM_HOURS = 165;
const STORAGE_KEY = 'zp_calc_v3';

export const state = {
  position: '', mode: 'schedule', year: new Date().getFullYear(), month: new Date().getMonth(),
  cycleStartDate: '', cycleStartType: '', months: {}
};

const $ = sel => document.querySelector(sel);

// === БЛОК 2: УТИЛИТЫ ===
export function sanitizeNumber(input, min, max, step = 1) {
  if (input === '' || input == null) return null;
  let val = parseFloat(String(input).replace(',', '.'));
  if (isNaN(val)) return null;
  return Math.min(max, Math.max(min, Math.round(val / step) * step));
}
export function safeSave(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch {} }
export function safeLoad(key, fallback = null) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } }
export function cellKey(y, m, d) { return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
export function monthKey(y, m) { return `${y}-${String(m+1).padStart(2,'0')}`; }
export function getMonthData(y, m) {
  const key = monthKey(y, m);
  if (!state.months[key]) state.months[key] = { ktu: null, cells: {} };
  return state.months[key];
}

// === БЛОК 3: РАСЧЁТЫ ===
export function autoShift(pos, y, m, d) {
  const cfg = POSITIONS[pos];
  if (!pos || !state.cycleStartDate || !state.cycleStartType || !cfg) return null;
  if (cfg.is5x2) { const dow = new Date(y, m, d).getDay(); return (dow===0||dow===6)?'off':'day'; }
  const cycle = cfg.cycle;
  const startIdx = cycle.indexOf(state.cycleStartType);
  if (startIdx === -1) return null;
  const diff = Math.round((new Date(y,m,d) - new Date(state.cycleStartDate))/86400000);
  return cycle[((startIdx+diff)%cycle.length+cycle.length)%cycle.length];
}
export function shiftHours(pos, type, extraDur) {
  const cfg = POSITIONS[pos];
  if (!cfg) return 0;
  if (type==='day'||type==='night') return cfg.hoursPerShift;
  if (type==='extra') return extraDur==='9'?8:11;
  return 0;
}
export function monthStats(pos, y, m) {
  if (!pos) return { hours:0, workDays:0, nights:0 };
  const md = getMonthData(y, m);
  let hours=0, workDays=0, nights=0;
  const days = new Date(y, m+1, 0).getDate();
  for(let d=1; d<=days; d++) {
    const ck = cellKey(y,m,d);
    const cell = md.cells[ck];
    const type = cell?.type || autoShift(pos,y,m,d) || 'none';
    const h = cell?.hours ?? shiftHours(pos, type, cell?.extraDur);
    if (!['off','sleep','none'].includes(type)) { workDays++; hours += h; }
    if (type==='night') nights++;
  }
  return { hours, workDays, nights };
}
export function calculateSalary({ baseSalary, hours, normHours=NORM_HOURS, ktu=1 }) {
  if (!baseSalary || !hours || hours<=0) return null;
  return Math.round(baseSalary * ktu / normHours * hours);
}
export function formatRubles(amount) { return `${amount.toLocaleString('ru-RU')} ₽`; }

// === БЛОК 4: РЕНДЕРИНГ ===
function renderCalendar() {
  $('#month-name').textContent = `${MONTH_NAMES[state.month]} ${state.year}`;
  const grid = $('#calendar-grid'); grid.innerHTML = '';
  DAY_NAMES_HEADER.forEach(d => grid.innerHTML += `<div class="day-header">${d}</div>`);
  const offset = (new Date(state.year, state.month, 1).getDay() || 7) - 1;
  for(let i=0; i<offset; i++) grid.innerHTML += `<div class="day-cell empty"></div>`;
  const days = new Date(state.year, state.month+1, 0).getDate();
  const today = new Date();
  for(let d=1; d<=days; d++) {
    const ck = cellKey(state.year, state.month, d);
    const md = getMonthData(state.year, state.month);
    const auto = autoShift(state.position, state.year, state.month, d);
    const cell = md.cells[ck];
    const type = cell?.type || auto || 'none';
    const label = cell?.note ? '📝' : SHIFT_LABEL[type];
    const isToday = d===today.getDate() && state.month===today.getMonth() && state.year===today.getFullYear();
    grid.innerHTML += `<div class="day-cell ${SHIFT_CLASS[type]} ${isToday?'today':''}" data-day="${d}"><span class="day-num">${d}</span><span class="day-label">${label||''}</span></div>`;
  }
}
function renderStats() {
  const s = monthStats(state.position, state.year, state.month);
  $('#stat-workdays').textContent = s.workDays; $('#stat-hours').textContent = s.hours; $('#stat-nights').textContent = s.nights;
}
function renderSalary() {
  const pos = POSITIONS[state.position];
  $('#calc-salary').textContent = pos ? formatRubles(pos.salary) : '—';
  $('#calc-norm').textContent = `${NORM_HOURS} ч`;
  const stats = monthStats(state.position, state.year, state.month);
  $('#calc-auto-hours').textContent = stats.hours;
  const ktu = sanitizeNumber($('#ktu-input').value, 0, 10, 0.1) ?? 1;
  const res = pos ? calculateSalary({baseSalary: pos.salary, hours: stats.hours, normHours: NORM_HOURS, ktu}) : null;
  $('#salary-total').textContent = res ? formatRubles(res) : '0 ₽';
  $('#salary-formula').textContent = res ? `Оклад × КТУ / ${NORM_HOURS} × ${stats.hours}ч` : '';
}
function updateInputsToMonth() {
  const md = getMonthData(state.year, state.month);
  $('#ktu-input').value = md.ktu ?? 1;
}

// === БЛОК 5: СОБЫТИЯ И ИНИЦИАЛИЗАЦИЯ ===
export function loadState() { const loaded = safeLoad(STORAGE_KEY); if(loaded) Object.assign(state, loaded); }
export function saveState() { safeSave(STORAGE_KEY, state); }

function init() {
  loadState();
  $('#position-select').innerHTML = '<option value="">— Выберите должность —</option>' + Object.keys(POSITIONS).map(p => `<option value="${p}">${p}</option>`).join('');
  $('#position-select').value = state.position;
  $('#cycle-start').value = state.cycleStartDate || '';
  $('#cycle-type').innerHTML = '<option value="">— нет (5×2 = авто) —</option>' + Object.keys(SHIFT_LABEL).filter(k=>k!=='none').map(k=>`<option value="${k}">${SHIFT_LABEL[k]}</option>`).join('');
  $('#cycle-type').value = state.cycleStartType || '';
  
  updateInputsToMonth(); renderAll();

  $('#prev-month').onclick = () => { state.month--; if(state.month<0){state.month=11; state.year--;} updateInputsToMonth(); renderAll(); saveState(); };
  $('#next-month').onclick = () => { state.month++; if(state.month>11){state.month=0; state.year++;} updateInputsToMonth(); renderAll(); saveState(); };
  $('#position-select').onchange = e => { state.position = e.target.value; updateInputsToMonth(); renderAll(); saveState(); };
  $('#ktu-input').oninput = e => { getMonthData(state.year, state.month).ktu = e.target.value; renderSalary(); saveState(); };

  $('.mode-btn[data-mode="schedule"]').onclick = () => { state.mode='schedule'; document.querySelectorAll('.mode-btn').forEach(b=>b.classList.toggle('active', b.dataset.mode==='schedule')); renderCalendar(); saveState(); };
  $('.mode-btn[data-mode="manual"]').onclick = () => { state.mode='manual'; document.querySelectorAll('.mode-btn').forEach(b=>b.classList.toggle('active', b.dataset.mode==='manual')); renderCalendar(); saveState(); };

  $('#toggle-settings').onclick = () => { $('#settings-panel').classList.toggle('open'); $('#chevron').style.transform = $('#settings-panel').classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)'; };
  $('#btn-apply-cycle').onclick = () => { state.cycleStartDate = $('#cycle-start').value; state.cycleStartType = $('#cycle-type').value; renderCalendar(); saveState(); };
  $('#btn-clear-month').onclick = () => { if(confirm('Очистить правки?')) { getMonthData(state.year, state.month).cells = {}; renderAll(); saveState(); } };

  // Модалка
  $('#calendar-grid').onclick = e => { const d = e.target.closest('.day-cell')?.dataset.day; if(d) openModal(+d); };
  $('#btn-cancel-day').onclick = () => $('#day-modal').classList.add('hidden');
  $('#day-modal').onclick = e => { if(e.target.id==='day-modal') $('#day-modal').classList.add('hidden'); };
  $('#btn-save-day').onclick = () => { saveDayData(); $('#day-modal').classList.add('hidden'); renderAll(); saveState(); };
  $('#adj-minus').onclick = () => { $('#adj-hours').value = Math.max(0, (parseFloat($('#adj-hours').value)||0) - 0.5); };
  $('#adj-plus').onclick = () => { $('#adj-hours').value = Math.min(24, (parseFloat($('#adj-hours').value)||0) + 0.5); };

  // Экспорт
  $('#btn-export').onclick = () => { /* логика CSV */ };
  $('#btn-backup').onclick = () => { /* логика бэкапа */ };
  $('#btn-restore').onclick = () => { /* логика восстановления */ };

  // Тема
  const storedTheme = localStorage.getItem('zp_theme');
  const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let theme = storedTheme || (sysDark ? 'dark' : 'light');
  applyTheme(theme);
  $('#theme-toggle').textContent = theme === 'dark' ? '☀️' : '🌙';
  $('#theme-toggle').onclick = () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next); localStorage.setItem('zp_theme', next);
  };

  // iOS Баннер
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  if (isIOS && !isStandalone && !localStorage.getItem('zp_ios_dismissed')) {
    $('#ios-banner').classList.remove('hidden');
    $('#ios-close').onclick = () => { $('#ios-banner').classList.add('hidden'); localStorage.setItem('zp_ios_dismissed','1'); };
  }
}

function renderAll() { renderCalendar(); renderStats(); renderSalary(); }
function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); $('#theme-toggle').textContent = t==='dark'?'☀️':'🌙'; }

let modalDay = null;
function openModal(day) {
  modalDay = day;
  const md = getMonthData(state.year, state.month);
  const ck = cellKey(state.year, state.month, day);
  const auto = autoShift(state.position, state.year, state.month, day) || 'none';
  const cell = md.cells[ck] || { type: auto, hours: null, extraDur: '12', note: '' };
  $('#modal-title').textContent = `Редактирование смены`;
  $('#modal-date').textContent = `${day} ${MONTH_NAMES[state.month].toLowerCase()} ${state.year}`;
  $('#shift-grid').innerHTML = Object.keys(SHIFT_LABEL).filter(k=>k!=='none').map(k => `<button class="shift-btn ${SHIFT_CLASS[k]} ${cell.type===k?'active':''}" data-type="${k}"><span>${SHIFT_LABEL[k]}</span></button>`).join('');
  $('#adj-hours').value = cell.hours ?? shiftHours(state.position, cell.type, cell.extraDur);
  $('#day-note').value = cell.note || '';
  $('#day-modal').classList.remove('hidden');

  document.querySelectorAll('.shift-btn').forEach(b => b.onclick = () => {
    document.querySelectorAll('.shift-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); cell.type = b.dataset.type;
    $('#adj-hours').value = shiftHours(state.position, cell.type, cell.extraDur);
  });
}
function saveDayData() {
  const md = getMonthData(state.year, state.month);
  const ck = cellKey(state.year, state.month, modalDay);
  const activeBtn = document.querySelector('.shift-btn.active');
  md.cells[ck] = { type: activeBtn?.dataset.type||'none', hours: parseFloat($('#adj-hours').value)||0, note: $('#day-note').value.trim() };
}

document.addEventListener('DOMContentLoaded', init);(); });