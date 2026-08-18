import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // `scripts` holds standalone dev tooling that runs outside the app tsconfig.
  { ignores: ["dist", "dist-server", ".bow-classes", "coverage", "playwright-report", "test-results", "screens", "scripts", ".scratch", "gauntlet", "eslint.config.js", "stylelint.config.js"] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-floating-promises": "error"
    },
  },
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      // Depth-independent on purpose: the patterns used to be written as `../../educator/**`,
      // which a module three directories under `src/domain` escapes simply by being deeper.
      "no-restricted-imports": ["error", {
        "patterns": [
          { "group": ["react", "react-dom", "**/components/**", "**/stages/**", "**/educator/**", "**/app/**"], "message": "Domain modules must remain pure and view-independent." }
        ]
      }]
    }
  },
  {
    files: ["src/domain/competency/**/*.ts"],
    rules: {
      // The one-way rule. A competency is BOW's own words for a financial skill and does not
      // know that any state exists; the mapping table joins the two, and it lives on the
      // standards side. An import in this direction is what makes adding a second state a
      // rewrite instead of a mapping file.
      "no-restricted-imports": ["error", {
        "patterns": [
          { "group": ["react", "react-dom", "**/components/**", "**/stages/**", "**/educator/**", "**/app/**"], "message": "Domain modules must remain pure and view-independent." },
          { "group": ["**/standards", "**/standards/**"], "message": "Competencies never reference a state framework. The mapping table joins them, from the standards side." }
        ]
      }]
    }
  },
  {
    files: ["src/domain/finance/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        "patterns": [
          { "group": ["react", "react-dom", "../scenario/worlds/**", "../../scenario/worlds/**"], "message": "Finance receives ScenarioNumbers and never imports a world." }
        ]
      }]
    }
  },
  {
    files: ["e2e/**/*.ts", "server/**/*.ts"],
    rules: {
      // Playwright fixtures take a callback named `use`, which is not a React hook.
      "react-hooks/rules-of-hooks": "off"
    }
  },
  {
    files: ["src/**/*.test.{ts,tsx}", "src/test/**/*.ts", "e2e/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
);
