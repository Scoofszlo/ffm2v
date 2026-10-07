import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.node },
  },
  {
    ignores: ["node_modules/**", "dist/**"],
  },
  tseslint.configs.recommended,
  eslintConfigPrettier,
  eslintPluginPrettier,
]);
