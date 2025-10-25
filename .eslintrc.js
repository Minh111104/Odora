module.exports = {
  root: true,
  extends: ['expo', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'warn',
    'react/prop-types': 'off',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
