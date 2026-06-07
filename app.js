// App Configuration
const START_HOUR = 12;
const END_HOUR = 22;
const HOURS_COUNT = END_HOUR - START_HOUR;
const HOUR_HEIGHT = 80; // Must match CSS --hour-height

// State variables
let state = {
  currentDate: new Date(), // Represents the viewed week or month
  lessons: [],
  students: [],
  selectedStudentFilter: 'all',
  theme: 'light',
  currentView: 'month', // 'week' or 'month'
  selectedDates: [], // Array of YYYY-MM-DD strings for batch creation
  miniCalendarDate: new Date() // Month currently displayed in modal mini calendar
};

// DOM Elements
const prevBtn = document.getElementById('prevBtn');
const todayBtn = document.getElementById('todayBtn');
const nextBtn = document.getElementById('nextBtn');
const currentPeriodLabel = document.getElementById('currentPeriodLabel');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');
const manageStudentsBtn = document.getElementById('manageStudentsBtn');
const addLessonBtn = document.getElementById('addLessonBtn');
const studentFilter = document.getElementById('studentFilter');
const resetDemoDataBtn = document.getElementById('resetDemoDataBtn');

const viewWeekBtn = document.getElementById('viewWeekBtn');
const viewMonthBtn = document.getElementById('viewMonthBtn');
const weekViewPanel = document.getElementById('weekViewPanel');
const monthViewPanel = document.getElementById('monthViewPanel');
const monthDaysGrid = document.getElementById('monthDaysGrid');

const calendarHeader = document.getElementById('calendarHeader');
const timeAxisCol = document.getElementById('timeAxisCol');
const dayColumnsContainer = document.getElementById('dayColumnsContainer');
const toastContainer = document.getElementById('toastContainer');

// Modals
const lessonModal = document.getElementById('lessonModal');
const lessonForm = document.getElementById('lessonForm');
const lessonIdInput = document.getElementById('lessonId');
const lessonStudentInput = document.getElementById('lessonStudent');
const lessonDateInput = document.getElementById('lessonDate');
const lessonStartTimeInput = document.getElementById('lessonStartTime');
const lessonDurationInputs = document.getElementsByName('lessonDuration');
const lessonEndTimeShow = document.getElementById('lessonEndTimeShow');
const lessonColorInputs = document.getElementsByName('lessonColor');
const lessonMemoInput = document.getElementById('lessonMemo');
const deleteLessonBtn = document.getElementById('deleteLessonBtn');
const cancelLessonModalBtn = document.getElementById('cancelLessonModalBtn');
const closeLessonModalBtn = document.getElementById('closeLessonModalBtn');

const singleDateGroup = document.getElementById('singleDateGroup');
const multiDateGroup = document.getElementById('multiDateGroup');
const prevMiniMonthBtn = document.getElementById('prevMiniMonthBtn');
const nextMiniMonthBtn = document.getElementById('nextMiniMonthBtn');
const miniMonthLabel = document.getElementById('miniMonthLabel');
const miniCalendarGrid = document.getElementById('miniCalendarGrid');
const selectedDatesDisplay = document.getElementById('selectedDatesDisplay');

const studentModal = document.getElementById('studentModal');
const studentList = document.getElementById('studentList');
const newStudentNameInput = document.getElementById('newStudentName');
const saveNewStudentBtn = document.getElementById('saveNewStudentBtn');
const closeStudentModalBtn = document.getElementById('closeStudentModalBtn');
const closeStudentModalFooterBtn = document.getElementById('closeStudentModalFooterBtn');

// Helper: Parse time string "HH:MM" to minutes from 00:00
function parseTimeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper: Format minutes from 00:00 to "HH:MM"
function formatMinutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Helper: Get Start of Week (Sunday) for a given date
function getStartOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = date.getDate() - day; // diff to Sunday
  const start = new Date(date.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
}

// Helper: Format Date object to "YYYY-MM-DD" in local time zone
function formatDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Generate UUID for students/lessons
function generateUUID() {
  return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
}

// Initialize Application
function init() {
  // Load State from LocalStorage
  loadStateFromStorage();

  // Draw static grids
  renderTimeAxis();

  // Render Dynamic Calendar
  updateCalendar();

  // Populate Student lists in forms
  updateStudentDropdowns();

  // Populate Start Time dropdown options
  populateStartTimeDropdown();

  // Setup Live Time Line
  setInterval(updateCurrentTimeIndicator, 60000); // Update every minute
  updateCurrentTimeIndicator();

  // Setup Event Listeners
  setupEventListeners();
  
  // Set CSS property for hours count
  document.documentElement.style.setProperty('--hours-count', HOURS_COUNT);
}

