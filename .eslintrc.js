module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
    'local',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking'
  ],
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  rules: {
    '@typescript-eslint/adjacent-overload-signatures': 'error',
    '@typescript-eslint/array-type': 'error',
    '@typescript-eslint/ban-types': 'error',
    '@typescript-eslint/class-name-casing': 'error',
    '@typescript-eslint/consistent-type-assertions': 'error',
    '@typescript-eslint/indent': ['error', 2],
    '@typescript-eslint/interface-name-prefix': 'error',
    '@typescript-eslint/no-empty-interface': 'error',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-misused-new': 'error',
    '@typescript-eslint/no-namespace': 'error',
    '@typescript-eslint/no-parameter-properties': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-var-requires': 'error',
    '@typescript-eslint/prefer-for-of': 'error',
    '@typescript-eslint/prefer-function-type': 'error',
    '@typescript-eslint/prefer-namespace-keyword': 'error',
    '@typescript-eslint/quotes': ['error', 'single'],
    '@typescript-eslint/triple-slash-reference': 'error',
    '@typescript-eslint/unified-signatures': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    'arrow-body-style': 'error',
    'arrow-parens': ['error', 'as-needed'],
    'camelcase': 'error',
    'complexity': 'off',
    'constructor-super': 'error',
    'curly': ['error', 'multi-or-nest'],
    'dot-notation': 'error',
    'eol-last': 'error',
    'eqeqeq': ['error', 'smart'],
    'guard-for-in': 'error',
    'id-blacklist': [
      'error', 'any',
      'Number', 'number',
      'String', 'string',
      'Boolean', 'boolean',
      'Undefined', 'undefined',
    ],
    'id-match': 'error',
    'max-classes-per-file': ['error', 1],
    'max-len': ['error', {
      code: 120,
    }],
    'new-parens': 'error',
    'no-bitwise': 'off',
    'no-caller': 'error',
    'no-cond-assign': 'error',
    'no-console': 'off',
    'no-debugger': 'error',
    'no-empty': ['error', {
      allowEmptyCatch: true
    }],
    'no-eval': 'error',
    'no-fallthrough': 'off',
    'no-invalid-this': 'off',
    'no-multiple-empty-lines': ['error', {
      max: 2,
    }],
    'no-new-wrappers': 'error',
    'no-shadow': ['error', {
      hoist: 'all',
    }],
    'no-throw-literal': 'error',
    'no-trailing-spaces': 'error',
    'no-undef-init': 'error',
    'no-underscore-dangle': 'error',
    'no-unsafe-finally': 'error',
    'no-unused-expressions': 'error',
    'no-unused-labels': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'one-var': ['error', 'never'],
    'prefer-const': 'error',
    'radix': 'error',
    'spaced-comment': 'error',
    'use-isnan': 'error',
    'valid-typeof': 'off',
    // Copied from https://github.com/typescript-eslint/typescript-eslint/issues/111#issuecomment-510030930
    'jsx-uses-my-pragma': {
      create(context) {
        const usePragma = () => context.markVariableAsUsed('my');
        return {
          JSXOpeningElement: usePragma,
          JSXOpeningFragment: usePragma,
        };
      },
    },
    'jsx-uses-vars': {
      create: (context) => ({
        JSXOpeningElement(node) {
          if(node.name.name)
            context.markVariableAsUsed(node.name.name);
        },
      }),
    }
  }
};
