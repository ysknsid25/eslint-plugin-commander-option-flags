import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import globals from "globals";

export default [
  js.configs.recommended,
  stylistic.configs["recommended-flat"],
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.mocha,
      },
      ecmaVersion: "latest",
      sourceType: "commonjs",
    },
    rules: {
      // Customize stylistic rules to match standard conventions or preference
      "@stylistic/quotes": ["error", "single"],
      "@stylistic/semi": ["error", "never"],
      "@stylistic/comma-dangle": ["error", "always-multiline"],
      "@stylistic/indent": ["error", 2],
      
      // Allow console.log for CLI tools/debugging but warn
      "no-console": "warn",
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    }
  },
  {
    ignores: ["coverage/", "node_modules/", "eslint.config.mjs"]
  }
];