// Default lessons from user request (June 2026)
function getDefaultLessons() {
  return [
    // 6月4日 (木)
    { id: 'ls-0604-1', studentId: 'st-5', studentName: '清村 優子', date: '2026-06-04', startTime: '16:30', duration: 120, endTime: '18:30', color: 'rose', memo: '' },
    { id: 'ls-0604-2', studentId: 'st-6', studentName: '内山 光莉', date: '2026-06-04', startTime: '19:00', duration: 60, endTime: '20:00', color: 'blue', memo: '' },
    { id: 'ls-0604-3', studentId: 'st-7', studentName: '徳丸 幸樹', date: '2026-06-04', startTime: '21:00', duration: 60, endTime: '22:00', color: 'purple', memo: '' },
    
    // 6月10日 (水)
    { id: 'ls-0610-1', studentId: 'st-5', studentName: '清村 優子', date: '2026-06-10', startTime: '16:30', duration: 120, endTime: '18:30', color: 'rose', memo: '' },
    { id: 'ls-0610-2', studentId: 'st-6', studentName: '内山 光莉', date: '2026-06-10', startTime: '19:00', duration: 60, endTime: '20:00', color: 'blue', memo: '' },
    { id: 'ls-0610-3', studentId: 'st-7', studentName: '徳丸 幸樹', date: '2026-06-10', startTime: '21:00', duration: 60, endTime: '22:00', color: 'purple', memo: '' },
    
    // 6月13日 (土)
    { id: 'ls-0613-1', studentId: 'st-8', studentName: '永井 桔平', date: '2026-06-13', startTime: '14:00', duration: 60, endTime: '15:00', color: 'green', memo: '' },
    { id: 'ls-0613-2', studentId: 'st-1', studentName: '平山 美晴', date: '2026-06-13', startTime: '15:00', duration: 60, endTime: '16:00', color: 'blue', memo: '' },
    { id: 'ls-0613-3', studentId: 'st-2', studentName: '山中 泰成', date: '2026-06-13', startTime: '16:00', duration: 90, endTime: '17:30', color: 'green', memo: '' },
    { id: 'ls-0613-4', studentId: 'st-3', studentName: '杉本 守', date: '2026-06-13', startTime: '18:00', duration: 90, endTime: '19:30', color: 'purple', memo: '' },
    { id: 'ls-0613-5', studentId: 'st-4', studentName: '松本 泰吾', date: '2026-06-13', startTime: '20:00', duration: 60, endTime: '21:00', color: 'orange', memo: '' },
    
    // 6月18日 (木)
    { id: 'ls-0618-1', studentId: 'st-5', studentName: '清村 優子', date: '2026-06-18', startTime: '16:30', duration: 120, endTime: '18:30', color: 'rose', memo: '' },
    { id: 'ls-0618-2', studentId: 'st-6', studentName: '内山 光莉', date: '2026-06-18', startTime: '19:00', duration: 60, endTime: '20:00', color: 'blue', memo: '' },
    { id: 'ls-0618-3', studentId: 'st-7', studentName: '徳丸 幸樹', date: '2026-06-18', startTime: '21:00', duration: 60, endTime: '22:00', color: 'purple', memo: '' },
    
    // 6月20日 (土)
    { id: 'ls-0620-1', studentId: 'st-8', studentName: '永井 桔平', date: '2026-06-20', startTime: '14:00', duration: 60, endTime: '15:00', color: 'green', memo: '' },
    { id: 'ls-0620-2', studentId: 'st-1', studentName: '平山 美晴', date: '2026-06-20', startTime: '15:00', duration: 60, endTime: '16:00', color: 'blue', memo: '' },
    { id: 'ls-0620-3', studentId: 'st-2', studentName: '山中 泰成', date: '2026-06-20', startTime: '16:00', duration: 90, endTime: '17:30', color: 'green', memo: '' },
    { id: 'ls-0620-4', studentId: 'st-3', studentName: '杉本 守', date: '2026-06-20', startTime: '18:00', duration: 90, endTime: '19:30', color: 'purple', memo: '' },
    { id: 'ls-0620-5', studentId: 'st-4', studentName: '松本 泰吾', date: '2026-06-20', startTime: '20:00', duration: 60, endTime: '21:00', color: 'orange', memo: '' },
    
    // 6月25日 (木)
    { id: 'ls-0625-1', studentId: 'st-5', studentName: '清村 優子', date: '2026-06-25', startTime: '16:30', duration: 120, endTime: '18:30', color: 'rose', memo: '' },
    { id: 'ls-0625-2', studentId: 'st-6', studentName: '内山 光莉', date: '2026-06-25', startTime: '19:00', duration: 60, endTime: '20:00', color: 'blue', memo: '' },
    { id: 'ls-0625-3', studentId: 'st-7', studentName: '徳丸 幸樹', date: '2026-06-25', startTime: '21:00', duration: 60, endTime: '22:00', color: 'purple', memo: '' },
    
    // 6月27日 (土)
    { id: 'ls-0627-1', studentId: 'st-8', studentName: '永井 桔平', date: '2026-06-27', startTime: '14:00', duration: 60, endTime: '15:00', color: 'green', memo: '' },
    { id: 'ls-0627-2', studentId: 'st-1', studentName: '平山 美晴', date: '2026-06-27', startTime: '15:00', duration: 60, endTime: '16:00', color: 'blue', memo: '' },
    { id: 'ls-0627-3', studentId: 'st-2', studentName: '山中 泰成', date: '2026-06-27', startTime: '16:00', duration: 90, endTime: '17:30', color: 'green', memo: '' },
    { id: 'ls-0627-4', studentId: 'st-3', studentName: '杉本 守', date: '2026-06-27', startTime: '18:00', duration: 90, endTime: '19:30', color: 'purple', memo: '' },
    { id: 'ls-0627-5', studentId: 'st-4', studentName: '松本 泰吾', date: '2026-06-27', startTime: '20:00', duration: 60, endTime: '21:00', color: 'orange', memo: '' }
  ];
}

