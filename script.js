/* =========================================
   CYCLECARE — APP FUNCTIONALITY
========================================= */

const STORAGE_KEY = "cyclecare-period-history";
const SETTINGS_KEY = "cyclecare-settings";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const trackingForm = $("#tracking-form");
const trackingStart = $("#tracking-start");
const trackingEnd = $("#tracking-end");
const trackingMessage = $("#tracking-message");
const periodHistory = $("#period-history");

const settingsForm = $("#settings-form");
const lastPeriodInput = $("#last-period");
const cycleLengthInput = $("#cycle-length");
const periodLengthInput = $("#period-length");
const settingsMessage = $("#settings-message");

let calendarMonth = new Date();
calendarMonth.setDate(1);

/* DATE HELPERS */

function parseDate(value) {
  if (!value) return null;

  const parts = value.split("-").map(Number);

  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return null;
  }

  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  date.setHours(12, 0, 0, 0);

  return date;
}

function dateToString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date) {
  if (!date || Number.isNaN(date.getTime())) {
    return "Not calculated yet";
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatShortDate(date) {
  if (!date) return "";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short"
  });
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

/* SAVE AND LOAD DATA */

function getSavedPeriods() {
  try {
    const records = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

function savePeriods(periods) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(periods));
    return true;
  } catch {
    return false;
  }
}

