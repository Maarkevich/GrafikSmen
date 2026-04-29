/* ===== VERSION ===== */
const APP_VERSION = '4.0';

/* ===== CONSTANTS ===== */
const POSITIONS_DEFAULT = {
  'РТС':            { salary: 33850, hoursPerShift: 11, shiftHours: 12, cycleType: 'cyclic', cycle: ['day','day','off','off'], hasNight: false, hasSleep: false, is5x2: false },
  'Прессовщик':     { salary: 33850, hoursPerShift: 11, shiftHours: 12, cycleType: 'cyclic', cycle: ['day','day','off','off'], hasNight: false, hasSleep: false, is5x2: false },
  'Водитель склад': { salary: 34500, hoursPerShift: 8,  shiftHours: 9,  cycleType: '5x2',     hasNight: false, hasSleep: false, is5x2: true  },
  'Водитель смена': { salary: 34500, hoursPerShift: 11, shiftHours: 12, cycleType: 'cyclic', cycle: ['day','day','off','off'], hasNight: false, hasSleep: false, is5x2: false },
  'Разнорабочий':   { salary: 33850, hoursPerShift: 8,  shiftHours: 9,  cycleType: '5x2',     hasNight: false, hasSleep: false, is5x2: true  },
  'Упаковщик':      { salary: 33850, hoursPerShift: 11, shiftHours: 12, cycleType: 'cyclic', cycle: ['day','day','off','off'], dayTimeCustom: true, hasNight: false, hasSleep: false, is5x2: false },
  'Диспетчер':      { salary: 34500, hoursPerShift: 11, shiftHours: 12, cycleType: 'cyclic', cycle: ['day','day','off','off'], hasNight: false, hasSleep: false, is5x2: false },
  'Начальник смены':{ salary: 37500, hoursPerShift: 11, shiftHours: 12, cycleType: 'cyclic', cycle: ['day','day','off','off','night','night','off','off'], hasNight: true, hasSleep: false, is5x2: false },
  'Мельник':        { salary: 33850, hoursPerShift: 11, shiftHours: 12, cycleType: 'cyclic', cycle: ['day','day','off','off','night','night','off','off'], hasNight: true, hasSleep: false, is5x2: false },
  'Автоклавщик':    { salary: 33850, hoursPerShift: 11, shiftHours: 12, cycleType: 'cyclic', cycle: ['day','night','sleep','off'], hasNight: true, hasSleep: true, is5x2: false }
};

/* словарь должностей: live = state.positions || POSITIONS_DEFAULT */
let POSITIONS = JSON.parse(JSON.stringify(POSITIONS_DEFAULT));

const SHIFT_LABEL  = { day:'День', night:'Ночь', sleep:'Отсыпной', off:'Выходной', extra:'Доп.', none:'' };
const SHIFT_CLASS  = { day:'shift-day', night:'shift-night', sleep:'shift-sleep', off:'shift-off', extra:'shift-extra', none:'shift-none' };
const MONTH_NAMES  = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DAY_NAMES_HEADER = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const NORM_HOURS   = 165;
const STORAGE_KEY  = 'zp_calc_v3';
const THEME_KEY    = 'zp_theme';
const ACCENT_KEY   = 'zp_accent';

/* ===== STATE ===== */
const state = {
  position: '',
  mode: 'schedule',
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  cycleStartDate: '',
  cycleStartType: '',
  positions: null,        // null = use defaults; объект — кастомизировано
  months: {}
};