// Load from LocalStorage
function loadStateFromStorage() {
  const localLessons = localStorage.getItem('lesson_scheduler_lessons');
  const localStudents = localStorage.getItem('lesson_scheduler_students');
  const localTheme = localStorage.getItem('lesson_scheduler_theme');

  if (localLessons) {
    state.lessons = JSON.parse(localLessons);
  } else {
    state.lessons = getDefaultLessons();
    saveLessonsToStorage();
  }

  if (localStudents) {
    state.students = JSON.parse(localStudents);
  } else {
    // Initial standard student list
    state.students = [
      { id: 'st-1', name: '平山 美晴' },
      { id: 'st-2', name: '山中 泰成' },
      { id: 'st-3', name: '杉本 守' },
      { id: 'st-4', name: '松本 泰吾' },
      { id: 'st-5', name: '清村 優子' },
      { id: 'st-6', name: '内山 光莉' },
      { id: 'st-7', name: '徳丸 幸樹' },
      { id: 'st-8', name: '永井 桔平' }
    ];
    saveStudentsToStorage();
  }

  // Set Theme
  if (localTheme) {
    state.theme = localTheme;
  } else {
    // Default to system settings
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    state.theme = prefersDark ? 'dark' : 'light';
  }
  applyTheme();
}

function saveLessonsToStorage() {
  localStorage.setItem('lesson_scheduler_lessons', JSON.stringify(state.lessons));
}

function saveStudentsToStorage() {
  localStorage.setItem('lesson_scheduler_students', JSON.stringify(state.students));
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  // Toggle the icon path
  if (state.theme === 'dark') {
    themeIcon.innerHTML = `
      <!-- Sun Icon -->
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-11.314l.707.707m11.314 11.314l.707-.707M12 17a5 5 0 100-10 5 5 0 000 10z"/>
    `;
  } else {
    themeIcon.innerHTML = `
      <!-- Moon Icon -->
      <path class="moon-path" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
    `;
  }
}

// Generate Demo Data
function loadDemoData() {
  // Reset student list to the 8 names
  state.students = [
    { id: 'st-1', name: '平山 美晴' },
    { id: 'st-2', name: '山中 泰成' },
    { id: 'st-3', name: '杉本 守' },
    { id: 'st-4', name: '松本 泰吾' },
    { id: 'st-5', name: '清村 優子' },
    { id: 'st-6', name: '内山 光莉' },
    { id: 'st-7', name: '徳丸 幸樹' },
    { id: 'st-8', name: '永井 桔平' }
  ];
  saveStudentsToStorage();
  updateStudentDropdowns();

  // Load user request-defined lessons for June 2026
  state.lessons = getDefaultLessons();

  saveLessonsToStorage();
  updateCalendar();
  showToast('デモデータを読み込みました！');
}

// Render Time Axis Column
function renderTimeAxis() {
  timeAxisCol.innerHTML = '';
  for (let i = START_HOUR; i <= END_HOUR; i++) {
    const cell = document.createElement('div');
    cell.className = 'time-axis-cell';
    
    const label = document.createElement('span');
    label.className = 'time-label';
    label.textContent = `${String(i).padStart(2, '0')}:00`;
    
    cell.appendChild(label);
    timeAxisCol.appendChild(cell);
  }
}

// Router to update calendar based on current view
function updateCalendar() {
  if (state.currentView === 'week') {
    weekViewPanel.style.display = 'flex';
    monthViewPanel.style.display = 'none';
    updateCalendarWeek();
  } else {
    weekViewPanel.style.display = 'none';
    monthViewPanel.style.display = 'flex';
    updateCalendarMonth();
  }
}

// Render Calendar Month Grid and Lesson Badges based on viewed month
function updateCalendarMonth() {
  const date = state.currentDate;
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed

  // 1. Update Navigation Label (e.g., "2026年 6月")
  currentPeriodLabel.textContent = `${year}年 ${month + 1}月`;

  // 2. Clear Month Days Grid
  monthDaysGrid.innerHTML = '';

  // 3. Calculate start of grid (Sunday of the week containing the 1st of the month)
  const firstDayOfMonth = new Date(year, month, 1);
  let startOffset = firstDayOfMonth.getDay(); // 0 for Sun, 1 for Mon...

  const startDate = new Date(year, month, 1 - startOffset);
  const todayStr = formatDateString(new Date());

  // Render 42 days (6 weeks * 7 columns)
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(startDate);
    cellDate.setDate(startDate.getDate() + i);
    const dateStr = formatDateString(cellDate);
    const isToday = dateStr === todayStr;
    const isCurrentMonth = cellDate.getMonth() === month;

    const cell = document.createElement('div');
    cell.className = `month-day-cell ${isToday ? 'is-today' : ''} ${!isCurrentMonth ? 'other-month' : ''}`;
    
    // Day header (date number)
    const header = document.createElement('div');
    header.className = 'month-day-header';
    
    const numberSpan = document.createElement('span');
    numberSpan.className = 'month-day-number';
    numberSpan.textContent = cellDate.getDate();
    
    header.appendChild(numberSpan);
    cell.appendChild(header);

    // List container for lessons
    const lessonsList = document.createElement('div');
    lessonsList.className = 'month-lessons-list';

    // Filter lessons for this day
    const filteredLessons = state.lessons.filter(lesson => {
      const isCorrectDate = lesson.date === dateStr;
      const passesFilter = state.selectedStudentFilter === 'all' || lesson.studentId === state.selectedStudentFilter;
      return isCorrectDate && passesFilter;
    });

    // Sort lessons by start time
    filteredLessons.sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

    // Render lessons inside cell as full cards (month-mode)
    filteredLessons.forEach(lesson => {
      const card = createLessonCardElement(lesson, true);
      lessonsList.appendChild(card);
    });

    cell.appendChild(lessonsList);

    // Add cell click listener to create lesson
    cell.addEventListener('click', (e) => {
      // Ignore click if user clicked a lesson card
      if (e.target.closest('.lesson-card')) return;
      openLessonModalForCreate(dateStr, '16:00');
    });

    monthDaysGrid.appendChild(cell);
  }
}