function getSettings() {
  const defaults = {
    lastPeriod: "",
    cycleLength: 28,
    periodLength: 5
  };

  try {
    const saved = JSON.parse(
      localStorage.getItem(SETTINGS_KEY) || "{}"
    );

    return {
      lastPeriod: typeof saved.lastPeriod === "string"
        ? saved.lastPeriod
        : defaults.lastPeriod,

      cycleLength: Number(saved.cycleLength) >= 21 &&
        Number(saved.cycleLength) <= 35
        ? Number(saved.cycleLength)
        : defaults.cycleLength,

      periodLength: Number(saved.periodLength) >= 2 &&
        Number(saved.periodLength) <= 10
        ? Number(saved.periodLength)
        : defaults.periodLength
    };
  } catch {
    return defaults;
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

function updateLastPeriod(lastPeriod) {
  const settings = getSettings();
  settings.lastPeriod = lastPeriod;

  if (!saveSettings(settings)) {
    return false;
  }

  lastPeriodInput.value = lastPeriod;
  return true;
}

/* NAVIGATION */

function showPage(pageName) {
  const page = $(`#page-${pageName}`);

  if (!page) return;

  $$(".app-page").forEach((section) => {
    section.classList.toggle("active", section === page);
  });

  $$("[data-page]").forEach((button) => {
    const active = button.dataset.page === pageName;

    if (
      button.classList.contains("nav-item") ||
      button.classList.contains("mobile-nav-item")
    ) {
      button.classList.toggle("active", active);
    }
  });

  const titles = {
    home: "Your cycle, your care.",
    calendar: "Your period calendar.",
    insights: "Your cycle insights.",
    tracking: "Your personal cycle diary."
  };

  const title = $("#page-title");

  if (title) {
    title.textContent = titles[pageName] || titles.home;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

$$("[data-page]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    showPage(button.dataset.page);
  });
});

/* PREDICTIONS */

function getPredictionSettings() {
  const settings = getSettings();

  return {
    lastPeriod: settings.lastPeriod,
    cycleLength: settings.cycleLength,
    periodLength: settings.periodLength
  };
}

function getNextPeriodDate(lastPeriod, cycleLength) {
  const start = parseDate(lastPeriod);

  if (!start) return null;

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  let next = new Date(start);

  while (next < today) {
    next = addDays(next, cycleLength);
  }

  return next;
}

function getPreviousOrNextCycleStart(lastPeriod, cycleLength, targetDate) {
  const start = parseDate(lastPeriod);

  if (!start) return null;

  const difference = Math.floor(
    (targetDate - start) / 86400000
  );

  const cycleNumber = Math.floor(difference / cycleLength);

  return addDays(start, cycleNumber * cycleLength);
}

function isExpectedPeriodDay(date, settings) {
  const start = parseDate(settings.lastPeriod);

  if (!start || !date || date < start) {
    return false;
  }

  const difference = Math.floor(
    (date - start) / 86400000
  );

  const cycleDay = difference % settings.cycleLength;

  return cycleDay >= 0 &&
    cycleDay < settings.periodLength;
}

function updatePredictions() {
  const settings = getPredictionSettings();

  const lastPeriod = settings.lastPeriod;
  const cycleLength = settings.cycleLength;
  const periodLength = settings.periodLength;

  $("#cycle-length-display").textContent = cycleLength;
  $("#insight-cycle-length").textContent = cycleLength;
  $("#insight-period-length").textContent = periodLength;

  const nextDateElement = $("#next-period-date");
  const countdownElement = $("#next-period-countdown");
  const ovulationElement = $("#ovulation-date");
  const ovulationDescription = $("#ovulation-description");
  const fertileElement = $("#fertile-dates");
  const progressElement = $("#cycle-progress");

  const lastDate = parseDate(lastPeriod);
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  if (!lastDate) {
    nextDateElement.textContent = "Add your last period";
    countdownElement.textContent = "Your estimate will appear here.";
    ovulationElement.textContent = "Not calculated yet";
    ovulationDescription.textContent = "Add your cycle details to begin.";
    fertileElement.textContent = "Not calculated yet";
    progressElement.style.width = "0%";
    return;
  }

  const nextDate = getNextPeriodDate(lastPeriod, cycleLength);

  if (!nextDate) return;

  const daysUntil = Math.round(
    (nextDate - today) / 86400000
  );

  nextDateElement.textContent = formatDate(nextDate);

  if (daysUntil === 0) {
    countdownElement.textContent = "Expected today";
  } else if (daysUntil === 1) {
    countdownElement.textContent = "Estimated in 1 day";
  } else {
    countdownElement.textContent = `Estimated in ${daysUntil} days`;
  }

  const previousStart = getPreviousOrNextCycleStart(
    lastPeriod,
    cycleLength,
    today
  );

  const cycleDay = Math.max(
    1,
    Math.floor((today - previousStart) / 86400000) + 1
  );

  progressElement.style.width =
    `${Math.min(100, (cycleDay / cycleLength) * 100)}%`;

  // Approximate ovulation: around 14 days before the next period.
  const ovulationDate = addDays(nextDate, -14);

  ovulationElement.textContent = formatDate(ovulationDate);
  ovulationDescription.textContent = "Approximate ovulation date";

  // Approximate fertile window: five days before ovulation through
  // the estimated ovulation day.
  const fertileStart = addDays(ovulationDate, -5);

  fertileElement.textContent =
    `${formatShortDate(fertileStart)} – ${formatShortDate(ovulationDate)}`;
}

/* CALENDAR */

function renderCalendar() {
const grid = $("#calendar-grid");
const heading = $("#calendar-month");

if (!grid || !heading) return;

grid.innerHTML = "";

heading.textContent = calendarMonth.toLocaleDateString("en-GB", {
month: "long",
year: "numeric"
});

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

weekdays.forEach((day) => {
const element = document.createElement("div");
element.className = "weekday";
element.textContent = day;
grid.appendChild(element);
});

const year = calendarMonth.getFullYear();
const month = calendarMonth.getMonth();

const firstDay = new Date(year, month, 1);
const daysInMonth = new Date(year, month + 1, 0).getDate();

// Monday-first calendar.
const offset = (firstDay.getDay() + 6) % 7;

for (let i = 0; i < offset; i++) {
const empty = document.createElement("div");
empty.className = "calendar-day empty";
grid.appendChild(empty);
}

const settings = getPredictionSettings();

// Calculate estimated ovulation and fertile window.
let ovulationDate = null;
let fertileStart = null;
let fertileEnd = null;

if (settings.lastPeriod && settings.cycleLength) {
const lastPeriod = new Date(settings.lastPeriod + "T12:00:00");

if (!Number.isNaN(lastPeriod.getTime())) {
  ovulationDate = new Date(lastPeriod);
  ovulationDate.setDate(
    ovulationDate.getDate() + Number(settings.cycleLength) - 14
  );

  fertileStart = new Date(ovulationDate);
  fertileStart.setDate(fertileStart.getDate() - 5);

  fertileEnd = new Date(ovulationDate);
  fertileEnd.setDate(fertileEnd.getDate() + 1);
}

}

const today = new Date();
today.setHours(12, 0, 0, 0);

for (let day = 1; day <= daysInMonth; day++) {
const date = new Date(year, month, day);
date.setHours(12, 0, 0, 0);

const element = document.createElement("div");
element.className = "calendar-day";
element.textContent = day;

// Expected period dates.
if (isExpectedPeriodDay(date, settings)) {
  element.classList.add("expected-period");
  element.title = "Estimated period day";
}

// Estimated fertile window.
if (
  fertileStart &&
  fertileEnd &&
  date >= fertileStart &&
  date <= fertileEnd
) {
  element.classList.add("fertile-window");
  element.title = element.title
    ? `${element.title}; Estimated fertile window`
    : "Estimated fertile window";
}

// Estimated ovulation day.
if (ovulationDate && sameDay(date, ovulationDate)) {
  element.classList.add("ovulation-day");
  element.title = element.title
    ? `${element.title}; Estimated ovulation day`
    : "Estimated ovulation day";
}

// Today's date.
if (sameDay(date, today)) {
  element.classList.add("today");
  element.title = element.title
    ? `${element.title}; Today`
    : "Today";
}
grid.appendChild(element);
grid.appendChild(element);

}

renderHomeCalendar();
}


function renderHomeCalendar() {
  const grid = $("#home-calendar");

  if (!grid) return;

  grid.innerHTML = "";

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const firstDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );

  const weekdays = ["M", "T", "W", "T", "F", "S", "S"];

  weekdays.forEach((day) => {
    const element = document.createElement("div");
    element.className = "weekday";
    element.textContent = day;
    grid.appendChild(element);
  });

  const offset = (firstDay.getDay() + 6) % 7;

  for (let i = 0; i < offset; i++) {
    const empty = document.createElement("div");
    empty.className = "mini-day empty";
    grid.appendChild(empty);
  }

  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate();

  const settings = getPredictionSettings();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      day
    );

    date.setHours(12, 0, 0, 0);

    const element = document.createElement("div");
    element.className = "mini-day";
    element.textContent = day;

    if (isExpectedPeriodDay(date, settings)) {
      element.classList.add("expected-period");
    }

    if (sameDay(date, today)) {
      element.classList.add("today");
    }

    grid.appendChild(element);
  }
}

