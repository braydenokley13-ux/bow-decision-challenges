# Chromebook profile — chromebook

CPU throttled 4×. Viewport {"width":1366,"height":768}.
Served from `dist/` through `vite preview` — the bundle a school downloads, not dev modules.
Transfer is `encodedDataLength` from CDP: real post-compression bytes, headers included.
A step showing 0 kB genuinely fetched nothing — it ran off code and state already loaded.

| step | wall ms | long tasks | worst task ms | layout shift | transfer kB | heap MB |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| cold start — front door | 598 | 3 | 120 | 0 | 276.2 | 2.9 |
| sign in | 1156 | 1 | 56 | 0 | 4 | 5.4 |
| student home → start | 416 | 1 | 59 | 0 | 1.6 | 6.6 |
| choose the world | 100 | 1 | 56 | 0 | 2.8 | 5.8 |
| take the booth | 610 | 3 | 73 | 0 | 0.5 | 7.1 |
| the money screen | 674 | 2 | 104 | 0 | 0.5 | 7.8 |
| the opening plan | 680 | 1 | 88 | 0 | 0.5 | 5.3 |
| the tray order — The Counter | 542 | 0 | 0 | 0 | 0 | 6.4 |
| open the window | 593 | 1 | 72 | 0 | 0 | 7.3 |
| serve ten orders | 1695 | 0 | 0 | 0 | 0 | 5.1 |
| run the rest of the night | 6642 | 0 | 0 | 0.015 | 0 | 7.5 |

**Worst single task:** 120 ms · **worst step shift:** 0.015 · **total transfer:** 286 kB

Every number above was taken before any world art existed. That is the point of taking it
now: when the art lands, the difference is measurable rather than arguable.
