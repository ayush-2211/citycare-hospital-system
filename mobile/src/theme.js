export const colors = {
  ink: '#14232d',
  muted: '#5a6b78',
  paper: '#f3f6f9',
  surface: '#ffffff',
  line: '#d8e1e8',
  lineStrong: '#bccad5',
  primary: '#0b6aa2',
  primaryDark: '#08507c',
  primaryTint: '#e3f1f9',
  danger: '#b42318',
  dangerTint: '#fdecea',
  ok: '#0a6b4b',
  okTint: '#dcf2e8',
  warnTint: '#fcefd0',
  warnInk: '#7a4f00',
};

export const statusStyle = {
  pending: { bg: colors.warnTint, fg: colors.warnInk, label: 'Pending' },
  confirmed: { bg: colors.primaryTint, fg: colors.primaryDark, label: 'Confirmed' },
  completed: { bg: colors.okTint, fg: '#07583c', label: 'Completed' },
  cancelled: { bg: '#eceff2', fg: '#56616a', label: 'Cancelled' },
};
