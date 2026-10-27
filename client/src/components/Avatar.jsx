import { initials } from '../hooks.js';

// Round badge with the person's initials (no photos needed)
export default function Avatar({ name, size = 44 }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
