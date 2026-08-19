# The final six verdicts, and the rules they run under

**Why six and not one.** A single "is it good" verdict is a verdict nobody can act on and
everybody can argue with. Six readers, each answering for one constituency, each allowed to say
no, produce six things a builder can do something about — and a disagreement between two of them
is information rather than noise.

## The rules every judge runs under

1. **Fresh context.** A judge gets the goal, the bar, and the running artifact. Not the builder's
   reasoning, not the status file, not the list of what was fixed. `gauntlet/GAUNTLET_STATUS.md`
   is off limits until after the verdict is written; the critiques and receipts are evidence about
   the past, and a judge who reads them first will grade the story rather than the product.
2. **Reproduce, do not read.** Every claim in a verdict rests on something the judge did in a
   browser, at an endpoint, or on disk. A claim that rests only on reading source says so.
3. **The bar is excellent consumer software, games, educational software and assessment tools.**
   Not "impressive for a student project", not "impressive for AI-generated software", not "good
   enough for a pilot".
4. **`NO-GO` is a real answer** and so is `GO WITH CONDITIONS`. A judge who cannot find a reason to
   refuse should say what would have made them refuse and why it is absent.
5. **Pin a snapshot.** `git archive HEAD | tar -x` to a directory outside the repo, record the SHA,
   and state which SHA every claim is true of. The tree moves.
6. **No compliance claims.** Not FERPA, COPPA, NY Education Law §2-d, NYCPS, WCAG conformance or
   district approval — not by the product and not by the judge.
7. **Say what is claimed without evidence.** Every judge answers this explicitly, about the
   product and about their own verdict.

## What every judge returns

- **A verdict, first line, exactly one of:** `GO` · `GO WITH CONDITIONS` · `NO-GO`
- **The strongest evidence for it**, with the reproduction.
- **The largest gap**, stated as the thing it would cost to close rather than as a complaint.
- **What they reproduced themselves**, listed.
- **Anything the product claims without evidence** — and anything they are claiming without it.

## The six

### 1. The student's product
Would a twelve-to-fourteen-year-old play this, understand what happened to them, and be told the
truth about themselves? Play both stories to the end, badly and well, at 1366 and at 390. The one
question under it: **did the product ever tell them something untrue about themselves?**

### 2. The teacher's product
Run a period. Set the class up, watch the room, mark the writing, run the share-out, export the
marks, overrule a judgement you disagree with. The questions: what do you know ten seconds after
opening the class page, what do you do next, and would you use it a second time and a third —
on a class whose marks you have to defend.

### 3. The assessment
Is the evidence any good? Can a run be beaten without thinking, and what does the teacher's page
say about a run that was? Does a judgement about a child rest on a moment a second teacher could
check? Is a support level honestly reported at both ends? Does an absence read as an absence?
**Would you defend a mark from this instrument to a parent?**

### 4. District adoption — District 26
Answer their five questions from the product, not from the documentation: motifs for different
interests; how feedback and reports surface the concepts; how students explain their reasoning;
how a teacher monitors across a class, homework and several days; how a teacher runs a share-out,
gives feedback and grades. Then: what would stop a district buying this, and what would stop them
renewing.

### 5. Engineering and security
Find a reason a district should refuse to deploy it. Attack the store, the identity system, the
rate limiters, the deployment paths. Then read the engineering: is this a codebase a team could
still be working in a year from now, and what would the second engineer hate?

### 6. World-class product
The one that does not have a constituency. Compared with excellent consumer software — not with
other school products — what is this, honestly? What would a person who ships things for a living
say is missing? Where is the seam between the parts that were designed and the parts that were
assembled?

## And then the synthesiser

A seventh reader, fresh, who gets the six verdicts and the artifact and is told to **disagree**
with them. Their job is not to average the six: it is to find where two judges contradict each
other, where a `GO` rests on something a `NO-GO` shows is false, and where all six missed the same
thing because they were all looking at their own constituency. They return one verdict and the
single most important sentence in the whole gauntlet.
