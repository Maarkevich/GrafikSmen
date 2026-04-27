// === БЛОК 1: ВЕРСИЯ ПРИЛОЖЕНИЯ ===
// Меняйте это число при каждом обновлении. Оно автоматически отобразится в футере.
const APP_VERSION = '3.1';
document.getElementById('app-version').textContent = `v${APP_VERSION}`;

// === БЛОК 2: КОНФИГУРАЦИЯ ДОЛЖНОСТЕЙ ===
// Добавляйте, редактируйте или удаляйте профессии только здесь.
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

// === БЛОК 3: КОНСТАНТЫ И СОСТОЯНИЕ ===
export const SHIFT_LABEL = { day:'День', night:'Ночь', sleep:'Отсыпной', off:'Выходной', extra:'Доп.', none:'' };
export const SHIFT_CLASS = { day:'shift-day', night:'shift-night', sleep:'shift-sleep', off:'shift-off', extra:'shift-extra', none:'shift-none' };
export const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
export const MONTH_NAMES_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
export const DAY_NAMES_HEADER = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
export const NORM_HOURS = 165;

export const state = {
  position: '', mode: 'schedule', year: new Date().getFullYear(), month: new Date().getMonth(),
  cycleStartDate: '', cycleStartType: '', months: {}
};

const STORAGE_KEY = 'zp_calc_v3';

// === БЛОК 4: УТИЛИТЫ ===
export function sanitizeNumber(input, min, max, step = 1) {
  if (input === '' || input == null) return null;
  let val = parseFloat(String(input).replace(',', '.'));
  if (isNaN(val)) return null;
  return Math.min(max, Math.max(min, Math.round(val / step) * step));
}
export function safeSave(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); return true; }
  catch (e) { if (e.name === 'QuotaExceededError') console.warn('⚠️ localStorage переполнен'); return false; }
}
export function safeLoad(key, fallback = null) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
export function cellKey(y, m, d) { return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
export function monthKey(y, m) { return `${y}-${String(m + 1).padStart(2, '0')}`; }
export function formatRubles(amount) { return `${amount.toLocaleString('ru-RU')} ₽`; }

// === БЛОК 5: ЛОГИКА РАСЧЁТОВ ===
export function autoShift(pos, y, m, d) {
  const cfg = POSITIONS[pos];
  if (!pos || !state.cycleStartDate || !state.cycleStartType || !cfg) return null;
  if (cfg.is5x2) { const dow = new Date(y, m, d).getDay(); return (dow === 0 || dow === 6) ? 'off' : 'day'; }
  if (cfg.cycleType === 'cyclic') {
    const cycle = cfg.cycle;
    const startIdx = cycle.indexOf(state.cycleStartType);
    if (startIdx === -1) return null;
    const diff = Math.round((new Date(y, m, d) - new Date(state.cycleStartDate)) / 86400000);
    return cycle[((startIdx + diff) % cycle.length + cycle.length) % cycle.length];
  }
  return null;
}
export function shiftHours(pos, type, extraDur) {
  const cfg = POSITIONS[pos];
  if (!cfg) return 0;
  if (type === 'day' || type === 'night') return cfg.hoursPerShift;
  if (type === 'extra') return extraDur === '9' ? 8 : 11;
  return 0;
}
export function monthStats(pos, y, m) {
  if (!pos) return { hours: 0, workDays: 0, nights: 0 };
  const md = getMonthData(y, m);
  let hours = 0, workDays = 0, nights = 0;
  for (let d = 1; d <= new Date(y, m + 1, 0).getDate(); d++) {
    const ck = cellKey(y, m, d);
    const cell = md.cells[ck];
    let type = cell ? cell.type : (autoShift(pos, y, m, d) || 'none');
    let h = cell && cell.hours !== null ? cell.hours : shiftHours(pos, type, cell?.extraDur);
    if (!['off','sleep','none'].includes(type)) { workDays++; hours += h; }
    if (type === 'night') nights++;
  }
  return { hours, workDays, nights };
}
export function calculateSalary({ baseSalary, hours, normHours = NORM_HOURS, ktu = 1 }) {
  if (!baseSalary || !hours || hours <= 0) return null;
  return Math.round(baseSalary * ktu / normHours * hours);
}
export function getMonthData(y, m) {
  const key = monthKey(y, m);
  if (!state.months[key]) state.months[key] = { ktu: null, manualHours: null, cells: {} };
  return state.months[key];
}

// === БЛОК 6: ЭКСПОРТ / ИМПОРТ ===
export function exportMonthToCSV(y, m, pos) {
  const md = getMonthData(y, m);
  const rows = [['Дата','День недели','Смена','Часы','Заметка']];
  for (let d = 1; d <= new Date(y, m + 1, 0).getDate(); d++) {
    const ck = cellKey(y, m, d);
    const cell = md.cells[ck];
    const date = new Date(y, m, d);
    rows.push([`${d}.${String(m+1).padStart(2,'0')}.${y}`, date.toLocaleDateString('ru-RU',{weekday:'long'}), cell?.type || 'авто', cell?.hours ?? '—', cell?.note || '']);
  }
  return '\ufeff' + rows.map(r => r.join(',')).join('\n');
}
export function downloadFile(content, filename) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], {type:'text/csv;charset=utf-8'})); a.download = filename; a.click();
}
export function exportBackup() { downloadFile(JSON.stringify({v:APP_VERSION, date: new Date().toISOString(), state}, null, 2), `zp-backup-${new Date().toISOString().slice(0,10)}.json`); }
export function importBackup(json) {
  try { const p = JSON.parse(json); if(p.state?.months) Object.assign(state, p.state); saveState(); renderAll(); return true; }
  catch { alert('Ошибка: неверный формат бэкапа'); return false; }
}

