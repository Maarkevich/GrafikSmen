/* ===== VERSION ===== */
const APP_VERSION = '7.0';

/* ===== CONSTANTS ===== */
const STORAGE_KEY = 'grafik_full_v6';

const POSITIONS_DEFAULT = {
  'РТС':            { salary: 33850, hours: 11, cycle: ['day','day','off','off'], type: 'cycle' },
  'Прессовщик':     { salary: 33850, hours: 11, cycle: ['day','day','off','off'], type: 'cycle' },
  'Водитель склад': { salary: 34500, hours: 8,  type: '5x2' },
  'Водитель смена': { salary: 34500, hours: 11, cycle: ['day','day','off','off'], type: 'cycle' },
  'Разнорабочий':   { salary: 33850, hours: 8,  type: '5x2' },
  'Упаковщик':      { salary: 33850, hours: 11, cycle: ['day','day','off','off'], type: 'cycle' },
  'Диспетчер':      { salary: 34500, hours: 11, cycle: ['day','day','off','off'], type: 'cycle' },
  'Начальник смены':{ salary: 37500, hours: 11, cycle: ['day','day','off','off','night','night','off','off'], type: 'cycle' },
  'Мельник':        { salary: 33850, hours: 11, cycle: ['day','day','off','off','night','night','off','off'], type: 'cycle' },
  'Автоклавщик':    { salary: 33850, hours: 11, cycle: ['day','night','sleep','off'], type: 'cycle' }
};

const SHIFT_LABEL = {
  day:   'День',
  night: 'Ночь',
  sleep: 'Отсыпной',
  off:   'Выходной',
  extra: 'Доп.'
};

/* ===== STATE ===== */
let state = {
  position: '',
  positions: {},
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  cycleStartDate: '',
  cycleStartType: '',
  ktu: 1,
  months: {} // key: 'y-m-d' -> { type, hours, note }
};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

/* ===== STORAGE ===== */
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function load() {
  const d = localStorage.getItem(STORAGE_KEY);
  if (d) {
    try { state = Object.assign(state, JSON.parse(d)); } catch (e) {}
  }
}

/* ===== INIT ===== */
function init() {
  load();

  if (!state.positions || Object.keys(state.positions).length === 0) {
    state.positions = JSON.parse(JSON.stringify(POSITIONS_DEFAULT));
  }

  fillPositions();
  initTheme();
  bindUI();
  renderAll();

  $('#app-version').textContent = 'v' + APP_VERSION;

  // PWA install prompt
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    $('#btn-install').classList.remove('hidden');
  });
  $('#btn-install').onclick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    $('#btn-install').classList.add('hidden');
  };
}

/* ===== POSITIONS ===== */
function fillPositions() {
  const sel = $('#position-select');

  sel.innerHTML =
    '<option value="">Выберите должность</option>' +
    Object.keys(state.positions)
      .map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');

  sel.value = state.position;

  sel.onchange = e => {
    state.position = e.target.value;
    renderAll();
    save();
  };
}

