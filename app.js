// Global Error Handler for remote debugging
window.onerror = function(message, source, lineno, colno, error) {
  const errorMsg = 'JS Error: ' + message + '\nLine: ' + lineno + '\nSource: ' + source;
  console.error(errorMsg, error);
  alert(errorMsg);
  return false;
};

// App Configuration
const urlParams = new URLSearchParams(window.location.search);
const isReadOnly = window.FORCE_READONLY || urlParams.get('mode') === 'view' || urlParams.get('view') === 'readonly';

const SUPABASE_URL = 'https://bzobwzodgcfzaitgebya.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sg24lQQkvMWmGvJKenCqtg_DcpiYw3P';
const supabaseClient = window.supabase && typeof window.supabase.createClient === 'function'
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

const START_HOUR = 12;
const END_HOUR = 22;
const HOURS_COUNT = END_HOUR - START_HOUR;
const HOUR_HEIGHT = 80; // Must match CSS --hour-height
const DRAG_SNAP_MINUTES = 30;

// State variables
let state = {
  currentDate: new Date(), // Represents the viewed week or month
  lessons: [],
  students: [],
  memos: [], // <--- added for Supabase sync
  notices: [], // <--- added for Notice Board sync
  selectedStudentFilter: 'all',
  theme: 'light',
  currentView: 'month', // 'week' or 'month'
  selectedDates: [], // Array of YYYY-MM-DD strings for batch creation
  miniCalendarDate: new Date() // Month currently displayed in modal mini calendar
};

