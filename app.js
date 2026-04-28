const calendarEl = document.getElementById('calendar');
const todayBtn = document.getElementById('todayBtn');

let data = JSON.parse(localStorage.getItem('grafik')) || {};

function generateCalendar() {
  calendarEl.innerHTML = '';

  const daysInMonth = new Date().getDate() + 30; // простой вариант

  for (let i = 1; i <= 31; i++) {
    const day = document.createElement('div');
    day.className = 'day';
    day.textContent = i;

    if (data[i] === 'work') day.classList.add('active');
    if (data[i] === 'off') day.classList.add('off');

    day.onclick = () => {
      navigator.vibrate?.(30);

      if (!data[i]) data[i] = 'work';
      else if (data[i] === 'work') data[i] = 'off';
      else delete data[i];

      save();
      generateCalendar();
    };

    calendarEl.appendChild(day);
  }
}

function save() {
  localStorage.setItem('grafik', JSON.stringify(data));
}

todayBtn.onclick = () => {
  const today = new Date().getDate();
  alert('Сегодня: ' + today);
};

// Проверка PWA режима
const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
if (isStandalone) {
  console.log('Запущено как приложение');
}

generateCalendar();