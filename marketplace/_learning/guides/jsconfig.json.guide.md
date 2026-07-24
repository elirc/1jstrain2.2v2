# Guide: jsconfig.json
**Role in the system**: Configures JavaScript project tooling behavior (editor IntelliSense + path aliases).
**Key concepts you'll learn**:
- compilerOptions
- path aliasing
- baseUrl
**Prerequisites**:
- `package.json.guide.md`

## Line-by-Line Walkthrough

### Section 1: Path alias setup
```json
1: {
2:   "compilerOptions": {
3:     "paths": {
4:       "@/*": ["./src/*"]
5:     }
6:   }
7: }
```
**What it does**: maps `@/` imports to `src/` so imports stay short and stable.

> **Concept callouts:**
- Alias import example: `import { getDb } from "@/lib/db"`.

**What would happen if...** alias is removed? Existing `@/` imports fail to resolve.

**Extra example**:
```json
"paths": {
  "@components/*": ["./src/components/*"]
}
```

## Concepts Summary
| Line(s) | Concept | Quick Explanation |
|---------|---------|-------------------|
| 2-5 | path alias | Shortens and standardizes import paths |

## Common Mistakes
- Alias mismatch between tooling configs.
- Moving folders without updating alias mapping.
- Using deep relative imports while alias exists.

## Exercises
1. **Easy**: Replace one `../../` import with alias style.
2. **Medium**: Add a second alias and test editor resolution.
3. **Stretch**: Document team conventions for when to use aliases.
