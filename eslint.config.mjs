import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: ['dist', '**/dist/**', 'public', '**/public/**'],
  vue: true,
})