function renderPositionsList() {
  const list = $('#positions-list');
  const names = Object.keys(state.positions);

  if (names.length === 0) {
    list.innerHTML = '<div class="row-label" style="text-align:center;padding:14px;">Нет должностей</div>';
    return;
  }

  list.innerHTML = names.map(name => {
    const p = state.positions[name];
    const meta = p.type === '5x2'
      ? `5/2 · ${p.hours} ч · ${p.salary} ₽`
      : `Цикл ${p.cycle.length} дн · ${p.hours} ч · ${p.salary} ₽`;
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
}

/* ===== POSITION MODAL ===== */
let editingPosition = null;
let draftCycle = [];
let draftType = 'cycle';

function openPositionModal(name) {
  editingPosition = name;
  const p = name ? state.positions[name] : null;

  $('#position-modal-title').textContent = name ? 'Редактирование' : 'Новая должность';
  $('#pos-name').value = name || '';
  $('#pos-salary').value = p ? p.salary : '';
  $('#pos-hours').value = p ? p.hours : 11;

  draftType = p ? p.type : 'cycle';
  draftCycle = (p && p.cycle) ? p.cycle.slice() : [];

  applyDraftType();
  renderCyclePreview();

  $('#btn-delete-position').style.display = name ? '' : 'none';
  $('#position-modal').classList.remove('hidden');
}

function applyDraftType() {
  $$('#position-modal .mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pt === draftType);
  });
  $('#cycle-editor-block').style.display = draftType === 'cycle' ? '' : 'none';
}

function renderCyclePreview() {
  const wrap = $('#cycle-preview');
  if (draftCycle.length === 0) {
    wrap.innerHTML = '<span class="row-label">Добавьте смены ниже</span>';
    return;
  }
  wrap.innerHTML = draftCycle.map((t, i) =>
    `<span class="cycle-chip" data-t="${t}" data-i="${i}">${SHIFT_LABEL[t]} <span class="x">×</span></span>`
  ).join('');
  wrap.querySelectorAll('.cycle-chip').forEach(chip => {
    chip.onclick = () => {
      draftCycle.splice(+chip.dataset.i, 1);
      renderCyclePreview();
    };
  });
}

function bindPositionModal() {
  $('#position-modal').addEventListener('click', e => {
    if (e.target.id === 'position-modal') $('#position-modal').classList.add('hidden');
  });

  $$('#position-modal .mode-btn').forEach(btn => {
    btn.onclick = () => {
      draftType = btn.dataset.pt;
      applyDraftType();
    };
  });

  $$('.add-shift-btn').forEach(btn => {
    btn.onclick = () => {
      draftCycle.push(btn.dataset.add);
      renderCyclePreview();
    };
  });

  $('#btn-cycle-clear').onclick = () => {
    draftCycle = [];
    renderCyclePreview();
  };

  $('#btn-cancel-position').onclick = () => {
    $('#position-modal').classList.add('hidden');
  };

  $('#btn-delete-position').onclick = () => {
    if (!editingPosition) return;
    if (!confirm(`Удалить «${editingPosition}»?`)) return;
    delete state.positions[editingPosition];
    if (state.position === editingPosition) state.position = '';
    save();
    fillPositions();
    renderPositionsList();
    renderAll();
    $('#position-modal').classList.add('hidden');
  };

  $('#btn-save-position').onclick = () => {
    const name = $('#pos-name').value.trim();
    const salary = +$('#pos-salary').value || 0;
    const hours = +$('#pos-hours').value || 0;

    if (!name) { alert('Введите название'); return; }
    if (draftType === 'cycle' && draftCycle.length === 0) {
      alert('Добавьте хотя бы одну смену в цикл');
      return;
    }

    // если переименовали — удалить старую
    if (editingPosition && editingPosition !== name) {
      delete state.positions[editingPosition];
      if (state.position === editingPosition) state.position = name;
    }

    const obj = { salary, hours, type: draftType };
    if (draftType === 'cycle') obj.cycle = draftCycle.slice();
    state.positions[name] = obj;

    save();
    fillPositions();
    renderPositionsList();
    renderAll();
    $('#position-modal').classList.add('hidden');
  };
}

/* ===== SHIFT CALC (логика без изменений) ===== */
function getShiftAuto(y, m, d) {
  const pos = state.positions[state.position];
  if (!pos) return null;

  if (pos.type === '5x2') {
    const dow = new Date(y, m, d).getDay();
    return (dow === 0 || dow === 6) ? 'off' : 'day';
  }

  if (!state.cycleStartDate || !state.cycleStartType) return null;

  const start = new Date(state.cycleStartDate);
  const current = new Date(y, m, d);

  const diff = Math.floor((current - start) / 86400000);

  const idx = pos.cycle.indexOf(state.cycleStartType);
  if (idx === -1) return null;

  const len = pos.cycle.length;
  return pos.cycle[((idx + diff) % len + len) % len];
}

function getDayInfo(y, m, d) {
  const key = `${y}-${m}-${d}`;
  const override = state.months[key];
  const auto = getShiftAuto(y, m, d);
  const type = (override && override.type) ? override.type : auto;
  const pos = state.positions[state.position];
  const defaultHours = pos ? pos.hours : 0;
  let hours = override && override.hours != null ? +override.hours : null;
  if (hours == null) {
    hours = (type === 'day' || type === 'night' || type === 'extra') ? defaultHours : 0;
  }
  return {
    type,
    hours,
    note: override ? (override.note || '') : '',
    overridden: !!override
  };
}

/* ===== CALENDAR ===== */
function renderCalendar(direction) {
  const grid = $('#calendar-grid');

  grid.classList.remove('slide-left', 'slide-right');
  void grid.offsetWidth;
  if (direction === 'next') grid.classList.add('slide-left');
  else if (direction === 'prev') grid.classList.add('slide-right');

  const monthName = new Date(state.year, state.month)
    .toLocaleString('ru', { month: 'long', year: 'numeric' });

  $('#month-name').textContent = monthName;

  const firstDay = new Date(state.year, state.month, 1).getDay() || 7;
  const days = new Date(state.year, state.month + 1, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === state.year && today.getMonth() === state.month;

  let html = '';
  for (let i = 1; i < firstDay; i++) html += '<div></div>';

  for (let d = 1; d <= days; d++) {
    const info = getDayInfo(state.year, state.month, d);
    const cls = info.type ? `shift-${info.type}` : '';
    const todayCls = isCurrentMonth && today.getDate() === d ? 'today' : '';
    const noteCls = info.note ? 'has-note' : '';
    html += `<div class="day-cell ${cls} ${todayCls} ${noteCls}" data-day="${d}">${d}</div>`;
  }
  grid.innerHTML = html;
}

/* ===== STATS & SALARY ===== */
function getStats() {
  const days = new Date(state.year, state.month + 1, 0).getDate();
  let workdays = 0, hours = 0, nights = 0;
  for (let d = 1; d <= days; d++) {
    const info = getDayInfo(state.year, state.month, d);
    if (!info.type || info.type === 'off' || info.type === 'sleep') continue;
    workdays++;
    hours += info.hours || 0;
    if (info.type === 'night') nights++;
  }
  return { workdays, hours, nights };
}

function getNormHours(y, m) {
  // примерная норма: рабочие дни 5/2 × 8 (упрощённо)
  const days = new Date(y, m + 1, 0).getDate();
  let n = 0;
  for (let d = 1; d <= days; d++) {
    const dow = new Date(y, m, d).getDay();
    if (dow !== 0 && dow !== 6) n++;
  }
  return n * 8;
}

function renderSalary() {
  const pos = state.positions[state.position];
  if (!pos) {
    $('#calc-salary').textContent = '—';
    $('#calc-norm').textContent = '—';
    $('#salary-total').textContent = '0 ₽';
    return;
  }

  const stats = getStats();
  const norm = getNormHours(state.year, state.month);
  const ktu = +($('#ktu-input').value || 1) || 1;

  $('#calc-salary').textContent = pos.salary.toLocaleString('ru') + ' ₽';
  $('#calc-norm').textContent = norm + ' ч';

  // Зарплата = (оклад / норма) × отработанные часы × КТУ
  const total = norm > 0 ? Math.round(pos.salary / norm * stats.hours * ktu) : 0;
  $('#salary-total').textContent = total.toLocaleString('ru') + ' ₽';
}

function renderStats() {
  const s = getStats();
  $('#stat-workdays').textContent = s.workdays;
  $('#stat-hours').textContent = s.hours;
  $('#stat-nights').textContent = s.nights;
}

/* ===== NAV ===== */
function prevMonth() {
  state.month--;
  if (state.month < 0) { state.month = 11; state.year--; }
  renderAll('prev');
  save();
}
function nextMonth() {
  state.month++;
  if (state.month > 11) { state.month = 0; state.year++; }
  renderAll('next');
  save();
}

/* ===== SETTINGS PANEL ===== */
function bindCollapsible(toggleSel, panelSel) {
  const t = $(toggleSel), p = $(panelSel);
  t.onclick = () => {
    const open = p.classList.toggle('open');
    t.classList.toggle('open', open);
  };
}

function bindSettings() {
  bindCollapsible('#toggle-settings', '#settings-panel');
  bindCollapsible('#toggle-positions', '#positions-panel');
  bindCollapsible('#toggle-theme', '#theme-panel');

  $('#cycle-start').oninput = e => { state.cycleStartDate = e.target.value; };

  // визуальные кнопки выбора типа стартовой смены
  $$('#cycle-type-buttons .shift-btn').forEach(btn => {
    btn.onclick = () => {
      $$('#cycle-type-buttons .shift-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.cycleStartType = btn.dataset.type;
    };
  });

  $('#btn-apply-cycle').onclick = () => { renderAll(); save(); };

  $('#btn-clear-month').onclick = () => {
    if (confirm('Очистить ручные правки этого месяца?')) {
      const y = state.year, m = state.month;
      const days = new Date(y, m + 1, 0).getDate();
      for (let d = 1; d <= days; d++) delete state.months[`${y}-${m}-${d}`];
      renderAll();
      save();
    }
  };

  $('#btn-add-position').onclick = () => openPositionModal(null);
}

function syncSettingsInputs() {
  $('#cycle-start').value = state.cycleStartDate || '';
  $$('#cycle-type-buttons .shift-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.type === state.cycleStartType);
  });
  $('#ktu-input').value = state.ktu != null ? state.ktu : 1;
}

/* ===== DAY MODAL ===== */
let modalDay = null;
let modalType = null;

function openModal(day) {
  modalDay = day;
  const info = getDayInfo(state.year, state.month, day);
  modalType = info.type;

  const dateStr = new Date(state.year, state.month, day)
    .toLocaleDateString('ru', { day: 'numeric', month: 'long', weekday: 'long' });
  $('#modal-date').textContent = dateStr;

  $('#day-hours').value = info.overridden && info.hours != null ? info.hours : '';
  $('#day-note').value = info.note || '';

  $$('#day-modal .shift-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === modalType);
  });

  $('#day-modal').classList.remove('hidden');
}

function bindDayModal() {
  $('#day-modal').addEventListener('click', e => {
    if (e.target.id === 'day-modal') $('#day-modal').classList.add('hidden');
  });

  $$('#day-modal .shift-btn').forEach(btn => {
    btn.onclick = () => {
      modalType = btn.dataset.type;
      $$('#day-modal .shift-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
  });

  $('#btn-save-day').onclick = () => {
    if (!modalDay) return;
    const key = `${state.year}-${state.month}-${modalDay}`;
    const hoursVal = $('#day-hours').value.trim();
    state.months[key] = {
      type: modalType,
      hours: hoursVal === '' ? null : +hoursVal,
      note: $('#day-note').value.trim()
    };
    $('#day-modal').classList.add('hidden');
    renderAll();
    save();
  };

  $('#btn-reset-day').onclick = () => {
    if (!modalDay) return;
    delete state.months[`${state.year}-${state.month}-${modalDay}`];
    $('#day-modal').classList.add('hidden');
    renderAll();
    save();
  };

  $('#btn-cancel-day').onclick = () => {
    $('#day-modal').classList.add('hidden');
  };
}

/* ===== THEME ===== */
const THEME_PRESETS = {
  light: ['blue','green','peach','lavender'],
  dark:  ['blue','purple','green','rose']
};

function initTheme() {
  const t = localStorage.getItem('theme') || 'dark';
  const a = localStorage.getItem('accent') || 'blue';
  applyTheme(t, a);

  $$('.theme-tile').forEach(btn => {
    btn.onclick = () => applyTheme(btn.dataset.theme, btn.dataset.accent);
  });

  $$('.mode-btn[data-mode]').forEach(btn => {
    btn.onclick = () => {
      const mode = btn.dataset.mode;
      const presets = THEME_PRESETS[mode];
      const cur = localStorage.getItem('accent') || 'blue';
      const next = presets.includes(cur) ? cur : presets[0];
      applyTheme(mode, next);
    };
  });

  $('#theme-toggle').onclick = () => {
    const cur = document.documentElement.dataset.theme;
    const next = cur === 'dark' ? 'light' : 'dark';
    const presets = THEME_PRESETS[next];
    const accCur = localStorage.getItem('accent') || 'blue';
    const acc = presets.includes(accCur) ? accCur : presets[0];
    applyTheme(next, acc);
  };
}

function applyTheme(t, a) {
  document.documentElement.dataset.theme = t;
  document.documentElement.dataset.accent = a;

  localStorage.setItem('theme', t);
  localStorage.setItem('accent', a);

  $('#theme-toggle').textContent = t === 'dark' ? '🌙' : '☀️';

  // обновить активные тайлы
  $$('.theme-tile').forEach(btn => {
    btn.classList.toggle('active',
      btn.dataset.theme === t && btn.dataset.accent === a);
  });
  $$('.mode-btn[data-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === t);
  });

  // Theme-color для статусбара
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const colors = {
      'dark-blue': '#0b1228', 'dark-purple': '#160a30', 'dark-green': '#061a14', 'dark-rose': '#200818',
      'light-blue': '#cfe4ff', 'light-green': '#c7f0d8', 'light-peach': '#ffd9b8', 'light-lavender': '#e0d0ff'
    };
    meta.content = colors[`${t}-${a}`] || '#0f172a';
  }
}

/* ===== EXPORT / BACKUP ===== */
function exportCSV() {
  const pos = state.positions[state.position];
  if (!pos) { alert('Сначала выберите должность'); return; }

  const days = new Date(state.year, state.month + 1, 0).getDate();
  const lines = ['Дата;Тип;Часы;Заметка'];
  for (let d = 1; d <= days; d++) {
    const info = getDayInfo(state.year, state.month, d);
    const date = `${String(d).padStart(2,'0')}.${String(state.month+1).padStart(2,'0')}.${state.year}`;
    const type = info.type ? SHIFT_LABEL[info.type] : '';
    const note = (info.note || '').replace(/[;\n\r]/g, ' ');
    lines.push(`${date};${type};${info.hours || 0};${note}`);
  }
  const monthName = new Date(state.year, state.month).toLocaleString('ru', { month: 'long', year: 'numeric' });
  downloadFile(`grafik-${state.year}-${String(state.month+1).padStart(2,'0')}.csv`,
    '\uFEFF' + lines.join('\n'), 'text/csv;charset=utf-8;');
}

function backup() {
  const data = JSON.stringify(state, null, 2);
  const ts = new Date().toISOString().slice(0, 10);
  downloadFile(`grafik-backup-${ts}.json`, data, 'application/json');
}

function restore(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data || typeof data !== 'object') throw new Error('bad');
      if (!confirm('Заменить все данные?')) return;
      state = Object.assign(state, data);
      save();
      fillPositions();
      renderPositionsList();
      syncSettingsInputs();
      renderAll();
      alert('Данные восстановлены');
    } catch (err) {
      alert('Ошибка чтения файла');
    }
  };
  reader.readAsText(file);
}

