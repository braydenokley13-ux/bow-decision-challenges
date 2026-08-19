# How a judge runs the product

Every judge gets their own ports so six can work at once without colliding.

```bash
# Pin the snapshot first — the tree moves while you work.
SHA=$(git rev-parse HEAD)
mkdir -p /tmp/judge-$NAME && git archive HEAD | tar -x -C /tmp/judge-$NAME
cd /tmp/judge-$NAME && npm ci --silent          # or reuse the repo's node_modules by symlink

# Your ports (see the table below).
export BOW_API_PORT=$API
export BOW_CLASS_STORE=memory
export BOW_STORE_KEY=$(openssl rand -hex 32)
export BOW_ALLOWED_ORIGIN="http://127.0.0.1:$APP,http://localhost:$APP"
npm run api &                                    # the class service
npm run dev -- --port $APP --strictPort &        # the app, proxying /api to $API
```

| Judge | app | api |
| --- | --- | --- |
| 1 student | 4301 | 4381 |
| 2 teacher | 4302 | 4382 |
| 3 assessment | 4303 | 4383 |
| 4 district 26 | 4304 | 4384 |
| 5 engineering & security | 4305 | 4385 |
| 6 world-class | 4306 | 4386 |
| 7 synthesiser | 4307 | 4387 |

Chromium is at `/opt/pw-browsers/chromium`; Playwright is configured to find it. Do not run
`playwright install`.

**The box is shared.** Six judges and a lead are on one machine. Do not run the full vitest
suite and a browser at the same time; close browsers when you are done with them; if `uptime`
shows a load average above 40, stop starting things and wait.
