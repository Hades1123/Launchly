import { describe, expect, it } from 'vitest';
import { escapeHtml } from '@/providers/mail/html';

describe('escapeHtml', () => {
  it('escapes the five HTML special characters', () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;',
    );
  });

  it('leaves other text unchanged', () => {
    expect(escapeHtml('Công ty Acme 123')).toBe('Công ty Acme 123');
  });
});
