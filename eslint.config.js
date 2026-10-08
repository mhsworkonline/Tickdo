// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'android/*', 'ios/*', '.expo/*', 'supabase/functions/*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Spec: strict TypeScript, no `any`.
      '@typescript-eslint/no-explicit-any': 'error',
      // Spec: no LLM / generative AI and no paid cloud OCR/vision anywhere in the app.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'openai',
                '@anthropic-ai/*',
                '@google/generative-ai',
                '@google/genai',
                '@google-cloud/vision',
                'ai',
                '@ai-sdk/*',
                'langchain',
                '@langchain/*',
              ],
              message: 'Tickdo forbids LLM / generative AI and paid cloud OCR. Use on-device ML Kit and deterministic rules.',
            },
          ],
        },
      ],
    },
  },
]);
