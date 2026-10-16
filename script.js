"use strict";

const form = document.getElementById("cycle-form");
const lastPeriodInput = document.getElementById("last-period");
const cycleLengthInput = document.getElementById("cycle-length");
const periodLengthInput = document.getElementById("period-length");
const formMessage = document.getElementById("form-message");
const results = document.getElementById("results");
const editButton = document.getElementById("edit-button");

// Use calendar dates rather than timestamps to avoid time-zone shifts.
function parseDate(value) {
const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

if (!match) return null;

const year = Number(match[1]);
const month = Number(match[2]);
const day = Number(match[3]);
const date = new Date(Date.UTC(year, month - 1, day));

if (
date.getUTCFullYear() !== year ||
date.getUTCMonth() !== month - 1 ||
date.getUTCDate() !== day
) {
return null;
}

return date;
}

function addDays(date, days) {
const result = new Date(date.getTime());
result.setUTCDate(result.getUTCDate() + days);
return result;
}

function formatDate(date) {
return new Intl.DateTimeFormat("en", {
day: "numeric",
month: "short",
year: "numeric",
timeZone: "UTC"
}).format(date);
}

function daysBetween(first, second) {
return Math.round((second - first) / 86400000);
}

function showMessage(message) {
formMessage.textContent = message;
}

function calculateCycle(event) {
event.preventDefault();
showMessage("");

const lastPeriod = parseDate(lastPeriodInput.value);
const cycleLength = Number(cycleLengthInput.value);
const periodLength = Number(periodLengthInput.value);

if (!lastPeriod) {
showMessage("Please enter a valid period start date.");
return;
}

const today = new Date();
const todayUTC = new Date(Date.UTC(
today.getFullYear(),
today.getMonth(),
today.getDate()
));

if (lastPeriod > todayUTC) {
showMessage("The period start date cannot be in the future.");
return;
}

if (!Number.isInteger(cycleLength) ||
cycleLength < 15 || cycleLength > 60) {
showMessage("Enter a cycle length between 15 and 60 days.");
return;
}

if (!Number.isInteger(periodLength) ||
periodLength < 1 || periodLength > 15) {
showMessage("Enter a period duration between 1 and 15 days.");
return;
}

// Estimate the next period by advancing complete cycles.
// This prevents the displayed prediction from remaining in the past.
const elapsedDays = daysBetween(lastPeriod, todayUTC);
const completedCycles = Math.floor(elapsedDays / cycleLength);
const nextPeriod = addDays(
lastPeriod,
(completedCycles + 1) * cycleLength
);

// Simplified estimates only; not confirmation of ovulation.
const ovulation = addDays(nextPeriod, -14);
const fertileStart = addDays(ovulation, -5);
const fertileEnd = addDays(ovulation, 1);

document.getElementById("next-period-date").textContent =
formatDate(nextPeriod);

const daysUntilPeriod = daysBetween(todayUTC, nextPeriod);
document.getElementById("period-countdown").textContent =
daysUntilPeriod === 1
? "Estimated in 1 day"
: `Estimated in ${daysUntilPeriod} days`;

document.getElementById("ovulation-date").textContent =
formatDate(ovulation);

document.getElementById("fertile-window").textContent =
`${formatDate(fertileStart)} – ${formatDate(fertileEnd)}`;

document.getElementById("cycle-summary").textContent =
`${cycleLength} days`;

document.getElementById("duration-summary").textContent =
`Period duration: ${periodLength} days`;

results.hidden = false;
results.scrollIntoView({ behavior: "smooth", block: "start" });
}

form.addEventListener("submit", calculateCycle);

editButton.addEventListener("click", () => {
results.hidden = true;
lastPeriodInput.focus();
form.scrollIntoView({ behavior: "smooth", block: "start" });
});

// Set a convenient default date without overwriting a saved user choice.
const today = new Date();
const localToday = [
today.getFullYear(),
String(today.getMonth() + 1).padStart(2, "0"),
String(today.getDate()).padStart(2, "0")
].join("-");

lastPeriodInput.max = localToday;
lastPeriodInput.value = localToday;


// CycleCare calendar functionality

const calendarGrid = document.getElementById("calendar-grid");
const calendarMonthTitle = document.getElementById("calendar-month");
const previousMonthButton = document.getElementById("prev-month");
const nextMonthButton = document.getElementById("next-month");

const calendarWeekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

let calendarDate = new Date();
calendarDate.setDate(1);