// Render Calendar Header and Columns based on viewed week
function updateCalendarWeek() {
  const startOfWeek = getStartOfWeek(state.currentDate);
  const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];

  // 1. Update Navigation Label
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  
  const startYear = startOfWeek.getFullYear();
  const startMonth = startOfWeek.getMonth() + 1;
  const startDateVal = startOfWeek.getDate();
  
  const endYear = endOfWeek.getFullYear();
  const endMonth = endOfWeek.getMonth() + 1;
  const endDateVal = endOfWeek.getDate();
  
  let labelText = `${startYear}年 ${startMonth}月 ${startDateVal}日 〜 `;
  if (startYear !== endYear) {
    labelText += `${endYear}年 ${endMonth}月 ${endDateVal}日`;
  } else if (startMonth !== endMonth) {
    labelText += `${endMonth}月 ${endDateVal}日`;
  } else {
    labelText += `${endDateVal}日`;
  }
  currentPeriodLabel.textContent = labelText;

  // 2. Render Header Day Cells
  // Keep first child (time-zone-cell) and clear others
  const tzCell = calendarHeader.firstElementChild;
  calendarHeader.innerHTML = '';
  calendarHeader.appendChild(tzCell);

  const today = new Date();
  const todayStr = formatDateString(today);

  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(startOfWeek);
    currentDay.setDate(startOfWeek.getDate() + i);
    const dateStr = formatDateString(currentDay);
    const isToday = dateStr === todayStr;

    const headerCell = document.createElement('div');
    headerCell.className = `day-header-cell ${isToday ? 'is-today' : ''}`;
    // Day index: Monday is 1, Saturday is 6, Sunday is 0
    let dayIndex = currentDay.getDay();
    headerCell.setAttribute('data-day', dayIndex);

    const dayName = document.createElement('span');
    dayName.className = 'day-name';
    dayName.textContent = daysOfWeek[i];

    const dayNumber = document.createElement('span');
    dayNumber.className = 'day-number';
    dayNumber.textContent = currentDay.getDate();

    headerCell.appendChild(dayName);
    headerCell.appendChild(dayNumber);
    calendarHeader.appendChild(headerCell);
  }

  // 3. Render Columns and Lesson Cards
  dayColumnsContainer.innerHTML = '';

  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(startOfWeek);
    currentDay.setDate(startOfWeek.getDate() + i);
    const dateStr = formatDateString(currentDay);

    const col = document.createElement('div');
    col.className = 'day-column';
    col.setAttribute('data-date', dateStr);

    // Create a click catcher for the column
    col.addEventListener('click', (e) => {
      // Ignore click if user clicked a lesson card
      if (e.target.closest('.lesson-card')) return;
      
      // Calculate time slot clicked
      const rect = col.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const totalMinutes = (clickY / HOUR_HEIGHT) * 60;
      
      // Calculate hour and round to nearest 30 mins
      const startMinutes = START_HOUR * 60;
      const clickedMinutes = Math.round((startMinutes + totalMinutes) / 30) * 30;
      
      let hourVal = Math.floor(clickedMinutes / 60);
      let minVal = clickedMinutes % 60;
      
      // Limit latest start time to (END_HOUR - 1):00, so a minimum 60-min lesson ends on time
      if (hourVal === END_HOUR - 1 && minVal > 0) {
        minVal = 0;
      }
      
      if (hourVal >= START_HOUR && hourVal < END_HOUR) {
        const timeString = `${String(hourVal).padStart(2, '0')}:${String(minVal).padStart(2, '0')}`;
        openLessonModalForCreate(dateStr, timeString);
      }
    });

    // Render lessons inside this column
    const filteredLessons = state.lessons.filter(lesson => {
      const isCorrectDate = lesson.date === dateStr;
      const passesFilter = state.selectedStudentFilter === 'all' || lesson.studentId === state.selectedStudentFilter;
      return isCorrectDate && passesFilter;
    });

    // Sort lessons by start time for overlap calculation
    filteredLessons.sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

    // Overlap Calculation for side-by-side positioning
    filteredLessons.forEach((l1, index) => {
      let overlaps = false;
      filteredLessons.forEach((l2, j) => {
        if (index !== j) {
          const s1 = parseTimeToMinutes(l1.startTime);
          const e1 = s1 + l1.duration;
          const s2 = parseTimeToMinutes(l2.startTime);
          const e2 = s2 + l2.duration;
          // Check overlap
          if (s1 < e2 && s2 < e1) {
            overlaps = true;
            l1.overlapIndex = index < j ? 0 : 1; // 0 for left, 1 for right
          }
        }
      });
      if (!overlaps) l1.overlapIndex = -1;
    });

    // Append lesson cards
    filteredLessons.forEach(lesson => {
      const card = createLessonCardElement(lesson);
      col.appendChild(card);
    });

    dayColumnsContainer.appendChild(col);
  }

  // Update Indicator
  updateCurrentTimeIndicator();
}

