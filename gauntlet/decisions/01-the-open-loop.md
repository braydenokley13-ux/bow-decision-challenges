# Decision 01 — the loop is open at both ends

**Status:** lead's position, written before the critics reported. To be tested against them.

## The principle this run is measured by

> The goal is to create the strongest possible loop between a student making a consequential
> decision and a teacher understanding how that student thought.

Read against the running product, that loop is **open at both ends**, and nothing else BOW is
missing is as large as either break.

## Break 1 — nothing goes back to the student

A student plays twenty minutes, writes one paragraph, and reads
`YOUR PLAN IS WITH YOUR TEACHER.` Then the product ends. The teacher reads the paragraph,
scores four criteria, and may disagree with any machine judgement on the record. **None of that
is ever visible to the student.** There is no route, no screen, and no data path. The student
cannot even re-open their own Week 8 resolution — closing the tab ends it.

So the product currently teaches a student that explaining your thinking is something you do
*into a box*. That is the opposite of the thing it is trying to be evidence of.

This is also D26's question 5 (feedback) and half of question 2 (how reports surface concepts),
and it is not a missing feature so much as a missing half of the product.

## Break 2 — the teacher's end has no identity and no present tense

The teacher's end of the loop can only see work that has been **finished and submitted**.
Because the attempt lives in `localStorage` and nothing is written to the service until the last
screen, the class page has exactly two states for a student: *turned in*, or *does not exist*.
There is no not-started, no in-progress, no "stopped after Week 5 on Tuesday".

And the student on the other end is `Seat 21`. A teacher cannot give feedback to Seat 21,
cannot pick Seat 21 for a share-out by name, cannot notice that Seat 21 was absent, and cannot
put Seat 21 in a gradebook.

That single absence blocks four of D26's five questions:
monitoring across days (4), share-outs (5), feedback (5), and grading (5).

## What follows

Identity is not a login page and it is not the goal. It is the **minimum structure the loop
needs to close**: something to send feedback *to*, something to resume *as*, and something the
teacher can *name*.

The design constraint is therefore inverted from an ordinary SaaS build. The question is not
"what does an account system need". It is: **what is the least identity that closes the loop,
and what is the most privacy we can keep while closing it?**

## What this does NOT justify building

Streaks. Badges. Points leaderboards. A social feed. Notifications. A gradebook that duplicates
the school's. A messaging system. Ten navigation tabs. Any of these would make the product an
LMS and none of them makes the loop better.

## Third break, smaller but real — reasoning is captured once, at the very end

The student explains their thinking exactly once, after everything has already resolved. So the
evidence of *thinking* is a retrospective paragraph written when the answer is already known,
which is the weakest moment to ask for it. Prediction before a decision, and a sentence at the
moment the plan breaks, are both cheaper to read and harder to fake.

This is a real gap against evidence-centred design, but it is smaller than the two breaks above
because *something* is captured. Rank it below them.
