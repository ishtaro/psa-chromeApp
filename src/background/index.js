import { fetchAndStoreTat } from "./tat-fetcher.js";
import { fetchAndStoreHolidays } from "./holidays-fetcher.js";

const TAT_ALARM = "psa-ext-refresh-tat";
const HOLIDAYS_ALARM = "psa-ext-refresh-holidays";
const DAILY_MINUTES = 60 * 24;
const WEEKLY_MINUTES = 60 * 24 * 7;

async function refreshAll() {
  await Promise.allSettled([fetchAndStoreTat(), fetchAndStoreHolidays()]);
}

chrome.runtime.onInstalled.addListener(() => {
  refreshAll();
  chrome.alarms.create(TAT_ALARM, { periodInMinutes: DAILY_MINUTES });
  chrome.alarms.create(HOLIDAYS_ALARM, { periodInMinutes: WEEKLY_MINUTES });
});

chrome.runtime.onStartup.addListener(() => {
  refreshAll();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === TAT_ALARM) fetchAndStoreTat();
  if (alarm.name === HOLIDAYS_ALARM) fetchAndStoreHolidays();
});
