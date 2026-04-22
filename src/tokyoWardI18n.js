/**
 * Tokyo municipality names from API are canonical English romanization (e.g. Shibuya-ku).
 * Labels are localized for the UI; `city` sent to the API stays the canonical string.
 */

export function tokyoWardSlug(canonical) {
  return String(canonical || '').replace(/-/g, '').toLowerCase();
}

/** Readable English when no locale-specific translation exists. */
export function formatTokyoWardEn(canonical) {
  const w = String(canonical || '');
  if (w.endsWith('-ku')) return `${w.slice(0, -3)} Ward`;
  if (w.endsWith('-shi')) return `${w.slice(0, -4)} City`;
  if (w.endsWith('-machi')) return `${w.slice(0, -6)}`;
  if (w.endsWith('-mura')) return `${w.slice(0, -5)}`;
  return w;
}

export function labelTokyoWard(canonical, t) {
  const slug = tokyoWardSlug(canonical);
  if (!slug) return '';
  return t(`register.tokyoWards.${slug}`, { defaultValue: formatTokyoWardEn(canonical) });
}