// Create Lesson Card Element
function createLessonCardElement(lesson, isMonthMode = false) {
  const card = document.createElement('div');
  card.className = `lesson-card color-${lesson.color || 'blue'}`;
  
  if (isMonthMode) {
    card.classList.add('month-mode');
  } else {
    if (lesson.overlapIndex === 0) {
      card.classList.add('overlap-left');
    } else if (lesson.overlapIndex === 1) {
      card.classList.add('overlap-right');
    }

    // Position Calculation
    const calendarStartMinutes = START_HOUR * 60;
    const lessonStartMinutes = parseTimeToMinutes(lesson.startTime);
    const diffMinutes = lessonStartMinutes - calendarStartMinutes;
    
    const topPosition = (diffMinutes / 60) * HOUR_HEIGHT;
    const heightSize = (lesson.duration / 60) * HOUR_HEIGHT;

    card.style.top = `${topPosition}px`;
    card.style.height = `${heightSize}px`;
  }

  // HTML content
  const timeBox = document.createElement('div');
  timeBox.className = 'lesson-time';
  timeBox.innerHTML = `
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    <span>${lesson.startTime}〜${lesson.endTime}</span>
  `;

  const studentBox = document.createElement('div');
  studentBox.className = 'lesson-student';
  studentBox.textContent = lesson.studentName;

  const durationBadge = document.createElement('span');
  durationBadge.className = 'lesson-duration-badge';
  durationBadge.textContent = `${lesson.duration}分`;

  card.appendChild(timeBox);
  card.appendChild(studentBox);
  
  if (lesson.memo && (lesson.duration >= 90 || isMonthMode)) {
    const memoBox = document.createElement('div');
    memoBox.className = 'lesson-memo';
    memoBox.textContent = lesson.memo;
    card.appendChild(memoBox);
  }

  card.appendChild(durationBadge);

  // Edit on Click
  card.addEventListener('click', (e) => {
    e.stopPropagation(); // Avoid triggering column/cell click
    openLessonModalForEdit(lesson);
  });

  return card;
}

// Update Current Time Indicator (Red line)
function updateCurrentTimeIndicator() {
  // Remove existing indicator
  const existing = document.querySelector('.current-time-indicator');
  if (existing) {
    existing.remove();
  }

  const today = new Date();
  const todayStr = formatDateString(today);
  const todayColumn = document.querySelector(`.day-column[data-date="${todayStr}"]`);

  if (!todayColumn) return; // Not looking at standard current week

  const hours = today.getHours();
  const minutes = today.getMinutes();
  
  if (hours >= START_HOUR && hours < END_HOUR) {
    const currentMinutes = hours * 60 + minutes;
    const startMinutes = START_HOUR * 60;
    const diffMinutes = currentMinutes - startMinutes;
    const topPosition = (diffMinutes / 60) * HOUR_HEIGHT;

    const indicator = document.createElement('div');
    indicator.className = 'current-time-indicator';
    indicator.style.top = `${topPosition}px`;
    
    todayColumn.appendChild(indicator);
  }
}

// Dynamic Student Lists
function updateStudentDropdowns() {
  // 1. Sidebar Filter
  const currentFilterVal = studentFilter.value;
  studentFilter.innerHTML = '<option value="all">すべての生徒</option>';
  
  state.students.forEach(st => {
    const option = document.createElement('option');
    option.value = st.id;
    option.textContent = st.name;
    studentFilter.appendChild(option);
  });
  
  studentFilter.value = currentFilterVal || 'all';

  // 2. Modal Dropdown
  lessonStudentInput.innerHTML = '<option value="" disabled selected>生徒を選択してください</option>';
  state.students.forEach(st => {
    const option = document.createElement('option');
    option.value = st.id;
    option.textContent = st.name;
    lessonStudentInput.appendChild(option);
  });
}

// Dynamic Start Time List (30-minute increments within operating hours)
function populateStartTimeDropdown() {
  lessonStartTimeInput.innerHTML = '';
  // Populate from START_HOUR to END_HOUR-1 in 30-minute increments
  for (let hour = START_HOUR; hour < END_HOUR; hour++) {
    for (let min of [0, 30]) {
      // Limit latest start time to (END_HOUR - 1):00, so a minimum 60-min lesson ends on time
      if (hour === END_HOUR - 1 && min > 0) continue;
      
      const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      const option = document.createElement('option');
      option.value = timeStr;
      option.textContent = timeStr;
      lessonStartTimeInput.appendChild(option);
    }
  }
}

