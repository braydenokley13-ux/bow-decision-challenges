Receipts for judge 5 (engineering & security), snapshot 18a818c8c8885e7e0cbdd547c536117dfa3d788c.

- key-mismatch-destroys.txt — full transcript of the key-rotation destruction reproduction
  (file store, three server boots: right key, wrong key, right key again).
- teacher-key-in-url.png / roster-page-key-in-url.png — the educator surfaces reached with
  ?key=<teacherKey>; page.url() logged the key verbatim.
- stored-markup-not-executed.png — planted <img onerror> / <script> child names rendered as
  literal text on four teacher surfaces; no payload executed.
- reproduction.sh — the attack script, runnable against a local instance.
