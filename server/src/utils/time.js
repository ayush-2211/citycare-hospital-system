// Small date/time helpers. Dates are 'YYYY-MM-DD' strings and times are 'HH:MM:SS' strings everywhere.
const pad = (n) => String(n).padStart(2, '0');

// '9:00' | '09:00' | '09:00:00'  ->  '09:00:00'   (null when invalid)
function toTime(t) {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(t || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}:00`;
}

const hhmm = (t) => (t ? String(t).slice(0, 5) : t);
const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d)) && !Number.isNaN(Date.parse(`${d}T00:00:00`));
const toMinutes = (t) => { const [h, m] = String(t).split(':'); return Number(h) * 60 + Number(m); };
const fromMinutes = (mins) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}:00`;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function nowTime() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}
function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const dayOfWeek = (dateStr) => new Date(`${dateStr}T00:00:00`).getDay(); // 0 = Sunday

// Every slot start time between `from` and `to`, `step` minutes apart
function buildSlots(from, to, step) {
  const out = [];
  for (let m = toMinutes(from); m + step <= toMinutes(to); m += step) out.push(fromMinutes(m));
  return out;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const prettyDate = (d) => { const [y, m, day] = String(d).split('-'); return `${Number(day)} ${MONTHS[Number(m) - 1]} ${y}`; };
function prettyTime(t) {
  const [h, m] = String(t).split(':');
  const hour = Number(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

module.exports = { toTime, hhmm, isDate, toMinutes, todayStr, nowTime, addDays, dayOfWeek, buildSlots, prettyDate, prettyTime };
