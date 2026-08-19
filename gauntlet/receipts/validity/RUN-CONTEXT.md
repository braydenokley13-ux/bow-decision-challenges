# Validity critic — run context

- Repo: /home/user/bow-decision-challenges (branch claude/bow-decision-challenges-gauntlet-pg1522)
- Tree was moving under me: HEAD read d523c94 → c81089b → **074ec2f** within 10 minutes.
- Snapshot pinned by copying the working tree at HEAD `074ec2f3b6350d30c170577a193a6b95cef18879`
  to a private workspace. Content hash of src+server+e2e+index.html:
  `ab4ba0a9de46850255af4969c6743556a649f1728f52d0f5cd883f44b6ec4da8`
  (`find ./src ./server ./e2e ./index.html -type f | sort | xargs sha256sum | sha256sum`)
- Served: production build (`vite build`) on a static server, `/api` proxied to the real
  class service (`server/index.ts` bundle) with the **file** store — `durable: true`.
  API :4891, app :4892.
- Browser: real Chromium `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, launched
  directly by driver scripts (playwright-core 1.62.1 pins 1234 and would refuse it).
- Class under test: **3Q7RX**, teacher key `47TD7NERY3HUPMNUE6AQ9EVU`.
- health before: see health-before.json