// Student Management Modal render list
function renderStudentList() {
  studentList.innerHTML = '';
  
  if (state.students.length === 0) {
    studentList.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">生徒が登録されていません</div>';
    return;
  }

  state.students.forEach(st => {
    const item = document.createElement('div');
    item.className = 'student-list-item';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'student-list-name';
    nameSpan.textContent = st.name;

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-student-btn';
    delBtn.setAttribute('data-id', st.id);
    delBtn.innerHTML = `
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
    `;
    delBtn.addEventListener('click', () => {
      deleteStudent(st.id);
    });

    item.appendChild(nameSpan);
    item.appendChild(delBtn);
    studentList.appendChild(item);
  });
}

function deleteStudent(id) {
  // Confirm deletion
  const student = state.students.find(st => st.id === id);
  if (!student) return;

  if (confirm(`${student.name}さんを削除してもよろしいですか？\n※登録済みの授業データはそのまま残ります。`)) {
    state.students = state.students.filter(st => st.id !== id);
    saveStudentsToStorage();
    updateStudentDropdowns();
    renderStudentList();
    showToast(`${student.name}さんを削除しました。`);
  }
}

// Handle Modal calculations (duration & end time link)
function updateComputedEndTime() {
  const startTimeVal = lessonStartTimeInput.value;
  if (!startTimeVal) {
    lessonEndTimeShow.value = '';
    return;
  }

  // Get selected duration
  let selectedDuration = 60;
  for (const radio of lessonDurationInputs) {
    if (radio.checked) {
      selectedDuration = parseInt(radio.value);
      break;
    }
  }

  const startMinutes = parseTimeToMinutes(startTimeVal);
  const endMinutes = startMinutes + selectedDuration;
  
  if (endMinutes > 24 * 60) {
    lessonEndTimeShow.value = '翌日になります';
  } else {
    lessonEndTimeShow.value = formatMinutesToTime(endMinutes);
  }
}

// Render the Modal Mini Calendar (Sunday Start)
function renderMiniCalendar() {
  const date = state.miniCalendarDate;
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed

  // 1. Update Header Month Label
  miniMonthLabel.textContent = `${year}年 ${month + 1}月`;

  // 2. Clear Grid
  miniCalendarGrid.innerHTML = '';

  // 3. Calculate start of grid (Sunday of the week containing the 1st of the month)
  const firstDayOfMonth = new Date(year, month, 1);
  let startOffset = firstDayOfMonth.getDay(); // 0 for Sun, 1 for Mon...
  const startDate = new Date(year, month, 1 - startOffset);
  const todayStr = formatDateString(new Date());

  // Render 42 cells
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(startDate);
    cellDate.setDate(startDate.getDate() + i);
    const dateStr = formatDateString(cellDate);
    const isCurrentMonth = cellDate.getMonth() === month;
    const isToday = dateStr === todayStr;
    const isSelected = state.selectedDates.includes(dateStr);

    const cell = document.createElement('div');
    cell.className = `mini-day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'is-today-marker' : ''} ${isSelected ? 'selected' : ''}`;
    
    cell.textContent = cellDate.getDate();

    // Toggle Selection on Click
    cell.addEventListener('click', () => {
      if (state.selectedDates.includes(dateStr)) {
        state.selectedDates = state.selectedDates.filter(d => d !== dateStr);
      } else {
        state.selectedDates.push(dateStr);
      }
      updateSelectedDatesDisplay();
      renderMiniCalendar(); // Redraw selection highlight
    });

    miniCalendarGrid.appendChild(cell);
  }
}

// Update the Selected Dates Text Display in Modal
function updateSelectedDatesDisplay() {
  if (state.selectedDates.length === 0) {
    selectedDatesDisplay.textContent = '選択された日付: なし';
    return;
  }

  // Sort dates chronologically
  const sortedDates = [...state.selectedDates].sort((a, b) => new Date(a) - new Date(b));

  // Format to "6月3日(水)"
  const daysOfWeekJp = ['日', '月', '火', '水', '木', '金', '土'];
  const formattedList = sortedDates.map(dateStr => {
    const d = new Date(dateStr);
    const m = d.getMonth() + 1;
    const dateVal = d.getDate();
    const dayName = daysOfWeekJp[d.getDay()];
    return `${m}月${dateVal}日(${dayName})`;
  });

  selectedDatesDisplay.textContent = `選択された日付: ${formattedList.join(', ')}`;
}

// Open Lesson Modal (Create Mode)
function openLessonModalForCreate(dateStr, timeStr) {
  lessonIdInput.value = '';
  modalTitle.textContent = '授業予定の追加';
  lessonStudentInput.value = '';
  
  // Set up selected dates state
  state.selectedDates = [];
  if (dateStr) {
    state.selectedDates.push(dateStr);
  }
  state.miniCalendarDate = dateStr ? new Date(dateStr) : new Date();

  // Show multi-date container, hide single date input
  multiDateGroup.style.display = 'block';
  singleDateGroup.style.display = 'none';

  lessonStartTimeInput.value = timeStr || '16:00';
  
  // Set default duration to 60
  document.getElementById('duration60').checked = true;
  // Set default color to blue
  document.getElementsByName('lessonColor')[0].checked = true;

  lessonMemoInput.value = '';
  deleteLessonBtn.style.display = 'none';

  // Render mini calendar inside modal
  renderMiniCalendar();
  updateSelectedDatesDisplay();

  updateComputedEndTime();
  lessonModal.classList.add('is-open');
}