function downloadFile(name, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
      if (dx < 0) nextMonth(); else prevMonth();
    }
  }, { passive: true });
}

/* ===== UI ===== */
function bindUI() {
  $('#prev-month').onclick = prevMonth;
  $('#next-month').onclick = nextMonth;

  $('#calendar-grid').onclick = e => {
    const cell = e.target.closest('.day-cell');
    if (cell && cell.dataset.day) openModal(+cell.dataset.day);
  };

  $('#ktu-input').oninput = e => {
    state.ktu = +e.target.value || 1;
    renderSalary();
    save();
  };

  $('#btn-export').onclick = exportCSV;
  $('#btn-backup').onclick = backup;
  $('#btn-restore').onclick = () => $('#restore-file').click();
  $('#restore-file').onchange = e => {
    if (e.target.files[0]) restore(e.target.files[0]);
    e.target.value = '';
  };

  bindSettings();
  bindDayModal();
  bindPositionModal();
  bindSwipe();
  syncSettingsInputs();
}

/* ===== RENDER ===== */
function renderAll(direction) {
  renderCalendar(direction);
  renderStats();
  renderSalary();
  renderPositionsList();
}

/* ===== UTIL ===== */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}

/* ===== START ===== */
document.addEventListener('DOMContentLoaded', init);
