# Chromebook profile — chromebook

CPU throttled 4×. Viewport {"width":1366,"height":768}.
Served from `dist/` through `vite preview` — the bundle a school downloads, not dev modules.
Transfer is `encodedDataLength` from CDP: real post-compression bytes, headers included.
A step showing 0 kB genuinely fetched nothing — it ran off code and state already loaded.

| step | wall ms | long tasks | worst task ms | layout shift | transfer kB | heap MB |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| cold start — front door | 725 | 3 | 141 | 0 | 276.2 | 2.9 |
| sign in | 1088 | 0 | 0 | 0 | 4 | 5.3 |
| student home → start | 481 | 1 | 61 | 0 | 1.6 | 6.6 |
| choose the world | 117 | 1 | 63 | 0 | 2.8 | 5.8 |
| take the booth | 704 | 2 | 81 | 0 | 0.5 | 7 |
| the money screen | 749 | 2 | 114 | 0 | 0.5 | 7.7 |
| the opening plan | 791 | 2 | 115 | 0 | 0.5 | 5.3 |
| the tray order — The Counter | 561 | 1 | 51 | 0 | 0 | 6.4 |
| open the window | 604 | 1 | 70 | 0 | 0 | 7.3 |
| serve ten orders | 1897 | 0 | 0 | 0 | 0 | 5.2 |
| run the rest of the night | 6636 | 0 | 0 | 0.024 | 0 | 4.8 |

**Worst single task:** 141 ms · **worst step shift:** 0.024 · **total transfer:** 286 kB

Every number above was taken before any world art existed. That is the point of taking it
now: when the art lands, the difference is measurable rather than arguable.