// Open Lesson Modal (Edit Mode)
function openLessonModalForEdit(lesson) {
  lessonIdInput.value = lesson.id;
  modalTitle.textContent = '授業予定の編集';
  lessonStudentInput.value = lesson.studentId;
  
  // Hide multi-date container, show single date input
  multiDateGroup.style.display = 'none';
  singleDateGroup.style.display = 'block';
  lessonDateInput.value = lesson.date;

  lessonStartTimeInput.value = lesson.startTime;

  // Set duration radio
  for (const radio of lessonDurationInputs) {
    if (parseInt(radio.value) === lesson.duration) {
      radio.checked = true;
      break;
    }
  }

  // Set color radio
  for (const radio of lessonColorInputs) {
    if (radio.value === lesson.color) {
      radio.checked = true;
      break;
    }
  }

  lessonMemoInput.value = lesson.memo || '';
  deleteLessonBtn.style.display = 'inline-flex';

  updateComputedEndTime();
  lessonModal.classList.add('is-open');
}

function closeLessonModal() {
  lessonModal.classList.remove('is-open');
}

// Check Double Booking/Conflict (Any lessons overlapping on the same day)
function checkScheduleConflict(currentLessonId, date, startTime, duration) {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = startMinutes + duration;

  // Search through all lessons
  for (const lesson of state.lessons) {
    // Skip checking itself in edit mode
    if (lesson.id === currentLessonId) continue;

    if (lesson.date === date) {
      const otherStart = parseTimeToMinutes(lesson.startTime);
      const otherEnd = otherStart + lesson.duration;

      // Overlap formula: start1 < end2 && start2 < end1
      if (startMinutes < otherEnd && otherStart < endMinutes) {
        return {
          conflict: true,
          lesson: lesson
        };
      }
    }
  }

  return { conflict: false };
}

