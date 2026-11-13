const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
} as const;

/** Escapes text for an HTML email body; shared by every mail template. */
export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) => HTML_ENTITIES[character as keyof typeof HTML_ENTITIES],
  );
}
