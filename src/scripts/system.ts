/**
 * The reader's system (Windows, macOS or Linux), one choice for the whole site: every block that
 * differs by system follows it, and it is remembered in this browser.
 *
 * The choice lives on <html data-system>; global.css hides what is marked for another system
 * (data-for="windows", data-for="macos linux"). Until a choice is made it is guessed from the
 * browser; without the script, the Windows blocks show.
 */
export type System = 'windows' | 'macos' | 'linux';

const KEY = 'clank-site-system';
const EVENT = 'clank-system';
const SYSTEMS: System[] = ['windows', 'macos', 'linux'];

function guess(): System {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = `${nav.userAgentData?.platform ?? ''} ${navigator.platform ?? ''} ${navigator.userAgent}`;
  if (/win/i.test(platform)) return 'windows';
  if (/mac|iphone|ipad/i.test(platform)) return 'macos';
  return 'linux';
}

export function currentSystem(): System {
  const set = document.documentElement.dataset.system as System | undefined;
  if (set && SYSTEMS.includes(set)) return set;
  try {
    const saved = localStorage.getItem(KEY) as System | null;
    if (saved && SYSTEMS.includes(saved)) return saved;
  } catch {
    /* storage may be blocked: guess instead */
  }
  return guess();
}

/** Shows the blocks for this system everywhere on the page, and tells every switch. */
export function setSystem(system: System, remember = true) {
  document.documentElement.dataset.system = system;
  if (remember) {
    try {
      localStorage.setItem(KEY, system);
    } catch {
      /* not remembered, but still shown */
    }
  }
  document.dispatchEvent(new CustomEvent<System>(EVENT, { detail: system }));
}

export function onSystem(listener: (system: System) => void) {
  document.addEventListener(EVENT, (event) => listener((event as CustomEvent<System>).detail));
}

if (!document.documentElement.dataset.system) setSystem(currentSystem(), false);
