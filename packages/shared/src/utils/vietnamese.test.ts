import { describe, it, expect } from 'vitest';
import { normalizeVietnamese } from './vietnamese';

describe('normalizeVietnamese', () => {
  it('handles null, undefined, or empty string', () => {
    expect(normalizeVietnamese(null)).toBe('');
    expect(normalizeVietnamese(undefined)).toBe('');
    expect(normalizeVietnamese('')).toBe('');
    expect(normalizeVietnamese('   ')).toBe('');
  });

  it('removes Vietnamese accents and lowercases characters', () => {
    expect(normalizeVietnamese('Lập trình viên Frontend')).toBe('lap trinh vien frontend');
    expect(normalizeVietnamese('Thực tập sinh Marketing')).toBe('thuc tap sinh marketing');
    expect(normalizeVietnamese('Đà Nẵng')).toBe('da nang');
    expect(normalizeVietnamese('Hà Nội')).toBe('ha noi');
    expect(normalizeVietnamese('TP. Hồ Chí Minh')).toBe('tp. ho chi minh');
  });

  it('preserves ASCII letters and numbers while trimming', () => {
    expect(normalizeVietnamese('  React & Node.js 2026!  ')).toBe('react & node.js 2026!');
  });
});
