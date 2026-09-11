import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: ['dist', '**/dist/**', 'public', '**/public/**'],
  vue: false,
  test: false, // Tests use node:test, not Vitest.
})