function renderCalendar() {
  if (!calendarGrid || !calendarMonthTitle) return;

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  calendarMonthTitle.textContent = calendarDate.toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" }
  );

  calendarGrid.innerHTML = "";

  calendarWeekdays.forEach((weekday) => {
    const heading = document.createElement("div");
    heading.className = "calendar-day weekday";
    heading.textContent = weekday;
    calendarGrid.appendChild(heading);
  });

  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  for (let i = 0; i < firstDay; i++) {
    const emptyDay = document.createElement("div");
    emptyDay.className = "calendar-day empty";
    calendarGrid.appendChild(emptyDay);
  }

  const today = new Date();
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
  ].join("-");

  const lastPeriodValue = lastPeriodInput.value;
  const cycleLength = Number(cycleLengthInput.value);
  const periodLength = Number(periodLengthInput.value);

  let lastPeriodDate = null;

  if (lastPeriodValue) {
    const parts = lastPeriodValue.split("-").map(Number);

    if (parts.length === 3 && parts.every(Number.isFinite)) {
      lastPeriodDate = Date.UTC(parts[0], parts[1] - 1, parts[2]);
    }
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = [
      year,
      String(month + 1).padStart(2, "0"),
      String(day).padStart(2, "0")
    ].join("-");

    const dayElement = document.createElement("div");
    dayElement.className = "calendar-day";
    dayElement.textContent = day;

    if (dateKey === todayKey) {
      dayElement.classList.add("today");
    }

    if (
      lastPeriodDate !== null &&
      Number.isFinite(cycleLength) &&
      cycleLength >= 21 &&
      cycleLength <= 45 &&
      Number.isFinite(periodLength) &&
      periodLength >= 1 &&
      periodLength <= 10
    ) {
      const currentDate = Date.UTC(year, month, day);
      const difference = Math.round(
        (currentDate - lastPeriodDate) / 86400000
      );

      const dayInCycle = ((difference % cycleLength) + cycleLength)
        % cycleLength;

      if (dayInCycle < periodLength) {
        dayElement.classList.add("expected-period");
        dayElement.title = "Estimated period day";
      }
    }

    calendarGrid.appendChild(dayElement);
  }
}

previousMonthButton.addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
});

nextMonthButton.addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
});

lastPeriodInput.addEventListener("change", renderCalendar);
cycleLengthInput.addEventListener("change", renderCalendar);
periodLengthInput.addEventListener("change", renderCalendar);

form.addEventListener("submit", () => {
  renderCalendar();
});

renderCalendar();

// CycleCare Period Tracking

const trackingForm = document.getElementById("tracking-form");
const trackingStart = document.getElementById("tracking-start");
const trackingEnd = document.getElementById("tracking-end");
const trackingMessage = document.getElementById("tracking-message");
const periodHistory = document.getElementById("period-history");

const TRACKING_STORAGE_KEY = "cyclecare-period-history";

function getSavedPeriods() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(TRACKING_STORAGE_KEY) || "[]"
    );

    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function savePeriods(periods) {
  try {
    localStorage.setItem(
      TRACKING_STORAGE_KEY,
      JSON.stringify(periods)
    );
    return true;
  } catch {
    trackingMessage.textContent =
      "Could not save your record. Please check your browser storage.";
    return false;
  }
}

function formatTrackingDate(dateString) {
  const parts = dateString.split("-").map(Number);

  const date = new Date(
    Date.UTC(parts[0], parts[1] - 1, parts[2])
  );

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
}

function renderPeriodHistory() {
  const periods = getSavedPeriods();

  periodHistory.innerHTML = "";

  if (periods.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.textContent =
      "No periods recorded yet. Your saved periods will appear here.";
    periodHistory.appendChild(emptyMessage);
    return;
  }

  periods.sort((a, b) => b.start.localeCompare(a.start));

  periods.forEach((period) => {
    const item = document.createElement("article");
    item.className = "period-history-item";

    const details = document.createElement("div");

    const title = document.createElement("strong");
    title.textContent = "🩷 Period record";

    const startText = document.createElement("p");
    startText.textContent =
      "Started: " + formatTrackingDate(period.start);

    details.appendChild(title);
    details.appendChild(startText);

    if (period.end) {
      const endText = document.createElement("p");
      endText.textContent =
        "Ended: " + formatTrackingDate(period.end);
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
      "Delete period record starting " + formatTrackingDate(period.start)
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
    trackingMessage.textContent =
      "Please choose your period start date.";
    return;
  }

  if (end && end < start) {
    trackingMessage.textContent =
      "The end date cannot be before the start date.";
    return;
  }

  const periods = getSavedPeriods();

  const duplicate = periods.some(
    (period) => period.start === start
  );

  if (duplicate) {
    trackingMessage.textContent =
      "A record with this start date already exists. You can delete the old record first.";
    return;
  }

  periods.push({
    id: String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8),
    start,
    end
  });

  if (!savePeriods(periods)) return;

  trackingMessage.textContent = "Your period record has been saved! 🌸";

  trackingForm.reset();
  renderPeriodHistory();
});

periodHistory.addEventListener("click", (event) => {
  const button = event.target.closest(".delete-period-button");

  if (!button) return;

  const confirmed = window.confirm(
    "Are you sure you want to delete this period record?"
  );

  if (!confirmed) return;

  const periods = getSavedPeriods().filter(
    (period) => period.id !== button.dataset.periodId
  );

  if (savePeriods(periods)) {
    trackingMessage.textContent = "Period record deleted.";
    renderPeriodHistory();
  }
});

renderPeriodHistory();
// Register CycleCare's service worker for offline support
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