# Chromebook profile — chromebook

CPU throttled 4×. Viewport {"width":1366,"height":768}.
Served from `dist/` through `vite preview` — the bundle a school downloads, not dev modules.
Transfer is `encodedDataLength` from CDP: real post-compression bytes, headers included.
A step showing 0 kB genuinely fetched nothing — it ran off code and state already loaded.

| step | wall ms | long tasks | worst task ms | layout shift | transfer kB | heap MB |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| cold start — front door | 689 | 3 | 87 | 0 | 290.3 | 2.9 |
| sign in | 1526 | 1 | 74 | 0 | 4.1 | 5.4 |
| student home → start | 827 | 1 | 188 | 0 | 1.7 | 6.5 |
| choose the world | 202 | 0 | 0 | 0 | 2.8 | 6 |
| take the booth | 909 | 3 | 80 | 0 | 0.5 | 7.3 |
| the money screen | 1002 | 1 | 166 | 0 | 0.5 | 6.5 |
| the opening plan | 1195 | 3 | 107 | 0 | 0.5 | 6.1 |
| the tray order — The Counter | 709 | 1 | 88 | 0 | 0 | 7.3 |
| open the window | 803 | 1 | 87 | 0 | 31.5 | 8.1 |
| serve ten orders | 2738 | 1 | 89 | 0 | 30.7 | 8.1 |
| run the rest of the night | 6304 | 0 | 0 | 0.011 | 27.5 | 7.2 |

**Worst single task:** 188 ms · **worst step shift:** 0.011 · **total transfer:** 390 kB

Every number above was taken before any world art existed. That is the point of taking it
now: when the art lands, the difference is measurable rather than arguable.