// Drag state
const drag = {
  active: false,
  lessonId: null,
  lessonIndex: -1,
  startX: 0,
  startY: 0,
  offsetX: 0,
  offsetY: 0,
  ghost: null,
  suppressClick: false
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
const modalTitle = document.getElementById('modalTitle');
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

// Memo Panel elements
const memoToggleBtn      = document.getElementById('memoToggleBtn');
const memoPanelAside     = document.getElementById('memoPanelAside');
const memoCloseBtn       = document.getElementById('memoCloseBtn');
const keepInputCollapsed = document.getElementById('keepInputCollapsed');
const keepInputExpanded  = document.getElementById('keepInputExpanded');
const keepTextarea       = document.getElementById('keepTextarea');
const keepCancelBtn      = document.getElementById('keepCancelBtn');
const keepAddBtn         = document.getElementById('keepAddBtn');
const keepMemoList       = document.getElementById('keepMemoList');

// Notice Board elements
const noticeBoardBtn = document.getElementById('noticeBoardBtn');
const noticeModal = document.getElementById('noticeModal');
const closeNoticeModalBtn = document.getElementById('closeNoticeModalBtn');
const closeNoticeModalFooterBtn = document.getElementById('closeNoticeModalFooterBtn');
const addNoticeContainer = document.getElementById('addNoticeContainer');
const newNoticeText = document.getElementById('newNoticeText');
const submitNoticeBtn = document.getElementById('submitNoticeBtn');
const noticeList = document.getElementById('noticeList');
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundToIncrement(value, increment) {
  return Math.round(value / increment) * increment;
}

function clearDragHighlights() {
  document.querySelectorAll('.day-column.drag-over, .day-column.droppable, .month-day-cell.drag-over, .month-day-cell.droppable')
    .forEach(el => el.classList.remove('drag-over', 'droppable'));
}

function getDropTargetFromPoint(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  return el ? el.closest('.day-column, .month-day-cell') : null;
}

function getSnappedStartTimeForWeekDrop(column, clientY, offsetY, duration) {
  const colRect = column.getBoundingClientRect();
  const dropY = clientY - colRect.top - offsetY;
  const rawMinutes = Math.max(0, (dropY / HOUR_HEIGHT) * 60);
  const snapped = roundToIncrement(START_HOUR * 60 + rawMinutes, DRAG_SNAP_MINUTES);
  const latestStart = Math.max(START_HOUR * 60, END_HOUR * 60 - duration);
  return formatMinutesToTime(clamp(snapped, START_HOUR * 60, latestStart));
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

function getDefaultStudents() {
  return [
    { id: 'st-1', name: '平山 美晴' },
    { id: 'st-2', name: '山中 泰成' },
    { id: 'st-3', name: '杉本 守' },
    { id: 'st-4', name: '松本 泰吾' },
    { id: 'st-5', name: '清村 優子' },
    { id: 'st-6', name: '内山 光莉' },
    { id: 'st-7', name: '徳丸 幸樹' },
    { id: 'st-8', name: '永井 桔平' }
  ];
}

function readJsonFromStorage(key, fallback) {
  const rawValue = localStorage.getItem(key);
  if (!rawValue) return fallback;

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    console.warn(`Invalid localStorage data for ${key}`, error);
    return fallback;
  }
}

function saveLessonsToStorage() {
  localStorage.setItem('lesson_scheduler_lessons', JSON.stringify(state.lessons));
}

function saveStudentsToStorage() {
  localStorage.setItem('lesson_scheduler_students', JSON.stringify(state.students));
}

function loadStateFromLocalStorage() {
  state.lessons = readJsonFromStorage('lesson_scheduler_lessons', null) || getDefaultLessons();
  state.students = readJsonFromStorage('lesson_scheduler_students', null) || getDefaultStudents();
  state.memos = readJsonFromStorage('lesson_scheduler_memos_keep', []);
  state.notices = readJsonFromStorage('lesson_scheduler_notices', []);
  saveLessonsToStorage();
  saveStudentsToStorage();
}

// Initialize Application
async function init() {
  console.log('App initialization started...');
  
  // Apply Read-Only Mode UI changes
  try {
    if (isReadOnly) {
      if (addLessonBtn) addLessonBtn.style.display = 'none';
      if (manageStudentsBtn) manageStudentsBtn.style.display = 'none';
      if (resetDemoDataBtn) resetDemoDataBtn.style.display = 'none';
    }
  } catch (e) {
    console.error('Error in Read-Only UI layout:', e);
  }

  // Load State from LocalStorage and Supabase
  try {
    await loadStateFromStorage();
  } catch (e) {
    console.error('Error loading state:', e);
  }

  // Draw static grids
  try {
    renderTimeAxis();
  } catch (e) {
    console.error('Error rendering time axis:', e);
  }

  // Render Dynamic Calendar
  try {
    updateCalendar();
  } catch (e) {
    console.error('Error updating calendar:', e);
  }

  // Populate Student lists in forms
  try {
    updateStudentDropdowns();
  } catch (e) {
    console.error('Error updating student dropdowns:', e);
  }

  // Populate Start Time dropdown options
  try {
    populateStartTimeDropdown();
  } catch (e) {
    console.error('Error populating start time dropdown:', e);
  }

  // Setup Live Time Line
  try {
    setInterval(updateCurrentTimeIndicator, 60000); // Update every minute
    updateCurrentTimeIndicator();
  } catch (e) {
    console.error('Error updating current time indicator:', e);
  }

  // Setup Event Listeners
  try {
    setupEventListeners();
  } catch (e) {
    console.error('Error in setupEventListeners:', e);
  }

  // Setup Memo panel
  try {
    setupMemo();
  } catch (e) {
    console.error('Error setting up Memo:', e);
  }
  
  // Setup Notice Board
  try {
    setupNoticeBoard();
  } catch (e) {
    console.error('Error setting up Notice Board:', e);
  }
  
  // Set CSS property for hours count
  try {
    document.documentElement.style.setProperty('--hours-count', HOURS_COUNT);
  } catch (e) {
    console.error('Error setting CSS hours count:', e);
  }

  console.log('App initialization completed.');
}

// ─── Notice Board ────────────────────────────────────────────────────────────

function setupNoticeBoard() {
  if (!noticeBoardBtn) return; // Feature might not be in all pages

  // Modal display toggles
  noticeBoardBtn.addEventListener('click', () => {
    renderNotices();
    if (noticeModal) noticeModal.style.display = 'flex';
  });

  const closeModal = () => {
    if (noticeModal) noticeModal.style.display = 'none';
  };

  if (closeNoticeModalBtn) closeNoticeModalBtn.addEventListener('click', closeModal);
  if (closeNoticeModalFooterBtn) closeNoticeModalFooterBtn.addEventListener('click', closeModal);
  if (noticeModal) {
    noticeModal.addEventListener('click', (e) => {
      if (e.target === noticeModal) closeModal();
    });
  }

  // Admin vs Read-Only View
  if (isReadOnly) {
    if (addNoticeContainer) addNoticeContainer.style.display = 'none';
  } else {
    if (addNoticeContainer) addNoticeContainer.style.display = 'flex';
  }

  // Submit Notice
  if (submitNoticeBtn && newNoticeText) {
    submitNoticeBtn.addEventListener('click', () => {
      const text = newNoticeText.value.trim();
      if (!text) return;

      const newNotice = {
        id: 'notice-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        content: text,
        createdAt: Date.now()
      };

      state.notices.unshift(newNotice);
      saveNoticesAsync(newNotice, 'insert');
      newNoticeText.value = '';
      renderNotices();
    });
  }
}

async function saveNoticesAsync(noticeObj, action) {
  if (supabaseClient) {
    try {
      if (action === 'insert') {
        await supabaseClient.from('notices').insert(noticeObj);
      } else if (action === 'delete') {
        await supabaseClient.from('notices').delete().eq('id', noticeObj.id);
      }
    } catch (error) {
      console.error('Notice sync error:', error);
    }
  }
  localStorage.setItem('lesson_scheduler_notices', JSON.stringify(state.notices));
}

function renderNotices() {
  if (!noticeList) return;
  noticeList.innerHTML = '';
  
  const sorted = [...(state.notices || [])].sort((a, b) => {
    const timeA = (typeof a.createdAt === 'number' || /^\d+$/.test(String(a.createdAt))) ? Number(a.createdAt) : new Date(a.createdAt).getTime();
    const timeB = (typeof b.createdAt === 'number' || /^\d+$/.test(String(b.createdAt))) ? Number(b.createdAt) : new Date(b.createdAt).getTime();
    return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
  });

  if (sorted.length === 0) {
    noticeList.innerHTML = '<div style="color:var(--text-secondary); text-align:center; padding: 2rem;">連絡事項はありません。</div>';
    return;
  }

  sorted.forEach(notice => {
    const item = document.createElement('div');
    item.className = 'notice-item';
    
    const dateObj = new Date((typeof notice.createdAt === 'number' || /^\d+$/.test(String(notice.createdAt))) ? Number(notice.createdAt) : notice.createdAt);
    const dateStr = isNaN(dateObj.getTime()) ? '日付不明' : `${dateObj.getFullYear()}/${String(dateObj.getMonth()+1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

    let deleteBtnHtml = '';
    if (!isReadOnly) {
      deleteBtnHtml = `
        <button class="notice-delete-btn" aria-label="削除" data-id="${notice.id}">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      `;
    }

    item.innerHTML = `
      <div class="notice-content">${escapeHtml(notice.content)}</div>
      <div class="notice-meta">${dateStr}</div>
      ${deleteBtnHtml}
    `;

    if (!isReadOnly) {
      const delBtn = item.querySelector('.notice-delete-btn');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          if (confirm('この連絡事項を削除してもよろしいですか？')) {
            state.notices = state.notices.filter(n => n.id !== notice.id);
            saveNoticesAsync(notice, 'delete');
            renderNotices();
          }
        });
      }
    }

    noticeList.appendChild(item);
  });
}

// ─── Memo Sidebar ────────────────────────────────────────────────────────────
const MEMO_STORAGE_KEY = 'lesson_scheduler_memos_keep';

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setupMemo() {
  if (!memoToggleBtn || !memoPanelAside) return; // Not on admin page

  // Restore open/closed state
  const memoOpen = localStorage.getItem('lesson_scheduler_memo_open') === 'true';
  if (memoOpen) {
    memoPanelAside.classList.add('is-open');
    memoToggleBtn.classList.add('active');
  }

  // Toggle button opens/closes the panel
  memoToggleBtn.addEventListener('click', () => {
    const isOpen = memoPanelAside.classList.toggle('is-open');
    memoToggleBtn.classList.toggle('active', isOpen);
    localStorage.setItem('lesson_scheduler_memo_open', isOpen);
  });

  // Close button inside the panel
  if (memoCloseBtn) {
    memoCloseBtn.addEventListener('click', () => {
      memoPanelAside.classList.remove('is-open');
      memoToggleBtn.classList.remove('active');
      localStorage.setItem('lesson_scheduler_memo_open', 'false');
    });
  }

  // If user has old text memo from before, migrate it into a card
  const oldMemoText = localStorage.getItem('lesson_scheduler_memo');
  if (oldMemoText && oldMemoText.trim()) {
    const migratedMemo = {
      id: 'memo-migrated-' + Date.now(),
      content: oldMemoText.trim(),
      isPinned: false,
      createdAt: Date.now()
    };
    state.memos.push(migratedMemo);
    localStorage.removeItem('lesson_scheduler_memo');
    saveMemosAsync(migratedMemo, 'insert');
  }

  async function saveMemosAsync(memoObj, action) {
    if (supabaseClient) {
      try {
        if (action === 'insert') {
          await supabaseClient.from('memos').insert(memoObj);
        } else if (action === 'update') {
          await supabaseClient.from('memos').update(memoObj).eq('id', memoObj.id);
        } else if (action === 'delete') {
          await supabaseClient.from('memos').delete().eq('id', memoObj.id);
        }
      } catch (error) {
        console.error('Memo sync error:', error);
      }
    }
    // Update local fallback
    localStorage.setItem('lesson_scheduler_memos_keep', JSON.stringify(state.memos));
  }

  function renderMemos() {
    if (!keepMemoList) return;
    keepMemoList.innerHTML = '';
    
    // Sort: pinned first, then by createdAt desc
    const sorted = [...state.memos].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.createdAt - a.createdAt;
    });

    sorted.forEach(memo => {
      const card = document.createElement('div');
      card.className = `keep-card ${memo.isPinned ? 'pinned' : ''}`;
      
      // Parse content for pseudo-title (first line bold if multi-line)
      const lines = memo.content.trim().split('\n');
      let bodyHtml = '';
      if (lines.length > 1) {
        bodyHtml = `<b>${escapeHtml(lines[0])}</b>${escapeHtml(lines.slice(1).join('\n'))}`;
      } else {
        bodyHtml = escapeHtml(lines[0]);
      }
      
      card.innerHTML = `
        <div class="keep-card-body">${bodyHtml}</div>
        <button class="keep-card-pin" aria-label="ピン留め" data-id="${memo.id}">
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>
        </button>
        <button class="keep-card-delete" aria-label="削除" data-id="${memo.id}">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      `;

      card.querySelector('.keep-card-pin').addEventListener('click', (e) => {
        e.stopPropagation();
        memo.isPinned = !memo.isPinned;
        saveMemosAsync(memo, 'update');
        renderMemos();
      });

      card.querySelector('.keep-card-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        state.memos = state.memos.filter(m => m.id !== memo.id);
        saveMemosAsync(memo, 'delete');
        renderMemos();
      });

      keepMemoList.appendChild(card);
    });
  }

  // Input area toggling
  if (keepInputCollapsed && keepInputExpanded) {
    keepInputCollapsed.addEventListener('click', () => {
      keepInputCollapsed.style.display = 'none';
      keepInputExpanded.style.display = 'flex';
      keepTextarea.focus();
    });

    keepCancelBtn.addEventListener('click', () => {
      keepTextarea.value = '';
      keepInputExpanded.style.display = 'none';
      keepInputCollapsed.style.display = 'flex';
    });

    keepAddBtn.addEventListener('click', () => {
      const text = keepTextarea.value.trim();
      if (!text) {
        keepTextarea.value = '';
        keepInputExpanded.style.display = 'none';
        keepInputCollapsed.style.display = 'flex';
        return;
      }
      
      const newMemo = {
        id: 'memo-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        content: text,
        isPinned: false,
        createdAt: Date.now()
      };
      
      state.memos.unshift(newMemo);
      saveMemosAsync(newMemo, 'insert');
      renderMemos();
      
      keepTextarea.value = '';
      keepInputExpanded.style.display = 'none';
      keepInputCollapsed.style.display = 'flex';
    });
  }

  renderMemos();
}
// ─────────────────────────────────────────────────────────────────────────────

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

// Load from Supabase and LocalStorage (for theme)
async function loadStateFromStorage() {
  const localTheme = localStorage.getItem('lesson_scheduler_theme');

  // Set Theme
  if (localTheme) {
    state.theme = localTheme;
  } else {
    // Default to system settings
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    state.theme = prefersDark ? 'dark' : 'light';
  }
  applyTheme();

  if (!supabaseClient) {
    loadStateFromLocalStorage();
    showToast('オンライン同期を使えないため、この端末に保存します。', 'warning');
    return;
  }

  try {
    // Fetch students
    const { data: studentsData, error: studentsError } = await supabaseClient.from('students').select('*');
    if (studentsError) throw studentsError;

    if (studentsData && studentsData.length > 0) {
      state.students = studentsData;
    } else {
      // Initial standard student list
      state.students = getDefaultStudents();
      await supabaseClient.from('students').insert(state.students);
    }

    // Fetch lessons
    const { data: lessonsData, error: lessonsError } = await supabaseClient.from('lessons').select('*');
    if (lessonsError) throw lessonsError;

    if (lessonsData && lessonsData.length > 0) {
      state.lessons = lessonsData;
    } else {
      state.lessons = getDefaultLessons();
      await supabaseClient.from('lessons').insert(state.lessons);
    }

    // Fetch memos
    const { data: memosData, error: memosError } = await supabaseClient.from('memos').select('*');
    if (memosError) throw memosError;

    if (memosData) {
      state.memos = memosData;
    } else {
      state.memos = [];
    }

    // Fetch notices
    const { data: noticesData, error: noticesError } = await supabaseClient.from('notices').select('*');
    if (noticesError) throw noticesError;

    if (noticesData) {
      state.notices = noticesData;
    } else {
      state.notices = [];
    }

    saveLessonsToStorage();
    saveStudentsToStorage();
    localStorage.setItem('lesson_scheduler_memos_keep', JSON.stringify(state.memos));
    localStorage.setItem('lesson_scheduler_notices', JSON.stringify(state.notices));
  } catch (error) {
    console.error('Error loading data from Supabase:', error);
    loadStateFromLocalStorage();
    showToast('オンライン同期に接続できないため、この端末の保存データで表示します。', 'warning');
  }
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
async function loadDemoData() {
  // Reset student list to the 8 names
  state.students = getDefaultStudents();
  state.lessons = getDefaultLessons();

  try {
    if (supabaseClient) {
      // Delete all existing data
      await supabaseClient.from('lessons').delete().neq('id', 'dummy');
      await supabaseClient.from('students').delete().neq('id', 'dummy');

      // Insert demo data
      await supabaseClient.from('students').insert(state.students);
      await supabaseClient.from('lessons').insert(state.lessons);
    }

    saveStudentsToStorage();
    saveLessonsToStorage();

    updateStudentDropdowns();
    updateCalendar();
    showToast('デモデータを読み込みました！');
  } catch (error) {
    console.error('Error loading demo data:', error);
    showToast('デモデータの読み込みに失敗しました', 'error');
  }
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
    cell.dataset.date = dateStr;
    
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
      if (isReadOnly) return;
      // Ignore click if user clicked a lesson card
      if (e.target.closest('.lesson-card')) return;
      openLessonModalForCreate(dateStr, '16:00');
    });

    if (!isReadOnly) {
      cell.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        cell.classList.add('drag-over');
      });

      cell.addEventListener('dragleave', () => {
        cell.classList.remove('drag-over');
      });

      cell.addEventListener('drop', async (e) => {
        e.preventDefault();
        cell.classList.remove('drag-over');
        
        if (!drag.lessonId) return;

        const lessonIndex = state.lessons.findIndex(l => l.id === drag.lessonId);
        if (lessonIndex === -1) return;
        
        const lesson = state.lessons[lessonIndex];
        const newDateStr = dateStr;

        await moveLessonToSlot(lesson, newDateStr, lesson.startTime);
      });
    }

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
      if (isReadOnly) return;
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

  // Click to edit
  card.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isReadOnly) return;
    if (drag.active || drag.suppressClick) {
      drag.suppressClick = false;
      return;
    }
    openLessonModalForEdit(lesson);
  });

  // Pointer-event based drag (admin only)
  if (!isReadOnly) {
    card.style.cursor = 'grab';
    card.draggable = false;

    card.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;

      const cardRect = card.getBoundingClientRect();
      drag.lessonId   = lesson.id;
      drag.lessonIndex = state.lessons.findIndex(l => l.id === lesson.id);
      drag.offsetX    = e.clientX - cardRect.left;
      drag.offsetY    = e.clientY - cardRect.top;
      drag.startX     = e.clientX;
      drag.startY     = e.clientY;
      drag.active     = false;
      drag.ghost      = null;

      // Capture all future pointer events on this element
      card.setPointerCapture(e.pointerId);
    });

    card.addEventListener('pointermove', (e) => {
      if (drag.lessonId !== lesson.id) return;

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;

      // Ignore tiny movements (treat as a click)
      if (!drag.active && Math.hypot(dx, dy) < 6) return;

      if (!drag.active) {
        // Real drag started
        drag.active = true;
        card.classList.add('dragging');
        card.style.opacity = '0.35';
        card.style.cursor  = 'grabbing';

        // Create ghost that follows the cursor
        const ghost = card.cloneNode(true);
        ghost.id = 'drag-ghost';
        const cardRect = card.getBoundingClientRect();
        ghost.style.cssText = [
          'position:fixed',
          'pointer-events:none',
          'z-index:9999',
          `width:${cardRect.width}px`,
          `height:${cardRect.height}px`,
          'opacity:0.9',
          'box-shadow:0 10px 30px rgba(0,0,0,0.3)',
          'border-radius:6px',
          'transition:none',
          'transform:scale(1.04)'
        ].join(';');
        document.body.appendChild(ghost);
        drag.ghost = ghost;

        document.querySelectorAll('.day-column, .month-day-cell').forEach(c => c.classList.add('droppable'));
      }

      // Move ghost with cursor
      drag.ghost.style.left = (e.clientX - drag.offsetX) + 'px';
      drag.ghost.style.top  = (e.clientY - drag.offsetY) + 'px';

      // Highlight hovered column
      drag.ghost.style.display = 'none'; // hide so elementFromPoint sees through it
      const el = document.elementFromPoint(e.clientX, e.clientY);
      drag.ghost.style.display = '';

      document.querySelectorAll('.day-column.drag-over, .month-day-cell.drag-over').forEach(c => c.classList.remove('drag-over'));
      const col = el ? el.closest('.day-column, .month-day-cell') : null;
      if (col) col.classList.add('drag-over');
    });

    card.addEventListener('pointerup', async (e) => {
      if (drag.lessonId !== lesson.id) return;

      // Cleanup visual state
      if (drag.ghost) { drag.ghost.remove(); drag.ghost = null; }
      card.classList.remove('dragging');
      card.style.opacity = '';
      card.style.cursor  = 'grab';
      clearDragHighlights();

      const wasActive = drag.active;
      if (wasActive) {
        drag.suppressClick = true;
        setTimeout(() => {
          drag.suppressClick = false;
        }, 250);
      }
      drag.active   = false;
      drag.lessonId = null;

      if (!wasActive) return; // Was just a click, not a drag

      const dropTarget = getDropTargetFromPoint(e.clientX, e.clientY);
      if (!dropTarget) return;

      const lessonData = state.lessons[drag.lessonIndex];
      const newDateStr = dropTarget.dataset.date;
      if (!lessonData || !newDateStr) return;

      const newStartTime = dropTarget.classList.contains('day-column')
        ? getSnappedStartTimeForWeekDrop(dropTarget, e.clientY, drag.offsetY, lessonData.duration)
        : lessonData.startTime;

      await moveLessonToSlot(lessonData, newDateStr, newStartTime);
      return;
    });

    card.addEventListener('pointercancel', () => {
      if (drag.ghost) { drag.ghost.remove(); drag.ghost = null; }
      card.classList.remove('dragging');
      card.style.opacity = '';
      card.style.cursor  = 'grab';
      drag.active   = false;
      drag.lessonId = null;
      clearDragHighlights();
    });
  }

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
  if (studentFilter) {
    const currentFilterVal = studentFilter.value;
    studentFilter.innerHTML = '<option value="all">すべての生徒</option>';
    
    state.students.forEach(st => {
      const option = document.createElement('option');
      option.value = st.id;
      option.textContent = st.name;
      studentFilter.appendChild(option);
    });
    
    studentFilter.value = currentFilterVal || 'all';
  }

  // 2. Modal Dropdown
  if (lessonStudentInput) {
    lessonStudentInput.innerHTML = '<option value="" disabled selected>生徒を選択してください</option>';
    state.students.forEach(st => {
      const option = document.createElement('option');
      option.value = st.id;
      option.textContent = st.name;
      lessonStudentInput.appendChild(option);
    });
  }
}

// Dynamic Start Time List (30-minute increments within operating hours)
function populateStartTimeDropdown() {
  if (!lessonStartTimeInput) return;
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

async function deleteStudent(id) {
  // Confirm deletion
  const student = state.students.find(st => st.id === id);
  if (!student) return;

  if (confirm(`${student.name}さんを削除してもよろしいですか？\n※登録済みの授業データはそのまま残ります。`)) {
    if (supabaseClient) {
      const { error } = await supabaseClient.from('students').delete().eq('id', id);
      if (error) {
        console.error(error);
        showToast('生徒の削除に失敗しました', 'error');
        return;
      }
    }

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

async function moveLessonToSlot(lesson, newDate, newStartTime) {
  const newStartMinutes = parseTimeToMinutes(newStartTime);
  const newEndMinutes = newStartMinutes + lesson.duration;

  if (newStartMinutes < START_HOUR * 60 || newEndMinutes > END_HOUR * 60) {
    showToast(`授業時間は ${START_HOUR}:00 から ${END_HOUR}:00 の範囲で移動してください。`, 'error');
    return false;
  }

  if (lesson.date === newDate && lesson.startTime === newStartTime) {
    return false;
  }

  const conflictCheck = checkScheduleConflict(lesson.id, newDate, newStartTime, lesson.duration);
  if (conflictCheck.conflict) {
    showToast(
      `移動できません。${conflictCheck.lesson.studentName}さんの授業（${conflictCheck.lesson.startTime}-${conflictCheck.lesson.endTime}）と重なります。`,
      'error'
    );
    return false;
  }

  const oldLesson = { ...lesson };
  const updatedFields = {
    date: newDate,
    startTime: newStartTime,
    endTime: formatMinutesToTime(newEndMinutes)
  };

  Object.assign(lesson, updatedFields);
  updateCalendar();

  try {
    if (supabaseClient) {
      const { error } = await supabaseClient.from('lessons').update(updatedFields).eq('id', lesson.id);
      if (error) throw error;
    }
    saveLessonsToStorage();
    showToast('授業を移動しました。', 'success');
    return true;
  } catch (error) {
    console.error(error);
    Object.assign(lesson, oldLesson);
    updateCalendar();
    showToast('移動の保存に失敗しました。', 'error');
    return false;
  }
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
  if (lessonStartTimeInput) {
    lessonStartTimeInput.addEventListener('change', updateComputedEndTime);
  }
  if (lessonDurationInputs) {
    for (const radio of lessonDurationInputs) {
      radio.addEventListener('change', updateComputedEndTime);
    }
  }

  // Handle Lesson Form Submit
  lessonForm.addEventListener('submit', async (e) => {
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
        const updatedLesson = {
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

        try {
          if (supabaseClient) {
            const { error } = await supabaseClient.from('lessons').update(updatedLesson).eq('id', lessonId);
            if (error) throw error;
          }
          
          state.lessons[idx] = updatedLesson;
          saveLessonsToStorage();
          showToast('授業予定を更新しました。');
        } catch (error) {
          console.error(error);
          showToast('更新に失敗しました', 'error');
          return;
        }
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
      const newLessons = state.selectedDates.map(dVal => ({
        id: generateUUID(),
        studentId: studentId,
        studentName: student.name,
        date: dVal,
        startTime: startTimeVal,
        duration: durationVal,
        endTime: endTimeVal,
        color: colorVal,
        memo: memoVal
      }));

      try {
        if (supabaseClient) {
          const { error } = await supabaseClient.from('lessons').insert(newLessons);
          if (error) throw error;
        }

        state.lessons.push(...newLessons);
        saveLessonsToStorage();
        showToast(`${state.selectedDates.length}件の授業予定を一括登録しました。`);
      } catch (error) {
        console.error(error);
        showToast('登録に失敗しました', 'error');
        return;
      }
    }

    updateCalendar();
    closeLessonModal();
  });

  // Handle Delete Lesson
  deleteLessonBtn.addEventListener('click', async () => {
    const id = lessonIdInput.value;
    if (!id) return;

    if (confirm('この授業予定を削除してもよろしいですか？')) {
      try {
        if (supabaseClient) {
          const { error } = await supabaseClient.from('lessons').delete().eq('id', id);
          if (error) throw error;
        }

        state.lessons = state.lessons.filter(l => l.id !== id);
        saveLessonsToStorage();
        updateCalendar();
        closeLessonModal();
        showToast('授業予定を削除しました。');
      } catch (error) {
        console.error(error);
        showToast('削除に失敗しました', 'error');
      }
    }
  });

  // Handle Student Add inside Student modal
  saveNewStudentBtn.addEventListener('click', async () => {
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

    try {
      if (supabaseClient) {
        const { error } = await supabaseClient.from('students').insert(newStudent);
        if (error) throw error;
      }

      state.students.push(newStudent);
      saveStudentsToStorage();
      updateStudentDropdowns();
      renderStudentList();
      
      newStudentNameInput.value = '';
      showToast(`${name}さんを名簿に追加しました。`);
    } catch (error) {
      console.error(error);
      showToast('生徒の追加に失敗しました', 'error');
    }
  });

  newStudentNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveNewStudentBtn.click();
    }
  });

  // Mobile horizontal scroll sync for sticky time axis
  weekViewPanel.addEventListener('scroll', (e) => {
    if (state.currentView !== 'week') return;
    const scrollLeft = e.target.scrollLeft;
    
    // Sync time zone cell in header
    const tzCell = document.querySelector('.time-zone-cell');
    if (tzCell) {
      tzCell.style.transform = `translateX(${scrollLeft}px)`;
    }
    
    // Sync time axis column in body
    const timeAxis = document.getElementById('timeAxisCol');
    if (timeAxis) {
      timeAxis.style.transform = `translateX(${scrollLeft}px)`;
    }
  });
}

// Fire up the app on window load
window.addEventListener('DOMContentLoaded', init);
