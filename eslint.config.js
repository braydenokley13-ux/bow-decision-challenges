import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

/**
 * The view boundary, written once because ESLint **replaces** a rule's options rather than
 * merging them across config blocks.
 *
 * That is the whole of a hole an engineering review found. `src/domain/**` declared this
 * group, and the two narrower blocks below redeclared `no-restricted-imports` to add a rule of
 * their own — which silently dropped it. `src/domain/finance/**` (eight files) could import
 * `../../educator/labels` and lint clean, under a boundary ARCHITECTURE.md says is enforced.
 * Nothing had crossed it yet, which is exactly why nobody noticed.
 *
 * Every block that narrows this boundary now spreads `VIEW_FREE` rather than restating it, so
 * adding a rule to a subdirectory cannot cost it the rule that covers the whole tree.
 */
const VIEW_FREE = {
  group: ["react", "react-dom", "**/components/**", "**/stages/**", "**/educator/**", "**/app/**", "**/student/**"],
  message: "Domain modules must remain pure and view-independent.",
};

/**
 * The boundary between what ships to a child's browser and what holds every class's evidence.
 *
 * `server/**` is the class service: the vault key, the token signer, the store on disk. It runs
 * in Node, it is built by `tsconfig.node.json`, and nothing in `src/**` may reach into it — the
 * two talk over HTTP and that is the whole of their contract.
 *
 * This was the one boundary the config did not draw. An engineering review put
 * `import { signToken } from "../../server/crypto"` into `src/student/session.ts` and watched it
 * pass `tsc -b`, `eslint` and `vite build` with no error and no warning; the bundle grew thirty
 * bytes, because Rollup externalised `node:crypto` rather than refusing. So the failure mode is
 * not a build error a person would notice — it is a browser bundle that silently carries the
 * shape of the service's secrets, and the next import of the same kind carrying the secret
 * itself. `src/domain/** → src/educator/**` was already blocked and works; this is the same
 * mechanism, pointed at the boundary that matters more.
 *
 * Depth-independent for the reason written over `VIEW_FREE`: `../../server/crypto` and
 * `../../../../server/crypto` are the same import and a pattern that counts `../` catches one
 * of them.
 *
 * Test files are exempt by `ignores` rather than by turning the rule off, because turning it
 * off in a later block would replace whatever `no-restricted-imports` the file already had —
 * which is exactly the footgun described above, and it would have cost `src/domain/**`'s view
 * boundary on every domain test. `src/platform/**`'s service tests boot the real handler
 * in-process and `src/test/asStudent.ts` drives it; none of them is bundled.
 */
const SERVER_FREE = {
  group: ["**/server/**", "**/api/*"],
  message: "The browser bundle never imports the class service. src/** talks to server/** over HTTP and nothing else.",
};

export default tseslint.config(
  // `scripts` holds standalone dev tooling that runs outside the app tsconfig.
  // `dist-*` rather than the two names that were listed: `.gitignore` has said `dist-*/` since
  // the rekey build landed, and this list did not, so any build output under a new name — a
  // reviewer's `dist-validity2`, an SSR bundle — became a parse error in a lint run that had
  // nothing to do with them. The two lists are answering the same question and should not
  // disagree about it.
  //
  // `.a11y-scratch` joins `.scratch` for the same reason both exist: a reviewer measuring the
  // running product writes throwaway drivers somewhere, and a lint run that fails on those is a
  // lint run reporting on the reviewer rather than on the product. It went red on thirteen parse
  // errors in a directory that had existed for twenty minutes and contained no shipped code.
  { ignores: ["dist", "dist-*", ".bow-classes", "coverage", "playwright-report", "test-results", "screens", "scripts", ".scratch", ".a11y-scratch", "gauntlet", "eslint.config.js", "stylelint.config.js"] },
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
    // Everything the browser gets. Narrower blocks below re-state `SERVER_FREE` rather than
    // inheriting it, because a later block replaces this rule instead of merging into it.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.test.{ts,tsx}", "src/test/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { "patterns": [SERVER_FREE] }]
    }
  },
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      // Depth-independent on purpose: the patterns used to be written as `../../educator/**`,
      // which a module three directories under `src/domain` escapes simply by being deeper.
      "no-restricted-imports": ["error", { "patterns": [VIEW_FREE, SERVER_FREE] }]
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
          VIEW_FREE,
          SERVER_FREE,
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
          VIEW_FREE,
          SERVER_FREE,
          // Depth-independent, for the same reason the view group is: written as `../` and
          // `../../` these matched two directory depths and a module one level deeper walked
          // straight through them.
          { "group": ["**/scenario/worlds/**", "**/scenario/registry"], "message": "Finance receives ScenarioNumbers and never imports a world." }
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