// Toast Notifications System
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : type === 'warning' ? 'toast-warning' : ''}`;
  
  const textSpan = document.createElement('span');
  textSpan.className = 'toast-message';
  textSpan.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', () => {
    toast.remove();
  });

  toast.appendChild(textSpan);
  toast.appendChild(closeBtn);
  toastContainer.appendChild(toast);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'none'; // reset
    toast.offsetHeight; // trigger reflow
    toast.style.animation = 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Setup all Event Listeners
function setupEventListeners() {
  // Navigation
  prevBtn.addEventListener('click', () => {
    if (state.currentView === 'week') {
      state.currentDate.setDate(state.currentDate.getDate() - 7);
    } else {
      state.currentDate.setMonth(state.currentDate.getMonth() - 1);
    }
    updateCalendar();
  });

  nextBtn.addEventListener('click', () => {
    if (state.currentView === 'week') {
      state.currentDate.setDate(state.currentDate.getDate() + 7);
    } else {
      state.currentDate.setMonth(state.currentDate.getMonth() + 1);
    }
    updateCalendar();
  });

  todayBtn.addEventListener('click', () => {
    state.currentDate = new Date();
    updateCalendar();
  });

  // View Switcher
  viewWeekBtn.addEventListener('click', () => {
    state.currentView = 'week';
    viewWeekBtn.classList.add('active');
    viewMonthBtn.classList.remove('active');
    updateCalendar();
  });

  viewMonthBtn.addEventListener('click', () => {
    state.currentView = 'month';
    viewMonthBtn.classList.add('active');
    viewWeekBtn.classList.remove('active');
    updateCalendar();
  });

  // Theme Toggle
  themeToggleBtn.addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('lesson_scheduler_theme', state.theme);
    applyTheme();
  });

  // Modal open buttons
  addLessonBtn.addEventListener('click', () => {
    openLessonModalForCreate();
  });

  manageStudentsBtn.addEventListener('click', () => {
    renderStudentList();
    studentModal.classList.add('is-open');
  });

  // Student Filter
  studentFilter.addEventListener('change', (e) => {
    state.selectedStudentFilter = e.target.value;
    updateCalendar();
  });

  // Reset/Load demo data
  resetDemoDataBtn.addEventListener('click', () => {
    if (confirm('カレンダーデータをリセットし、デモデータを読み込みますか？')) {
      loadDemoData();
    }
  });

  // Closing Modals
  closeLessonModalBtn.addEventListener('click', closeLessonModal);
  cancelLessonModalBtn.addEventListener('click', closeLessonModal);
  lessonModal.addEventListener('click', (e) => {
    if (e.target === lessonModal) closeLessonModal();
  });

  closeStudentModalBtn.addEventListener('click', () => studentModal.classList.remove('is-open'));
  closeStudentModalFooterBtn.addEventListener('click', () => studentModal.classList.remove('is-open'));
  studentModal.addEventListener('click', (e) => {
    if (e.target === studentModal) studentModal.classList.remove('is-open');
  });

  // Mini Calendar Navigation in Modal
  prevMiniMonthBtn.addEventListener('click', () => {
    state.miniCalendarDate.setMonth(state.miniCalendarDate.getMonth() - 1);
    renderMiniCalendar();
  });

  nextMiniMonthBtn.addEventListener('click', () => {
    state.miniCalendarDate.setMonth(state.miniCalendarDate.getMonth() + 1);
    renderMiniCalendar();
  });

  // Duration/Start Time listeners in Modal for dynamic end time calculation
  lessonStartTimeInput.addEventListener('change', updateComputedEndTime);
  for (const radio of lessonDurationInputs) {
    radio.addEventListener('change', updateComputedEndTime);
  }

  // Handle Lesson Form Submit
  lessonForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const lessonId = lessonIdInput.value;
    const studentId = lessonStudentInput.value;
    const student = state.students.find(st => st.id === studentId);
    
    if (!student) {
      showToast('生徒を選択してください。', 'error');
      return;
    }

    const startTimeVal = lessonStartTimeInput.value;
    
    let durationVal = 60;
    for (const radio of lessonDurationInputs) {
      if (radio.checked) {
        durationVal = parseInt(radio.value);
        break;
      }
    }

    let colorVal = 'blue';
    for (const radio of lessonColorInputs) {
      if (radio.checked) {
        colorVal = radio.value;
        break;
      }
    }

    const memoVal = lessonMemoInput.value;

    // Calculate End Time
    const startMinutes = parseTimeToMinutes(startTimeVal);
    const endMinutes = startMinutes + durationVal;
    const endTimeVal = formatMinutesToTime(endMinutes);

    // Validate if the lesson falls within operational bounds
    if (startMinutes < START_HOUR * 60 || endMinutes > END_HOUR * 60) {
      showToast(`授業時間は ${START_HOUR}:00 から ${END_HOUR}:00 の範囲内で設定してください。`, 'error');
      return;
    }

    if (lessonId) {
      // Edit mode (Single Date validation & update)
      const dateVal = lessonDateInput.value;
      const conflictCheck = checkScheduleConflict(lessonId, dateVal, startTimeVal, durationVal);
      if (conflictCheck.conflict) {
        showToast(
          `【登録エラー】この時間帯は既に ${conflictCheck.lesson.studentName}さんの授業（${conflictCheck.lesson.startTime}〜${conflictCheck.lesson.endTime}）が入っています。`,
          'error'
        );
        return; // Block saving
      }

      const idx = state.lessons.findIndex(l => l.id === lessonId);
      if (idx !== -1) {
        state.lessons[idx] = {
          id: lessonId,
          studentId: studentId,
          studentName: student.name,
          date: dateVal,
          startTime: startTimeVal,
          duration: durationVal,
          endTime: endTimeVal,
          color: colorVal,
          memo: memoVal
        };
        showToast('授業予定を更新しました。');
      }
    } else {
      // Create mode (Batch Dates validation & registration)
      if (state.selectedDates.length === 0) {
        showToast('カレンダー上で日付を少なくとも1つ選択してください。', 'error');
        return;
      }

      // Check conflicts for ALL selected dates
      for (const dVal of state.selectedDates) {
        const conflictCheck = checkScheduleConflict(lessonId, dVal, startTimeVal, durationVal);
        if (conflictCheck.conflict) {
          const d = new Date(dVal);
          const formattedDate = `${d.getMonth() + 1}月${d.getDate()}日`;
          showToast(
            `【登録エラー】${formattedDate}のこの時間帯は既に ${conflictCheck.lesson.studentName}さんの授業（${conflictCheck.lesson.startTime}〜${conflictCheck.lesson.endTime}）が入っています。一括登録できません。`,
            'error'
          );
          return; // Block saving
        }
      }

      // If all dates are valid, register them
      state.selectedDates.forEach(dVal => {
        const newLesson = {
          id: generateUUID(),
          studentId: studentId,
          studentName: student.name,
          date: dVal,
          startTime: startTimeVal,
          duration: durationVal,
          endTime: endTimeVal,
          color: colorVal,
          memo: memoVal
        };
        state.lessons.push(newLesson);
      });
      showToast(`${state.selectedDates.length}件の授業予定を一括登録しました。`);
    }

    saveLessonsToStorage();
    updateCalendar();
    closeLessonModal();
  });

  // Handle Delete Lesson
  deleteLessonBtn.addEventListener('click', () => {
    const id = lessonIdInput.value;
    if (!id) return;

    if (confirm('この授業予定を削除してもよろしいですか？')) {
      state.lessons = state.lessons.filter(l => l.id !== id);
      saveLessonsToStorage();
      updateCalendar();
      closeLessonModal();
      showToast('授業予定を削除しました。');
    }
  });

  // Handle Student Add inside Student modal
  saveNewStudentBtn.addEventListener('click', () => {
    const name = newStudentNameInput.value.trim();
    if (!name) {
      showToast('生徒名を入力してください。', 'error');
      return;
    }

    // Check duplicate name
    if (state.students.some(st => st.name === name)) {
      showToast('既に同名の生徒が登録されています。', 'error');
      return;
    }

    const newStudent = {
      id: generateUUID(),
      name: name
    };

    state.students.push(newStudent);
    saveStudentsToStorage();
    updateStudentDropdowns();
    renderStudentList();
    
    newStudentNameInput.value = '';
    showToast(`${name}さんを名簿に追加しました。`);
  });

  newStudentNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveNewStudentBtn.click();
    }
  });
}

// Fire up the app on window load
window.addEventListener('DOMContentLoaded', init);
