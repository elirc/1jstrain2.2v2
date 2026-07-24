# Guide: eslint.config.mjs
**Role in the system**: Defines lint rules and ignores for code quality enforcement.
**Key concepts you'll learn**:
- lint rule composition
- global ignore patterns
- rule overrides
**Prerequisites**:
- `package.json.guide.md`

## Line-by-Line Walkthrough

### Section 1: Base setup
```js
1: import { defineConfig, globalIgnores } from "eslint/config";
2: import nextVitals from "eslint-config-next/core-web-vitals";
```
**What it does**: imports ESLint flat-config helpers and Next.js rule preset.

> **Concept callouts:**
- Flat config uses JavaScript modules for composable configuration.

### Section 2: Rule overrides and ignores
```js
4: const eslintConfig = defineConfig([
5:   ...nextVitals,
6:   {
7:     rules: {
8:       "react-hooks/set-state-in-effect": "off",
9:       "@next/next/no-img-element": "off",
10:       "react-hooks/exhaustive-deps": "off"
11:     }
12:   },
13:   globalIgnores([
14:     ".next/**",
15:     "out/**",
16:     "build/**",
17:     "next-env.d.ts"
18:   ])
19: ]);
21: export default eslintConfig;
```
**What it does**: applies Next baseline rules, disables selected strict checks, and ignores generated build outputs.

> **Concept callouts:**
- Spread operator (`...nextVitals`) merges preset arrays.
- Rule overrides should be explicit and justified.

**What would happen if...** ignores are removed? Lint may crawl generated files and produce noisy irrelevant errors.

**Extra example**:
```js
rules: {
  "no-console": "warn"
}
```

## Concepts Summary
| Line(s) | Concept | Quick Explanation |
|---------|---------|-------------------|
| 5 | spread operator | Include preset configs in final array |
| 8-10 | rule override | Adjust strictness per project needs |
| 13-18 | ignore globs | Skip generated output folders |

## Common Mistakes
- Disabling too many rules and losing lint value.
- Forgetting why a rule was disabled.
- Linting build artifacts by accident.

## Exercises
1. **Easy**: Add a comment explaining why one disabled rule is disabled.
2. **Medium**: Re-enable one rule and fix resulting warnings.
3. **Stretch**: Add separate rule behavior for test files.
