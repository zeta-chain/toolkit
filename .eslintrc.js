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
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unsafe-return": "off",
    "@typescript-eslint/no-unsafe-call": "off",
    "@typescript-eslint/no-unsafe-argument": "off",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-floating-promises": "off",
    "@typescript-eslint/require-await": "off",
    "@typescript-eslint/restrict-template-expressions": "off",
    "@typescript-eslint/no-unused-expressions": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-redundant-type-constituents": "off",
    "@typescript-eslint/no-unnecessary-type-assertion": "off",
    "@typescript-eslint/restrict-plus-operands": "off",
    "@typescript-eslint/no-wrapper-object-types": "off",
    "@typescript-eslint/no-misused-promises": "off",
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
    "import/no-named-as-default": "off",
    "prefer-const": "off",
    "no-constant-condition": "off",
    "no-empty": "off",
    "no-prototype-builtins": "off",
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