/* ===== HELPERS ===== */
const $  = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);
const safeLoad = (key, fb = null) => { try { return JSON.parse(localStorage.getItem(key)) || fb; } catch { return fb; } };
const safeSave = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)); } catch {} };
const cellKey  = (y, m, d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const monthKey = (y, m)    => `${y}-${String(m+1).padStart(2,'0')}`;
const getMonthData = (y, m) => {
  const k = monthKey(y, m);
  if (!state.months[k]) state.months[k] = { ktu: null, cells: {} };
  return state.months[k];
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}

/* ===== ЛОГИКА (НЕ МЕНЯЕМ) ===== */
const autoShift = (pos, y, m, d) => {
  const cfg = POSITIONS[pos];
  if (!pos || !state.cycleStartDate || !state.cycleStartType || !cfg) return null;
  if (cfg.is5x2) {
    const dow = new Date(y, m, d).getDay();
    return (dow === 0 || dow === 6) ? 'off' : 'day';
  }
  const cycle = cfg.cycle;
  const startIdx = cycle.indexOf(state.cycleStartType);
  if (startIdx === -1) return null;
  const diff = Math.round((new Date(y, m, d) - new Date(state.cycleStartDate)) / 86400000);
  return cycle[((startIdx + diff) % cycle.length + cycle.length) % cycle.length];
};

const shiftHours = (pos, type, extraDur) => {
  const cfg = POSITIONS[pos];
  if (!cfg) return 0;
  if (type === 'day' || type === 'night') return cfg.hoursPerShift;
  if (type === 'extra') return extraDur === '9' ? 8 : 11;
  return 0;
};

const monthStats = (pos, y, m) => {
  if (!pos) return { hours: 0, workDays: 0, nights: 0 };
  const md = getMonthData(y, m);
  let hours = 0, workDays = 0, nights = 0;
  const days = new Date(y, m + 1, 0).getDate();
  for (let d = 1; d <= days; d++) {
    const ck = cellKey(y, m, d);
    const cell = md.cells[ck];
    const type = cell?.type || autoShift(pos, y, m, d) || 'none';
    const h = cell?.hours ?? shiftHours(pos, type, cell?.extraDur);
    if (!['off', 'sleep', 'none'].includes(type)) { workDays++; hours += h; }
    if (type === 'night') nights++;
  }
  return { hours, workDays, nights };
};

const calculateSalary = ({ baseSalary, hours, normHours = NORM_HOURS, ktu = 1 }) =>
  (baseSalary && hours > 0) ? Math.round(baseSalary * ktu / normHours * hours) : null;

const formatRubles = (a) => `${a.toLocaleString('ru-RU')} ₽`;

/* ===== RENDER ===== */
const renderCalendar = (direction) => {
  $('#month-name').textContent = `${MONTH_NAMES[state.month]} ${state.year}`;

  const grid = $('#calendar-grid');
  grid.classList.remove('slide-left', 'slide-right');
  void grid.offsetWidth;
  if (direction === 'next') grid.classList.add('slide-left');
  else if (direction === 'prev') grid.classList.add('slide-right');

  let html = DAY_NAMES_HEADER.map(d => `<div class="day-header">${d}</div>`).join('');

  const offset = (new Date(state.year, state.month, 1).getDay() || 7) - 1;
  for (let i = 0; i < offset; i++) html += `<div class="day-cell empty"></div>`;

  const days = new Date(state.year, state.month + 1, 0).getDate();
  const today = new Date();
  for (let d = 1; d <= days; d++) {
    const ck = cellKey(state.year, state.month, d);
    const md = getMonthData(state.year, state.month);
    const auto = autoShift(state.position, state.year, state.month, d);
    const cell = md.cells[ck];
    const type = cell?.type || auto || 'none';
    const label = cell?.note ? '📝' : SHIFT_LABEL[type];
    const isToday = d === today.getDate() && state.month === today.getMonth() && state.year === today.getFullYear();
    html += `<div class="day-cell ${SHIFT_CLASS[type]} ${isToday ? 'today' : ''}" data-day="${d}">
      <span class="day-num">${d}</span>
      <span class="day-label">${label || ''}</span>
    </div>`;
  }
  grid.innerHTML = html;
};

const renderLegend = () => {
  const items = [
    ['day', 'День'], ['night', 'Ночь'], ['sleep', 'Отсыпной'],
    ['off', 'Выходной'], ['extra', 'Доп.']
  ];
  $('#legend').innerHTML = items.map(([k, l]) =>
    `<span class="legend-item ${SHIFT_CLASS[k]}">${l}</span>`
  ).join('');
};

const renderStats = () => {
  const s = monthStats(state.position, state.year, state.month);
  $('#stat-workdays').textContent = s.workDays;
  $('#stat-hours').textContent = s.hours;
  $('#stat-nights').textContent = s.nights;
};

const renderSalary = () => {
  const pos = POSITIONS[state.position];
  $('#calc-salary').textContent = pos ? formatRubles(pos.salary) : '—';
  $('#calc-norm').textContent = `${NORM_HOURS} ч`;
  const stats = monthStats(state.position, state.year, state.month);
  $('#calc-auto-hours').textContent = stats.hours;
  const ktu = parseFloat($('#ktu-input').value) || 1;
  const res = pos ? calculateSalary({ baseSalary: pos.salary, hours: stats.hours, normHours: NORM_HOURS, ktu }) : null;
  $('#salary-total').textContent = res ? formatRubles(res) : '0 ₽';
  $('#salary-formula').textContent = res ? `Оклад × КТУ / ${NORM_HOURS} × ${stats.hours} ч` : '';
};

const renderPositionSelect = () => {
  const sel = $('#position-select');
  sel.innerHTML = '<option value="">— Выберите должность —</option>' +
    Object.keys(POSITIONS).map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
  sel.value = state.position || '';
};

const renderPositionsList = () => {
  const list = $('#positions-list');
  const names = Object.keys(POSITIONS);
  if (names.length === 0) {
    list.innerHTML = '<div class="calc-row-label" style="text-align:center;padding:14px;">Нет должностей</div>';
    return;
  }
  list.innerHTML = names.map(name => {
    const p = POSITIONS[name];
    const meta = p.is5x2
      ? `5/2 · ${p.hoursPerShift} ч · ${p.salary.toLocaleString('ru-RU')} ₽`
      : `Цикл ${p.cycle?.length || 0} дн · ${p.hoursPerShift} ч · ${p.salary.toLocaleString('ru-RU')} ₽`;
    return `
      <div class="position-row">
        <div class="pos-info">
          <span class="pos-name">${escapeHtml(name)}</span>
          <span class="pos-meta">${meta}</span>
        </div>
        <button class="pos-edit" data-edit="${escapeHtml(name)}">Изменить</button>
      </div>
    `;
  }).join('');
  list.querySelectorAll('.pos-edit').forEach(btn => {
    btn.onclick = () => openPositionModal(btn.dataset.edit);
  });
};

const updateInputsToMonth = () => {
  const md = getMonthData(state.year, state.month);
  $('#ktu-input').value = md.ktu ?? 1;
};

/* ===== POSITIONS PERSIST ===== */
const persistPositions = () => {
  state.positions = JSON.parse(JSON.stringify(POSITIONS));
  safeSave(STORAGE_KEY, state);
};

/* ===== POSITION MODAL ===== */
let editingPosition = null;
let draftCycle = [];
let draftType = 'cyclic';

function openPositionModal(name) {
  editingPosition = name;
  const p = name ? POSITIONS[name] : null;

  $('#position-modal-title').textContent = name ? 'Редактирование' : 'Новая должность';
  $('#pos-name').value   = name || '';
  $('#pos-salary').value = p ? p.salary : '';
  $('#pos-hours').value  = p ? p.hoursPerShift : 11;

  draftType  = p ? (p.is5x2 ? '5x2' : 'cyclic') : 'cyclic';
  draftCycle = (p && p.cycle) ? p.cycle.slice() : [];

  applyDraftType();
  renderCyclePreview();

  $('#btn-delete-position').style.display = name ? '' : 'none';
  $('#position-modal').classList.remove('hidden');
}

function applyDraftType() {
  $$('.pos-type-btn').forEach(b => b.classList.toggle('active', b.dataset.pt === draftType));
  $('#cycle-editor-block').style.display = draftType === 'cyclic' ? '' : 'none';
}

function renderCyclePreview() {
  const wrap = $('#cycle-preview');
  if (draftCycle.length === 0) {
    wrap.innerHTML = '<span style="color:var(--text-muted);font-size:12px;">Добавьте смены ниже</span>';
    return;
  }
  wrap.innerHTML = draftCycle.map((t, i) =>
    `<span class="cycle-chip" data-t="${t}" data-i="${i}">${SHIFT_LABEL[t]} <span class="x">×</span></span>`
  ).join('');
  wrap.querySelectorAll('.cycle-chip').forEach(chip => {
    chip.onclick = () => { draftCycle.splice(+chip.dataset.i, 1); renderCyclePreview(); };
  });
}

function bindPositionModal() {
  $('#position-modal').addEventListener('click', e => {
    if (e.target.id === 'position-modal') $('#position-modal').classList.add('hidden');
  });
  $$('.pos-type-btn').forEach(btn => {
    btn.onclick = () => { draftType = btn.dataset.pt; applyDraftType(); };
  });
  $$('.add-shift-btn').forEach(btn => {
    btn.onclick = () => { draftCycle.push(btn.dataset.add); renderCyclePreview(); };
  });
  $('#btn-cycle-clear').onclick = () => { draftCycle = []; renderCyclePreview(); };
  $('#btn-cancel-position').onclick = () => $('#position-modal').classList.add('hidden');

  $('#btn-delete-position').onclick = () => {
    if (!editingPosition) return;
    if (!confirm(`Удалить «${editingPosition}»?`)) return;
    delete POSITIONS[editingPosition];
    if (state.position === editingPosition) state.position = '';
    persistPositions();
    renderPositionSelect();
    renderPositionsList();
    renderAll();
    $('#position-modal').classList.add('hidden');
  };

  $('#btn-save-position').onclick = () => {
    const name   = $('#pos-name').value.trim();
    const salary = +$('#pos-salary').value || 0;
    const hours  = +$('#pos-hours').value  || 0;
    if (!name) { alert('Введите название'); return; }
    if (draftType === 'cyclic' && draftCycle.length === 0) {
      alert('Добавьте хотя бы одну смену в цикл'); return;
    }

    if (editingPosition && editingPosition !== name) {
      delete POSITIONS[editingPosition];
      if (state.position === editingPosition) state.position = name;
    }

    const obj = {
      salary,
      hoursPerShift: hours,
      shiftHours: hours + 1,
      is5x2: draftType === '5x2',
      cycleType: draftType,
      hasNight: draftType === 'cyclic' ? draftCycle.includes('night') : false,
      hasSleep: draftType === 'cyclic' ? draftCycle.includes('sleep') : false
    };
    if (draftType === 'cyclic') obj.cycle = draftCycle.slice();
    POSITIONS[name] = obj;

    persistPositions();
    renderPositionSelect();
    renderPositionsList();
    renderAll();
    $('#position-modal').classList.add('hidden');
  };
}

/* ===== DAY MODAL ===== */
let modalDay = null;
let modalShiftType = null;

function openModal(day) {
  modalDay = day;
  const md = getMonthData(state.year, state.month);
  const ck = cellKey(state.year, state.month, day);
  const auto = autoShift(state.position, state.year, state.month, day) || 'none';
  const cell = md.cells[ck] || { type: auto, hours: null, extraDur: '12', note: '' };
  modalShiftType = cell.type;

  $('#modal-title').textContent = 'Редактирование смены';
  $('#modal-date').textContent = `${day} ${MONTH_NAMES[state.month].toLowerCase()} ${state.year}`;

  // 5 цветных кнопок
  $('#shift-grid').innerHTML = ['day','night','sleep','off','extra'].map(k =>
    `<button class="shift-btn ${SHIFT_CLASS[k]} ${cell.type === k ? 'active' : ''}" data-type="${k}">${SHIFT_LABEL[k]}</button>`
  ).join('');

  $('#adj-hours').value = cell.hours ?? shiftHours(state.position, cell.type, cell.extraDur);
  $('#day-note').value  = cell.note || '';
  $('#day-modal').classList.remove('hidden');

  $('#shift-grid').querySelectorAll('.shift-btn').forEach(b => {
    b.onclick = () => {
      $('#shift-grid').querySelectorAll('.shift-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      modalShiftType = b.dataset.type;
      $('#adj-hours').value = shiftHours(state.position, modalShiftType, cell.extraDur);
    };
  });
}

function saveDayData() {
  const md = getMonthData(state.year, state.month);
  const ck = cellKey(state.year, state.month, modalDay);
  md.cells[ck] = {
    type: modalShiftType || 'none',
    hours: parseFloat($('#adj-hours').value) || 0,
    note: $('#day-note').value.trim()
  };
}

/* ===== CYCLE TYPE BUTTONS (вместо select) ===== */
function bindCycleTypeButtons() {
  $$('#cycle-type-buttons .shift-btn').forEach(btn => {
    btn.onclick = () => {
      $$('#cycle-type-buttons .shift-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.cycleStartType = btn.dataset.type;
    };
  });
}
function syncCycleTypeButtons() {
  $$('#cycle-type-buttons .shift-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.type === state.cycleStartType)
  );
}

/* ===== COLLAPSIBLE ===== */
function bindCollapsible(toggleSel, panelSel) {
  const t = $(toggleSel), p = $(panelSel);
  t.onclick = () => {
    const open = p.classList.toggle('open');
    t.classList.toggle('open', open);
  };
}

/* ===== THEME ===== */
const THEME_PRESETS = {
  light: ['blue', 'green', 'peach', 'lavender'],
  dark:  ['blue', 'purple', 'green', 'rose']
};

function applyTheme(t, a) {
  document.documentElement.setAttribute('data-theme', t);
  document.documentElement.setAttribute('data-accent', a);
  safeSave(THEME_KEY, t);
  safeSave(ACCENT_KEY, a);
  $('#theme-toggle').textContent = t === 'dark' ? '☀️' : '🌙';

  $$('.theme-tile').forEach(b =>
    b.classList.toggle('active', b.dataset.theme === t && b.dataset.accent === a)
  );
  $$('.mode-sw-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.mode === t)
  );

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const colors = {
      'dark-blue':'#0b1228','dark-purple':'#160a30','dark-green':'#061a14','dark-rose':'#200818',
      'light-blue':'#cfe4ff','light-green':'#c7f0d8','light-peach':'#ffd9b8','light-lavender':'#e0d0ff'
    };
    meta.content = colors[`${t}-${a}`] || '#0b1228';
  }
}

function initTheme() {
  let t = safeLoad(THEME_KEY) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  let a = safeLoad(ACCENT_KEY) || 'blue';
  if (typeof t !== 'string') t = 'dark';
  if (typeof a !== 'string') a = 'blue';
  applyTheme(t, a);

  $$('.theme-tile').forEach(b => {
    b.onclick = () => applyTheme(b.dataset.theme, b.dataset.accent);
  });
  $$('.mode-sw-btn').forEach(b => {
    b.onclick = () => {
      const mode = b.dataset.mode;
      const presets = THEME_PRESETS[mode];
      const cur = safeLoad(ACCENT_KEY) || 'blue';
      const acc = presets.includes(cur) ? cur : presets[0];
      applyTheme(mode, acc);
    };
  });
  $('#theme-toggle').onclick = () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    const presets = THEME_PRESETS[next];
    const accCur = safeLoad(ACCENT_KEY) || 'blue';
    const acc = presets.includes(accCur) ? accCur : presets[0];
    applyTheme(next, acc);
  };
}

/* ===== SWIPE ===== */
function bindSwipe() {
  const grid = $('#calendar-grid');
  let startX = 0, startY = 0, tracking = false;
  grid.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });
  grid.addEventListener('touchend', e => {
    if (!tracking) return;
    tracking = false;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      if (dx < 0) goNext(); else goPrev();
    }
  }, { passive: true });
}

