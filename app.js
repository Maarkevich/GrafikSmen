// ─── КОНФИГ ДОЛЖНОСТЕЙ (МЕНЯТЬ ТОЛЬКО ЗДЕСЬ) ───────────────────────────────
export const POSITIONS = {
  'РТС': {
    salary: 33850, hoursPerShift: 11, shiftHours: 12,
    cycleType: 'cyclic', cycle: ['day','day','off','off'],
    dayTimeWD: '11:00', dayTimeWE: '09:00',
    hasNight: false, hasSleep: false, is5x2: false
  },
  'Прессовщик': {
    salary: 33850, hoursPerShift: 11, shiftHours: 12,
    cycleType: 'cyclic', cycle: ['day','day','off','off'],
    dayTimeWD: '11:00', dayTimeWE: '09:00',
    hasNight: false, hasSleep: false, is5x2: false
  },
  'Водитель склад': {
    salary: 34500, hoursPerShift: 8, shiftHours: 9,
    cycleType: '5x2',
    hasNight: false, hasSleep: false, is5x2: true
  },
  'Водитель смена': {
    salary: 34500, hoursPerShift: 11, shiftHours: 12,
    cycleType: 'cyclic', cycle: ['day','day','off','off'],
    dayTimeWD: '11:00', dayTimeWE: '09:00',
    hasNight: false, hasSleep: false, is5x2: false
  },
  'Разнорабочий': {
    salary: 33850, hoursPerShift: 8, shiftHours: 9,
    cycleType: '5x2',
    hasNight: false, hasSleep: false, is5x2: true
  },
  'Упаковщик': {
    salary: 33850, hoursPerShift: 11, shiftHours: 12,
    cycleType: 'cyclic', cycle: ['day','day','off','off'],
    dayTimeCustom: true,
    hasNight: false, hasSleep: false, is5x2: false
  },
  'Диспетчер': {
    salary: 34500, hoursPerShift: 11, shiftHours: 12,
    cycleType: 'cyclic', cycle: ['day','day','off','off'],
    dayTimeWD: '11:00', dayTimeWE: '09:00',
    hasNight: false, hasSleep: false, is5x2: false
  },
  'Начальник смены': {
    salary: 37500, hoursPerShift: 11, shiftHours: 12,
    cycleType: 'cyclic', cycle: ['day','day','off','off','night','night','off','off'],
    dayTimeWD: '11:00', dayTimeWE: '09:00',
    nightTimeWD: '23:00', nightTimeWE: '21:00',
    hasNight: true, hasSleep: false, is5x2: false
  },
  'Мельник': {
    salary: 33850, hoursPerShift: 11, shiftHours: 12,
    cycleType: 'cyclic', cycle: ['day','day','off','off','night','night','off','off'],
    dayTimeWD: '11:00', dayTimeWE: '09:00',
    nightTimeWD: '23:00', nightTimeWE: '21:00',
    hasNight: true, hasSleep: false, is5x2: false
  },
  'Автоклавщик': {
    salary: 33850, hoursPerShift: 11, shiftHours: 12,
    cycleType: 'cyclic', cycle: ['day','night','sleep','off'],
    dayTime: '09:00', nightTime: '21:00',
    hasNight: true, hasSleep: true, is5x2: false
  }
};

export const SHIFT_LABEL = { day:'День', night:'Ночь', sleep:'Отсыпной', off:'Выходной', extra:'Доп.', none:'' };
export const SHIFT_CLASS = { day:'shift-day', night:'shift-night', sleep:'shift-sleep', off:'shift-off', extra:'shift-extra', none:'shift-none' };
export const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
export const MONTH_NAMES_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
export const DAY_NAMES_LONG = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
export const DAY_NAMES_HEADER = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

const STORAGE_KEY = 'zp_calc_v3';
export const NORM_HOURS = 165;

// ─── STATE ───────────────────────────────────────────────────────────────────
export const state = {
  position: '',
  mode: 'schedule',
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  cycleStartDate: '',
  cycleStartType: '',
  months: {}
};

// ─── УТИЛИТЫ ─────────────────────────────────────────────────────────────────
export function sanitizeNumber(input, min, max, step = 1) {
  if (input === '' || input === null || input === undefined) return null;
  let val = parseFloat(String(input).replace(',', '.'));
  if (isNaN(val)) return null;
  val = Math.round(val / step) * step;
  return Math.min(max, Math.max(min, val));
}

export function safeSave(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError') console.warn('⚠️ localStorage переполнен');
    return false;
  }
}

