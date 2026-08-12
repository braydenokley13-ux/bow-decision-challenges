# BOW Decision Challenges MVP

This MVP contains one complete student world: **Basketball — Eight Weeks to the Showcase**. Fashion appears in the world picker as **Coming soon**, while the shared world registry and game engine are ready for another story later.

## Run it

1. Install the packages:

   ```bash
   npm install
   ```

2. Start the local app:

   ```bash
   npm run dev
   ```

3. Open the local address Vite prints in the terminal.

The default demo student codes are already filled in. No real student information is needed.

## Check it

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

The browser suite checks both major Basketball routes, the stuck-student help path, keyboard operation, serious/critical accessibility issues, two Chromebook widths, and a narrow 200%-zoom-equivalent viewport.

## Main areas

- `src/stages/StudentChallenge.tsx` — the complete Basketball game flow.
- `src/content/studentCopy.ts` — reusable key-value copy for the core student money screen.
- `src/domain/` — world-neutral finance, evidence, scoring, and state-machine logic.
- `src/domain/scenario/worlds/basketball.ts` — Basketball story details and amounts.
- `src/educator/` — challenge guide, class evidence, student ledger, reasoning review, and standards view.
- `src/fixtures/demoClass.ts` — 28 clearly labeled hypothetical Basketball records.

Student progress and educator demo reviews use browser storage for this MVP. There is no backend and no Fashion story content yet.
