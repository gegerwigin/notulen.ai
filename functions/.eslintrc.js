module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quote-props": ["error", "consistent-as-needed"],
    "quotes": ["error", "double"],
    "linebreak-style": "off",
    "max-len": "off",
    "no-unused-vars": "warn",
    "object-curly-spacing": ["error", "never"],
    "indent": ["error", 2],
    "comma-dangle": ["error", "always-multiline"],
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