function goPrev() {
  state.month--;
  if (state.month < 0) { state.month = 11; state.year--; }
  updateInputsToMonth();
  renderAll('prev');
  safeSave(STORAGE_KEY, state);
}
function goNext() {
  state.month++;
  if (state.month > 11) { state.month = 0; state.year++; }
  updateInputsToMonth();
  renderAll('next');
  safeSave(STORAGE_KEY, state);
}

/* ===== PWA install ===== */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = $('#btn-install');
  if (btn) {
    btn.classList.remove('hidden');
    btn.onclick = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      btn.classList.add('hidden');
    };
  }
});
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  $('#btn-install')?.classList.add('hidden');
});

/* ===== INIT ===== */
const init = () => {
  const loaded = safeLoad(STORAGE_KEY);
  if (loaded) Object.assign(state, loaded);

  // если в state есть кастомные должности — используем их
  if (state.positions && typeof state.positions === 'object' && Object.keys(state.positions).length > 0) {
    POSITIONS = JSON.parse(JSON.stringify(state.positions));
  } else {
    POSITIONS = JSON.parse(JSON.stringify(POSITIONS_DEFAULT));
  }

  $('#app-version').textContent = `v${APP_VERSION}`;

  renderPositionSelect();
  renderPositionsList();
  renderLegend();

  $('#cycle-start').value = state.cycleStartDate || '';
  syncCycleTypeButtons();
  updateInputsToMonth();
  renderCalendar();
  renderStats();
  renderSalary();

  /* === события === */
  $('#prev-month').onclick = goPrev;
  $('#next-month').onclick = goNext;

  $('#position-select').onchange = e => {
    state.position = e.target.value;
    updateInputsToMonth();
    renderAll();
    safeSave(STORAGE_KEY, state);
  };

  $('#ktu-input').oninput = e => {
    getMonthData(state.year, state.month).ktu = e.target.value;
    renderSalary();
    safeSave(STORAGE_KEY, state);
  };

  $('#cycle-start').oninput = e => { state.cycleStartDate = e.target.value; };
  bindCycleTypeButtons();

  $('#btn-apply-cycle').onclick = () => {
    renderCalendar();
    renderStats();
    renderSalary();
    safeSave(STORAGE_KEY, state);
  };
  $('#btn-clear-month').onclick = () => {
    if (confirm('Очистить ручные правки месяца?')) {
      getMonthData(state.year, state.month).cells = {};
      renderAll();
      safeSave(STORAGE_KEY, state);
    }
  };

  bindCollapsible('#toggle-settings', '#settings-panel');
  bindCollapsible('#toggle-positions', '#positions-panel');
  bindCollapsible('#toggle-theme', '#theme-panel');

  $('#btn-add-position').onclick = () => openPositionModal(null);
  bindPositionModal();

  $('#calendar-grid').onclick = e => {
    const cell = e.target.closest('.day-cell');
    if (cell && cell.dataset.day && !cell.classList.contains('empty')) openModal(+cell.dataset.day);
  };
  $('#btn-cancel-day').onclick = () => $('#day-modal').classList.add('hidden');
  $('#day-modal').onclick = e => { if (e.target.id === 'day-modal') $('#day-modal').classList.add('hidden'); };
  $('#btn-save-day').onclick = () => {
    saveDayData();
    $('#day-modal').classList.add('hidden');
    renderAll();
    safeSave(STORAGE_KEY, state);
  };
  $('#adj-minus').onclick = () => { $('#adj-hours').value = Math.max(0,  (parseFloat($('#adj-hours').value) || 0) - 0.5); };
  $('#adj-plus').onclick  = () => { $('#adj-hours').value = Math.min(24, (parseFloat($('#adj-hours').value) || 0) + 0.5); };

  /* === Экспорт CSV === */
  $('#btn-export').onclick = () => {
    const rows = [['Дата','Смена','Часы']];
    Object.entries(state.months).forEach(([mk, m]) => {
      Object.entries(m.cells).forEach(([date, c]) => rows.push([date, c.type, c.hours]));
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'schedule.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* === Бэкап === */
  $('#btn-backup').onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `zp-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* === Восстановить === */
  $('#btn-restore').onclick = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json';
    inp.onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          Object.assign(state, JSON.parse(r.result));
          if (state.positions && Object.keys(state.positions).length > 0) {
            POSITIONS = JSON.parse(JSON.stringify(state.positions));
          }
          renderPositionSelect();
          renderPositionsList();
          updateInputsToMonth();
          syncCycleTypeButtons();
          $('#cycle-start').value = state.cycleStartDate || '';
          renderAll();
          safeSave(STORAGE_KEY, state);
          alert('Данные восстановлены');
        } catch {
          alert('Ошибка файла');
        }
      };
      r.readAsText(f);
    };
    inp.click();
  };

  initTheme();
  bindSwipe();

  /* === iOS install banner === */
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isIOS && !isStandalone && !localStorage.getItem('zp_ios_dismissed')) {
    $('#ios-banner').classList.add('show');
    $('#ios-close').onclick = () => {
      $('#ios-banner').classList.remove('show');
      localStorage.setItem('zp_ios_dismissed', '1');
    };
  }
};

function renderAll(direction) {
  renderCalendar(direction);
  renderStats();
  renderSalary();
  renderPositionsList();
}

document.addEventListener('DOMContentLoaded', init);
