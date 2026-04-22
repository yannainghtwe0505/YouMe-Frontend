/** Supported app locale codes (matches backend /me/locale). */
export const APP_LOCALES = [
  { code: 'en', nativeLabel: 'English' },
  { code: 'ja', nativeLabel: '日本語' },
  { code: 'my', nativeLabel: 'မြန်မာဘာသာ' },
];

export const LOCALE_CYCLE_ORDER = ['en', 'ja', 'my'];

export const LANG_STORAGE_KEY = 'youme_lang';
/** Set when user confirms language on /language (before auth). */
export const LANG_GATE_KEY = 'youme_locale_onboarding_done';

export function resolveLocaleFromNavigator() {
  if (typeof navigator === 'undefined') return 'en';
  const raw = navigator.language || navigator.languages?.[0] || 'en';
  const primary = String(raw).split('-')[0].toLowerCase();
  if (primary === 'ja') return 'ja';
  if (primary === 'my') return 'my';
  return 'en';
}

export function isAppLocale(code) {
  const b = String(code || '').split('-')[0].toLowerCase();
  return LOCALE_CYCLE_ORDER.includes(b);
}

export function normalizeToAppLocale(code) {
  const b = String(code || '').split('-')[0].toLowerCase();
  return isAppLocale(b) ? b : 'en';
}

export function isLanguageGateComplete() {
  try {
    return localStorage.getItem(LANG_GATE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markLanguageGateComplete() {
  try {
    localStorage.setItem(LANG_GATE_KEY, '1');
  } catch {
    /* private mode */
  }
}
