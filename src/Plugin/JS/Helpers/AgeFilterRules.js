// AgeFilterRules.js - Calculate one effective item age for ranking, filtering, and labels.
.pragma library
.import "../Contracts/AgeUnit.js" as AgeUnit
.import "Config.js" as Config
var MILLISECONDS_PER_MINUTE = 60000;
var MINUTES_PER_HOUR = 60;
var HOURS_PER_DAY = 24;
var DAYS_PER_WEEK = 7;
var MONTHS_PER_YEAR = 12;
var MILLISECONDS_PER_HOUR = MILLISECONDS_PER_MINUTE * MINUTES_PER_HOUR;
var MILLISECONDS_PER_DAY = MILLISECONDS_PER_HOUR * HOURS_PER_DAY;

// Keep damaged saved values from changing the visible result policy.
function normalize(value) {
    const candidate = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const rawAmount = candidate.value;
    const amount = (typeof rawAmount === "number" || (typeof rawAmount === "string" && /^\d+$/.test(rawAmount))) ? Number(rawAmount) : NaN;
    return {
        value: Number.isInteger(amount) && amount >= Config.minAgeFilterValue && amount <= Config.maxAgeFilterValue ? amount : Config.defaultAgeFilter.value,
        unit: AgeUnit.isValid(candidate.unit) ? candidate.unit : Config.defaultAgeFilter.unit
    };
}

// Shift calendar months in UTC and clamp dates such as May 31 to February 28.
function monthsBefore(now, count) {
    const date = new Date(now);
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - count);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, lastDay));
    return date.getTime();
}

// Use UTC calendar boundaries for each positive age amount.
function cutoff(value, now) {
    const setting = normalize(value);
    if (setting.unit === AgeUnit.Days) return now - setting.value * MILLISECONDS_PER_DAY;
    if (setting.unit === AgeUnit.Weeks) return now - setting.value * MILLISECONDS_PER_DAY * DAYS_PER_WEEK;
    return monthsBefore(now, setting.value * (setting.unit === AgeUnit.Years ? MONTHS_PER_YEAR : 1));
}

// Derive one age from path metadata, provider history, and launches from this plugin.
function itemAge(record, now) {
    const modified = Number(record.modifiedAt);
    const opened = Number(record.openedAt);
    const launched = Number(record.launchedAt);
    const hasModified = Number.isFinite(modified) && modified > 0;
    const hasOpened = Number.isFinite(opened) && opened > 0;
    const historyDate = hasModified && hasOpened ? Math.min(modified, opened) : hasModified ? modified : hasOpened ? opened : 0;
    const date = Math.max(historyDate, Number.isFinite(launched) && launched > 0 ? launched : 0);
    if (date <= 0) return { date: 0, label: "" };

    const elapsed = Math.max(0, Number(now) - date);
    if (elapsed < MILLISECONDS_PER_MINUTE) return { date: date, label: "just now" };
    if (elapsed < MILLISECONDS_PER_HOUR) return { date: date, label: Math.floor(elapsed / MILLISECONDS_PER_MINUTE) + "m ago" };
    if (elapsed < MILLISECONDS_PER_DAY) return { date: date, label: Math.floor(elapsed / MILLISECONDS_PER_HOUR) + "h ago" };
    if (elapsed < MILLISECONDS_PER_DAY * DAYS_PER_WEEK) return { date: date, label: Math.floor(elapsed / MILLISECONDS_PER_DAY) + "d ago" };
    if (date > monthsBefore(now, 1)) return { date: date, label: Math.floor(elapsed / (MILLISECONDS_PER_DAY * DAYS_PER_WEEK)) + "w ago" };

    const current = new Date(now);
    const previous = new Date(date);
    let months = (current.getUTCFullYear() - previous.getUTCFullYear()) * MONTHS_PER_YEAR + current.getUTCMonth() - previous.getUTCMonth();
    if (months > 0 && monthsBefore(now, months) < date) months--;
    if (months < MONTHS_PER_YEAR) return { date: date, label: months + "mo ago" };
    return { date: date, label: Math.floor(months / MONTHS_PER_YEAR) + "y ago" };
}

// Unknown dates stay visible until the file service can answer.
function olderThan(modifiedAt, threshold) {
    return threshold > 0 && Number(modifiedAt) > 0 && Number(modifiedAt) < threshold;
}
