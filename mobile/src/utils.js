// Date helpers: dates are 'YYYY-MM-DD' strings and times are 'HH:MM' strings, exactly as the API sends them.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const addDays = (s, n) => {
  const d = new Date(`${s}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const weekday = (s) => DAYS[new Date(`${s}T00:00:00`).getDay()];

export function formatDate(s) {
  if (!s) return '';
  const [y, m, d] = String(s).slice(0, 10).split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}
export function formatTime(t) {
  if (!t) return '';
  const [h, m] = String(t).split(':');
  const hour = Number(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}
export function formatStamp(s) {
  if (!s) return '';
  const [d, t] = String(s).split(/[ T]/);
  return `${formatDate(d)}, ${formatTime((t || '00:00').slice(0, 5))}`;
}
