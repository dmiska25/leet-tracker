## Context for Codex & Agents

This project is a **local-first LeetCode tracker** written in TypeScript + React + Vite, with heavy use of IndexedDB (via `idb`), Vitest for tests, and a domain logic structure under `src/domain/`.

---

## Project Structure Overview

- `src/domain/`: Core recommendation and progress-tracking logic
- `src/components/`: UI components (e.g. `Dashboard.tsx`)
- `src/types/`: Shared types for problems, categories, recommendations
- `src/storage/`: Local DB abstraction using IndexedDB
- `public/`: Sample JSON files for testing/demo purposes
- `docs/` and `README.md`: Human-readable documentation and scoring design

---

## Commenting Guidelines

- **Preserve existing comments:** Do not remove comments unless they are outdated or no longer relevant.
- Comments provide important context, rationale, or usage notes—keep them intact to help future contributors.
- When updating code, review nearby comments and update them if the logic changes.

## Testing/linting Tips

### Run full suite (CI-style)

```bash
npm run test
```

### Lint and auto-fix

```bash
npm run lint       # Lint only
npm run lint:fix   # Lint and auto-fix
```

### Format with Prettier

```bash
npm run format
```

### Single test targeting

```bash
npx vitest run -t "<test name>"
```

### After moving files or editing imports

Run this to make sure nothing breaks:

```bash
npm run lint && npm run test
```

### Testing Conventions

- Unit test most functions
- For React components, test **functional behavior** (e.g. user interaction, prop changes, conditional rendering)
- Tests should run cleanly without manual setup or file system writes

---
