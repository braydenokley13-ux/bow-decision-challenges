# World-class review #2 — BOW Decision Challenges

*In progress. Reviewed in Chromium at 1366×768 (DPR 2) against a production build
(`npm run build`) served by `vite preview` on **127.0.0.1:5234**, with the real class service
on **127.0.0.1:5280** (memory store). Both worlds played end to end; educator side used.
Receipts: `gauntlet/receipts/worldclass-2/`.*

## 1. The class code does not fit inside the class code

`07-class-code-overflow.png`

Reproduced 5/5 on freshly created classes at 1366×768. The navy "projector" plate is 300px
wide; the code inside it renders 416–436px wide at 96px. Overflow is 164–184px, `overflow:
visible`, so the last one and a half characters land on the cream page background **in white**.
`U3C6N` reads as `U3C`. `NXRXU` reads as `NXRX`.

This is the artifact the whole product turns on: the thing a teacher reads to a room and a
student types. It is wrong on the screen built expressly to project it.