$("#prev-month").addEventListener("click", () => {
  calendarMonth.setMonth(calendarMonth.getMonth() - 1);
  renderCalendar();
});

$("#next-month").addEventListener("click", () => {
  calendarMonth.setMonth(calendarMonth.getMonth() + 1);
  renderCalendar();
});

/* PERIOD TRACKING */

function formatTrackingDate(value) {
  const date = parseDate(value);
  return date ? formatDate(date) : value;
}

function renderPeriodHistory() {
  const periods = getSavedPeriods();

  periods.sort((a, b) => b.start.localeCompare(a.start));

  periodHistory.innerHTML = "";

  $("#insight-record-count").textContent = periods.length;
  $("#history-count").textContent =
    `${periods.length} ${periods.length === 1 ? "record" : "records"}`;

  if (periods.length === 0) {
    const message = document.createElement("p");
    message.textContent =
      "No periods recorded yet. Your saved periods will appear here.";

    periodHistory.appendChild(message);
    return;
  }

  periods.forEach((period) => {
    const item = document.createElement("article");
    item.className = "period-history-item";

    const details = document.createElement("div");

    const title = document.createElement("strong");
    title.textContent = "🩷 Period record";

    const startText = document.createElement("p");
    startText.textContent =
      `Started: ${formatTrackingDate(period.start)}`;

    details.appendChild(title);
    details.appendChild(startText);

    if (period.end) {
      const endText = document.createElement("p");
      endText.textContent =
        `Ended: ${formatTrackingDate(period.end)}`;

      details.appendChild(endText);
    } else {
      const ongoingText = document.createElement("p");
      ongoingText.textContent = "End date not recorded";
      details.appendChild(ongoingText);
    }

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-period-button";
    deleteButton.textContent = "Delete";
    deleteButton.dataset.periodId = period.id;
    deleteButton.setAttribute(
      "aria-label",
      `Delete period record starting ${formatTrackingDate(period.start)}`
    );

    item.appendChild(details);
    item.appendChild(deleteButton);
    periodHistory.appendChild(item);
  });
}

trackingForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const start = trackingStart.value;
  const end = trackingEnd.value;

  if (!start) {
    trackingMessage.textContent = "Please choose your period start date.";
    return;
  }

  if (end && end < start) {
    trackingMessage.textContent =
      "The end date cannot be before the start date.";
    return;
  }

  const periods = getSavedPeriods();

  if (periods.some((period) => period.start === start)) {
    trackingMessage.textContent =
      "A record with this start date already exists. Delete the old record first.";
    return;
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  periods.push({ id, start, end });

 const settings = getSettings();
settings.lastPeriod = start;
saveSettings(settings);
lastPeriodInput.value = start;


  trackingMessage.textContent = "Your period record has been saved! 🌸";

  trackingForm.reset();

  renderPeriodHistory();
  updatePredictions();
  renderCalendar();
});

periodHistory.addEventListener("click", (event) => {
  const button = event.target.closest(".delete-period-button");

  if (!button) return;

  if (!window.confirm("Are you sure you want to delete this period record?")) {
    return;
  }

  const remainingPeriods = getSavedPeriods().filter(
    (period) => period.id !== button.dataset.periodId
  );
  const deletedPeriod = getSavedPeriods().find(
    (period) => period.id === button.dataset.periodId
  );

  if (savePeriods(remainingPeriods)) {
    const settings = getSettings();

    if (deletedPeriod && deletedPeriod.start === settings.lastPeriod) {
      const latestPeriod = remainingPeriods
        .slice()
        .sort((a, b) => b.start.localeCompare(a.start))[0];
      const nextLastPeriod = latestPeriod ? latestPeriod.start : "";

      if (!updateLastPeriod(nextLastPeriod)) {
        trackingMessage.textContent =
          "The record was deleted, but your cycle settings could not be updated.";
        renderPeriodHistory();
        return;
      }
    }

    trackingMessage.textContent = "Period record deleted.";
    renderPeriodHistory();
    updatePredictions();
    renderCalendar();
  } else {
    trackingMessage.textContent =
      "Could not delete your record. Please check your browser storage.";
  }
});

/* SETTINGS */

function loadSettingsIntoForm() {
  const settings = getSettings();

  lastPeriodInput.value = settings.lastPeriod;
  cycleLengthInput.value = String(settings.cycleLength);
  periodLengthInput.value = String(settings.periodLength);
}

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const settings = {
    lastPeriod: lastPeriodInput.value,
    cycleLength: Number(cycleLengthInput.value),
    periodLength: Number(periodLengthInput.value)
  };

  if (
    settings.cycleLength < 21 ||
    settings.cycleLength > 35 ||
    settings.periodLength < 2 ||
    settings.periodLength > 10
  ) {
    settingsMessage.textContent = "Please check your cycle settings.";
    return;
  }

  if (!saveSettings(settings)) {
    settingsMessage.textContent =
      "Could not save settings. Please check your browser storage.";
    return;
  }

  settingsMessage.textContent = "Your settings have been saved! 🩷";

  updatePredictions();
  renderCalendar();
});

/* DATE LABEL */

function updateDateLabel() {
  const label = $("#today-label");

  if (!label) return;

  label.textContent = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).toUpperCase();
}

/* INITIALIZE APP */

function initializeApp() {
  updateDateLabel();
  loadSettingsIntoForm();
  updatePredictions();
  renderCalendar();
  renderPeriodHistory();
  showPage("home");

  // Keep the existing calendar and saved period history available.
  const settings = getSettings();

  if (settings.lastPeriod) {
    lastPeriodInput.value = settings.lastPeriod;
  }
}

initializeApp();

/* OFFLINE SUPPORT */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then(() => {
        console.log("CycleCare offline support is ready.");
      })
      .catch((error) => {
        console.error("Offline support registration failed:", error);
      });
  });
}