// === БЛОК 7: UI РЕНДЕРИНГ ===
const $ = sel => document.querySelector(sel);
let modalDay = null;

function renderAll() {
  renderCalendar(); renderStats(); renderSalary();
}
function renderCalendar() {
  $('#month-name').textContent = `${MONTH_NAMES[state.month]} ${state.year}`;
  const grid = $('#calendar-grid'); grid.innerHTML = '';
  DAY_NAMES_HEADER.forEach(d => grid.innerHTML += `<div class="day-header">${d}</div>`);
  const firstDay = new Date(state.year, state.month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
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
    const isToday = d === today.getDate() && state.month === today.getMonth() && state.year === today.getFullYear();
    grid.innerHTML += `<div class="day-cell ${SHIFT_CLASS[type]} ${isToday?'today':''}" data-day="${d}">
      <span class="day-num">${d}</span><span class="day-label">${label || ''}</span>
    </div>`;
  }
}
function renderStats() {
  const s = monthStats(state.position, state.year, state.month);
  $('#stat-workdays').textContent = s.workDays;
  $('#stat-hours').textContent = s.hours;
  $('#stat-nights').textContent = s.nights;
}
function renderSalary() {
  const pos = POSITIONS[state.position];
  $('#calc-salary').textContent = pos ? formatRubles(pos.salary) : '—';
  $('#calc-norm').textContent = `${NORM_HOURS} ч`;
  const h = sanitizeNumber($('#manual-hours').value, 0, 400) || 0;
  const k = sanitizeNumber($('#ktu-input').value, 0, 10, 0.1) || 1;
  const res = pos ? calculateSalary({baseSalary: pos.salary, hours: h || monthStats(state.position, state.year, state.month).hours, normHours: NORM_HOURS, ktu: k}) : null;
  $('#salary-total').textContent = res ? formatRubles(res) : '0 ₽';
  $('#salary-formula').textContent = res ? `Оклад × КТУ / ${NORM_HOURS} × ${h || 'авто'}ч` : '';
}

// === БЛОК 8: СОБЫТИЯ И УПРАВЛЕНИЕ ===
export function loadState() { Object.assign(state, safeLoad(STORAGE_KEY) || {}); }
export function saveState() { safeSave(STORAGE_KEY, state); }

function init() {
  loadState();
  // Заполнение селекта должностей
  const sel = $('#position-select');
  sel.innerHTML = '<option value="">— Выберите должность —</option>' + Object.keys(POSITIONS).map(p => `<option value="${p}">${p}</option>`).join('');
  sel.value = state.position;
  $('#manual-hours').value = getMonthData(state.year, state.month).manualHours || '';
  $('#ktu-input').value = getMonthData(state.year, state.month).ktu || 1;
  $('#cycle-start').value = state.cycleStartDate || '';
  $('#cycle-type').innerHTML = `<option value="">— нет (5×2 = авто) —</option>` + Object.keys(SHIFT_LABEL).filter(k=>k!=='none').map(k => `<option value="${k}">${SHIFT_LABEL[k]}</option>`).join('');
  $('#cycle-type').value = state.cycleStartType || '';
  renderAll();

  // Навигация
  $('#prev-month').onclick = () => { state.month--; if(state.month<0){state.month=11; state.year--;} renderAll(); saveState(); };
  $('#next-month').onclick = () => { state.month++; if(state.month>11){state.month=0; state.year++;} renderAll(); saveState(); };
  sel.onchange = e => { state.position = e.target.value; renderAll(); saveState(); };
  $('.mode-btn[data-mode="schedule"]').onclick = () => setMode('schedule');
  $('.mode-btn[data-mode="manual"]').onclick = () => setMode('manual');
  
  // Ввод данных
  $('#manual-hours').oninput = e => { getMonthData(state.year, state.month).manualHours = e.target.value; renderSalary(); saveState(); };
  $('#ktu-input').oninput = e => { getMonthData(state.year, state.month).ktu = e.target.value; renderSalary(); saveState(); };
  $('#cycle-start').oninput = e => { state.cycleStartDate = e.target.value; };
  $('#cycle-type').onchange = e => { state.cycleStartType = e.target.value; };
  $('#btn-apply-cycle').onclick = () => { renderCalendar(); saveState(); };
  $('#btn-clear-month').onclick = () => { if(confirm('Очистить правки?')) { getMonthData(state.year, state.month).cells = {}; renderAll(); saveState(); } };

  // Модальное окно
  $('#calendar-grid').onclick = e => {
    const dayEl = e.target.closest('.day-cell');
    if(!dayEl || dayEl.classList.contains('empty')) return;
    openModal(parseInt(dayEl.dataset.day));
  };
  $('#btn-cancel-day').onclick = () => $('#day-modal').classList.add('hidden');
  $('#day-modal').onclick = e => { if(e.target.id==='day-modal') $('#day-modal').classList.add('hidden'); };
  $('#btn-save-day').onclick = () => { saveDayData(); $('#day-modal').classList.add('hidden'); renderAll(); };
  $('#adj-minus').onclick = () => { $('#adj-hours').value = Math.max(0, (parseFloat($('#adj-hours').value)||0) - 0.5); };
  $('#adj-plus').onclick = () => { $('#adj-hours').value = Math.min(24, (parseFloat($('#adj-hours').value)||0) + 0.5); };

  // Экспорт
  $('#btn-export').onclick = () => downloadFile(exportMonthToCSV(state.year, state.month, state.position), `schedule-${state.year}-${state.month+1}.csv`);
  $('#btn-backup').onclick = exportBackup;
  $('#btn-restore').onclick = () => { const inp = document.createElement('input'); inp.type='file'; inp.accept='.json'; inp.onchange = e => { const f = e.target.files[0]; const r = new FileReader(); r.onload = () => importBackup(r.result); r.readAsText(f); }; inp.click(); };

  // Настройки
  $('#toggle-settings').onclick = () => { $('#settings-panel').classList.toggle('open'); $('#toggle-settings .chevron').classList.toggle('open'); };
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  renderCalendar(); saveState();
}

