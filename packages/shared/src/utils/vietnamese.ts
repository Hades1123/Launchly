/**
 * Normalizes a Vietnamese string by removing diacritics, converting special characters
 * (such as d/D for đ/Đ), trimming leading/trailing whitespace, and converting to lowercase.
 */
export function normalizeVietnamese(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (match) => (match === 'đ' ? 'd' : 'D'))
    .toLowerCase()
    .trim();
}