export function safeLoad(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

export function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function cellKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function monthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export function isWeekend(date) {
  const dow = date.getDay();
  return dow === 0 || dow === 6;
}

// ─── ЛОГИКА ГРАФИКА И РАСЧЁТОВ ───────────────────────────────────────────────
export function autoShift(position, year, month, day) {
  if (!position || !state.cycleStartDate || !state.cycleStartType) return null;
  const cfg = POSITIONS[position];
  if (!cfg) return null;
  if (cfg.is5x2) {
    const dow = new Date(year, month, day).getDay();
    return (dow === 0 || dow === 6) ? 'off' : 'day';
  }
  if (cfg.cycleType === 'cyclic') {
    const cycle = cfg.cycle;
    const startIdx = cycle.indexOf(state.cycleStartType);
    if (startIdx === -1) return null;
    const diff = Math.round((new Date(year, month, day) - new Date(state.cycleStartDate)) / 86400000);
    return cycle[((startIdx + diff) % cycle.length + cycle.length) % cycle.length];
  }
  return null;
}

export function shiftHours(position, type, extraDur) {
  if (!position) return 0;
  const cfg = POSITIONS[position];
  if (!cfg) return 0;
  switch(type) {
    case 'day': case 'night': return cfg.hoursPerShift;
    case 'extra': return extraDur === '9' ? 8 : 11;
    default: return 0;
  }
}

export function monthStats(position, year, month) {
  if (!position) return { hours: 0, workDays: 0, nights: 0 };
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const md = getMonthData(year, month);
  let hours = 0, workDays = 0, nights = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const ck = cellKey(year, month, d);
    let type, h;
    if (md.cells[ck]) {
      const cell = md.cells[ck];
      type = cell.type;
      h = (cell.hours !== null && cell.hours !== undefined) ? cell.hours : shiftHours(position, type, cell.extraDur);
    } else {
      type = autoShift(position, year, month, d) || 'none';
      h = shiftHours(position, type, null);
    }
    if (type !== 'off' && type !== 'sleep' && type !== 'none') { workDays++; hours += h; }
    if (type === 'night') nights++;
  }
  return { hours, workDays, nights };
}

export function calculateSalary({ baseSalary, hours, normHours = NORM_HOURS, ktu = 1 }) {
  if (!baseSalary || !hours || hours <= 0) return null;
  return Math.round(baseSalary * ktu / normHours * hours);
}

export function getMonthData(year, month) {
  const key = monthKey(year, month);
  if (!state.months[key]) state.months[key] = { ktu: null, manualHours: null, cells: {} };
  return state.months[key];
}

export function loadState() {
  const loaded = safeLoad(STORAGE_KEY);
  if (loaded) Object.assign(state, loaded);
}

export function saveState() {
  safeSave(STORAGE_KEY, state);
}

// ─── ЭКСПОРТ / ИМПОРТ ────────────────────────────────────────────────────────
export function exportMonthToCSV(year, month, position) {
  const md = getMonthData(year, month);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rows = [['Дата', 'День недели', 'Смена', 'Часы (зачёт)', 'Заметка']];
  for (let d = 1; d <= daysInMonth; d++) {
    const ck = cellKey(year, month, d);
    const date = new Date(year, month, d);
    const dow = DAY_NAMES_LONG[date.getDay()];
    let type, hours, note;
    if (md.cells[ck]) {
      const cell = md.cells[ck];
      type = SHIFT_LABEL[cell.type] || cell.type;
      hours = (cell.hours !== null && cell.hours !== undefined) ? cell.hours : shiftHours(position, cell.type, cell.extraDur);
      note = cell.note || '';
    } else {
      type = SHIFT_LABEL[autoShift(position, year, month, d) || 'none'];
      hours = shiftHours(position, autoShift(position, year, month, d) || 'none', null);
      note = '';
    }
    rows.push([`${d}.${String(month+1).padStart(2,'0')}.${year}`, dow, type, hours, note.replace(/,/g, ';')]);
  }
  const stats = monthStats(position, year, month);
  rows.push([], ['ИТОГО', '', '', stats.hours, `раб.дней: ${stats.workDays}, ночных: ${stats.nights}`]);
  return '\ufeff' + rows.map(r => r.join(',')).join('\n');
}

export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportBackup() {
  downloadFile(JSON.stringify({ version: '1.0', exportedAt: new Date().toISOString(), state }, null, 2), `zp-backup-${new Date().toISOString().slice(0,10)}.json`, 'application/json');
}

export function importBackup(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.state || !parsed.state.months) throw new Error('Неверный формат');
    if (!parsed.state.mode) parsed.state.mode = 'schedule';
    Object.assign(state, parsed.state);
    saveState();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export function formatRubles(amount) {
  return `${amount.toLocaleString('ru-RU')} ₽`;
}