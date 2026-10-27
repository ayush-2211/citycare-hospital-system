import { useCallback, useEffect, useState } from 'react';

// Runs an async loader on mount (and when `deps` change) and tracks loading / error state.
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    return loader()
      .then((data) => setState({ data, loading: false, error: '' }))
      .catch((err) => setState({ data: null, loading: false, error: err.message }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');

export const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const addDays = (s, n) => { const d = new Date(`${s}T00:00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const weekday = (s) => DAYS[new Date(`${s}T00:00:00`).getDay()];

// '2026-11-12' -> '12 Nov 2026'
export function formatDate(s) {
  if (!s) return '';
  const [y, m, d] = String(s).slice(0, 10).split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}
// '14:30' -> '2:30 PM'
export function formatTime(t) {
  if (!t) return '';
  const [h, m] = String(t).split(':');
  const hour = Number(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}
// MySQL timestamps come as 'YYYY-MM-DD HH:MM:SS'
export function formatStamp(s) {
  if (!s) return '';
  const [d, t] = String(s).split(/[ T]/);
  return `${formatDate(d)}, ${formatTime((t || '00:00').slice(0, 5))}`;
}
export function ageFrom(dob) {
  if (!dob) return '';
  const b = new Date(`${String(dob).slice(0, 10)}T00:00:00`);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a -= 1;
  return a;
}
export const initials = (name) => name.replace(/^Dr\.?\s+/i, '').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