function openModal(day) {
  modalDay = day;
  const md = getMonthData(state.year, state.month);
  const ck = cellKey(state.year, state.month, day);
  const cell = md.cells[ck] || { type: autoShift(state.position, state.year, state.month, day) || 'none', hours: null, extraDur: '12', note: '' };
  $('#modal-title').textContent = `Редактирование смены`;
  $('#modal-date').textContent = `${day} ${MONTH_NAMES_GEN[state.month]} ${state.year}`;
  $('#shift-grid').innerHTML = Object.keys(SHIFT_LABEL).filter(k=>k!=='none').map(k => `<button class="shift-btn ${SHIFT_CLASS[k]} ${cell.type===k?'active':''}" data-type="${k}"><div class="shift-btn-label">${SHIFT_LABEL[k]}</div></button>`).join('');
  $('#adj-hours').value = cell.hours !== null ? cell.hours : shiftHours(state.position, cell.type, cell.extraDur);
  $('#day-note').value = cell.note || '';
  $('#extra-dur-section').style.display = (state.position && POSITIONS[state.position]?.dayTimeCustom || cell.type === 'extra') ? 'block' : 'none';
  $('#day-modal').classList.remove('hidden');

  // Обработчики внутри модалки
  document.querySelectorAll('.shift-btn').forEach(b => b.onclick = () => { document.querySelectorAll('.shift-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); cell.type = b.dataset.type; $('#adj-hours').value = shiftHours(state.position, cell.type, cell.extraDur); $('#extra-dur-section').style.display = (cell.type==='extra'||POSITIONS[state.position]?.dayTimeCustom)?'block':'none'; });
  document.querySelectorAll('.extra-dur-btn').forEach(b => b.onclick = () => { document.querySelectorAll('.extra-dur-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); cell.extraDur = b.dataset.dur; $('#adj-hours').value = shiftHours(state.position, 'extra', cell.extraDur); });
}

function saveDayData() {
  const md = getMonthData(state.year, state.month);
  const ck = cellKey(state.year, state.month, modalDay);
  const activeBtn = document.querySelector('.shift-btn.active');
  md.cells[ck] = {
    type: activeBtn?.dataset.type || 'none',
    hours: parseFloat($('#adj-hours').value) || 0,
    extraDur: document.querySelector('.extra-dur-btn.active')?.dataset.dur || '12',
    note: $('#day-note').value.trim()
  };
  saveState();
}

// === БЛОК 9: ТЕМА, PWA И IOS БАННЕР ===
function initTheme() {
  const stored = localStorage.getItem('zp_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let theme = stored || (prefersDark ? 'dark' : 'light');
  applyTheme(theme);
  $('#theme-toggle').onclick = () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('zp_theme', next);
  };
  $('#theme-toggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}
function applyTheme(theme) { document.documentElement.setAttribute('data-theme', theme); }

function initPWA() {
  // Блок установки (Android/Chrome)
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferredPrompt = e;
    // Можно добавить кнопку "Установить" в интерфейс, если нужно
  });

  // Баннер для iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  if (isIOS && !isStandalone && !localStorage.getItem('zp_ios_dismissed')) {
    $('#ios-banner').classList.remove('hidden');
    $('#ios-close').onclick = () => { $('#ios-banner').classList.add('hidden'); localStorage.setItem('zp_ios_dismissed', '1'); };
  }
}

// Запуск
document.addEventListener('DOMContentLoaded', () => { init(); initTheme(); initPWA(); });