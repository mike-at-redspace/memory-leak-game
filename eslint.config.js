import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'
import eslintAll from '@eslint/js/src/configs/eslint-all.js'
import eslintRecommended from '@eslint/js/src/configs/eslint-recommended.js'

const compat = new FlatCompat({
  baseDirectory: fileURLToPath(new URL('.', import.meta.url)),
  recommendedConfig: eslintRecommended,
  allConfig: eslintAll
})

export default [
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    }
  },
  ...compat.env({
    browser: true,
    es2021: true
  }),
  {
    ignores: ['dist/']
  },
  ...compat.extends('eslint:recommended', 'plugin:prettier/recommended'),
  {
    rules: {
      'prettier/prettier': 'warn',
      'no-unused-vars': 'warn',
      'no-console': 'off'
    }
  }
]
