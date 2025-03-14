const path = require("path");

/**
 * @type {import("eslint").Linter.Config}
 */
module.exports = {
  env: {
    browser: false,
    es2021: true,
    mocha: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:prettier/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 12,
    project: path.join(__dirname, "tsconfig.json"),
    sourceType: "module",
  },
  plugins: [
    "@typescript-eslint",
    "prettier",
    "import",
    "simple-import-sort",
    "sort-keys-fix",
    "typescript-sort-keys",
    "prefer-arrow",
  ],
  rules: {
    "@typescript-eslint/sort-type-union-intersection-members": "off",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-return": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-argument": "error",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/require-await": "error",
    "@typescript-eslint/restrict-template-expressions": "error",
    "@typescript-eslint/no-unused-expressions": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-redundant-type-constituents": "error",
    "@typescript-eslint/no-unnecessary-type-assertion": "error",
    "@typescript-eslint/restrict-plus-operands": "error",
    "@typescript-eslint/no-wrapper-object-types": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/prefer-promise-reject-errors": "error",
    "@typescript-eslint/await-thenable": "error",

    camelcase: "off",
    "func-style": ["error", "expression", { allowArrowFunctions: true }],
    "prefer-arrow/prefer-arrow-functions": [
      "warn",
      {
        classPropertiesAllowed: false,
        disallowPrototype: true,
        singleReturnOnly: false,
      },
    ],
    "import/no-named-as-default": "error",
    "prefer-const": "error",
    "no-constant-condition": "error",
    "no-empty": "error",
    "no-prototype-builtins": "error",
    "no-unreachable": "error",
    "simple-import-sort/exports": "error",
    "simple-import-sort/imports": "error",
    "sort-keys-fix/sort-keys-fix": "error",
    "typescript-sort-keys/interface": "error",
    "typescript-sort-keys/string-enum": "error",
  },
  settings: {
    "import/parsers": {
      "@typescript-eslint/parser": [".js", ".jsx", ".ts", ".tsx", ".d.ts"],
    },
    "import/resolver": {
      node: {
        extensions: [".js", ".jsx", ".ts", ".tsx", ".d.ts"],
      },
      typescript: {
        project: path.join(__dirname, "tsconfig.json"),
      },
    },
  },
  ignorePatterns: [
    "/*.js", // Ignore only .js files in the root directory
  ],
};
