import type { GeometryKind } from '../contracts';
export function PartIcon({kind, color}: {kind: GeometryKind; color: string}) {
  const shapes = {
    frame: <><path d="M8 8L24 24M24 8L8 24" strokeWidth="4"/><rect x="11" y="11" width="10" height="10" rx="2"/></>,
    'landing-gear': <><path d="M8 9L10 23H25M23 9L21 23M6 23H26"/><path d="M10 12H21"/></>,
    motor: <><ellipse cx="16" cy="10" rx="9" ry="4"/><path d="M7 10V23C7 28 25 28 25 23V10M16 3V7"/><ellipse cx="16" cy="22" rx="9" ry="4"/></>,
    propeller: <><circle cx="16" cy="16" r="3"/><path d="M13 14C-1 3 5 2 15 11M19 18C33 29 27 30 17 21" strokeWidth="4"/></>,
    guard: <><circle cx="16" cy="16" r="12"/><path d="M4 16H13M19 16H28M16 4V13M16 19V28"/></>,
    controller: <><rect x="7" y="7" width="18" height="18" rx="2"/><rect x="12" y="12" width="8" height="8"/><path d="M4 10H7M4 16H7M4 22H7M25 10H28M25 16H28M25 22H28"/></>,
    battery: <><rect x="6" y="8" width="20" height="20" rx="3"/><path d="M12 8V4H20V8M17 12L12 19H18L15 24"/></>,
  };
  return <svg viewBox="0 0 32 32" width="32" height="32" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[kind]}</svg>;
}
