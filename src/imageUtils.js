/**
 * Safe `background-image` value for arbitrary URLs (query strings, etc.).
 */
export function cssUrlValue(url) {
  if (url == null || url === '') return 'none';
  const s = String(url).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `url("${s}")`;
}
