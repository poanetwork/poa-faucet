module.exports = {
  'env': {
    'browser': false,
    'commonjs': true,
    'es2021': true,
    'node': true
  },
  'extends': [
    'eslint:recommended'
  ],
  'parserOptions': {
    'ecmaVersion': 'latest'
  },
  'rules': {
    'indent': [
      'error',
      2
    ],
    'linebreak-style': [
      'error',
      'unix'
    ],
    'quotes': [
      'error',
      'single'
    ],
    'semi': [
      'error',
      'always'
    ]
  }
};
