# Student-3 critique — playing it as three students, in both worlds

**Status: in progress.** Findings are added as they are reproduced. Every claim below was
reproduced in Chromium 1194 (`/opt/pw-browsers/chromium`) driven by Playwright 1.62.1, against
a dev server on **:4831** and the class service on **:4832** (`BOW_API_PORT=4832
BOW_CLASS_STORE=memory node dist-server/index.js`, `BOW_API_PORT=4832 npx vite --port 4831`).
Receipts are in `gauntlet/receipts/student-3/`.

(Full report to follow — this file is committed early because the container has OOM-crashed
twice in this session.)
