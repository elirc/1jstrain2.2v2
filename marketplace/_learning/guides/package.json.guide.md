# Guide: package.json
**Role in the system**: Defines project metadata, scripts, runtime dependencies, and tooling dependencies.
**Key concepts you'll learn**:
- npm scripts
- dependency management
- runtime vs dev dependency boundaries
**Prerequisites**:
- No hard prerequisites. You can read this guide directly.

## Line-by-Line Walkthrough

### Section 1: Metadata and scripts
```json
1: {
2:   "name": "marketplace",
3:   "version": "0.1.0",
4:   "private": true,
5:   "scripts": {
6:     "dev": "next dev",
7:     "build": "next build",
8:     "start": "next start",
9:     "lint": "eslint"
10:   },
```
**What it does**: defines package identity and the four core commands every developer uses.

> **Concept callouts:**
- `dev` starts hot-reload development runtime.
- `build` validates production compile pipeline.
- `start` runs production server from built output.
- `lint` runs static quality checks.

**What would happen if...** you removed `build`? CI/deploy pipelines would fail because production compilation command is missing.

**Extra example**:
```json
"scripts": {
  "test": "vitest",
  "typecheck": "tsc --noEmit"
}
```

### Section 2: Dependencies
```json
11:   "dependencies": {
12:     "next": "16.1.6",
13:     "react": "19.2.3",
14:     "react-dom": "19.2.3",
15:     "zod": "^4.3.6"
16:   },
17:   "devDependencies": {
18:     "eslint": "^9",
19:     "eslint-config-next": "16.1.6"
20:   }
21: }
```
**What it does**: separates runtime packages (`dependencies`) from development-only tooling (`devDependencies`).

> **Concept callouts:**
- Runtime package: needed when app runs.
- Dev package: needed while developing/linting/building.

**What would happen if...** you moved `next` to `devDependencies` only? Production runtime may fail in environments that install only runtime dependencies.

**Extra example**:
```json
"dependencies": { "express": "^5.0.0" },
"devDependencies": { "nodemon": "^3.0.0" }
```

## Concepts Summary
| Line(s) | Concept | Quick Explanation |
|---------|---------|-------------------|
| 5-9 | npm scripts | Named terminal commands for repeatable workflows |
| 11-16 | dependencies | Packages required at runtime |
| 17-19 | devDependencies | Tooling packages used during development |

## Common Mistakes
- Installing runtime libs as dev-only by mistake.
- Not pinning major versions, causing unexpected upgrades.
- Renaming scripts without updating team docs/CI.

## Exercises
1. **Easy**: Add a new `"check": "npm run lint && npm run build"` script.
2. **Medium**: Add a `"clean"` script and explain when it should be used.
3. **Stretch**: Propose dependency upgrades and list potential risks.
