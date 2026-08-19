# The judge's key-mismatch scenario, replayed against the fix

Judge 5 (`gauntlet/judges/5-engineering.md`) destroyed a class with two children on it by
booting the shipped server three times against one `BOW_CLASS_DIR`. This is their sequence,
run against `dist-server/index.js` built from HEAD after the fix, with the same three boots
and the same requests. The script is `run.sh` beside this file.

```
=== BOOT 1 — the right key ===
signup:  201
class:   XJ3AY
health:  200 ok True

=== BOOT 2 — the wrong key, exactly the judge's sequence ===
health:  503 mismatch classroomReady=False
reason:  The file store holds records this key cannot open. BOW_STORE_KEY has changed, or is not the one these classes were written with. BOW has stopped writing to this store so that nothing is added under the wrong key: sign-in, class creation and turning work in all refuse until it is fixed. The records are still there and the original key still opens them — put it back and restart.
sign in:      503
RE-REGISTER:  503
create class: 503
turn in:      503
files unchanged after the wrong-key boot: YES

=== BOOT 3 — the original key back, as health instructs ===
health:  200 ok classroomReady=True
GET class XJ3AY: 200
sign in:         200
```

The three lines that were `201` in their transcript are `503` here, the store is
byte-identical across the wrong-key boot, and the original key restores the class and the
teacher's sign-in — which is what their health message had been promising and could not
deliver.
