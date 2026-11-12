import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/node_modules', '**/dist', '**/build', '**/coverage', '**/.next', '**/playwright-report', '**/test-results', '**/generated', '**/*.min.js', 'docs'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
