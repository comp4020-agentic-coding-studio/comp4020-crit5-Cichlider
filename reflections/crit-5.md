# Crit 5 reflection

## What was the breakthrough that moved the work forward?

The breakthrough came from a screenshot, not from more code. I'd built the
flat-stack version and already suspected something was off, but couldn't pin
down what. I fed a screenshot of the reviewed build to GPT and asked what it
saw — it described the stacks and the interaction back to me in a way that
made the gap between what I'd imagined and what actually existed impossible
to ignore. That description, not my own re-reading of the code, is what
turned into the actual prompt for the rebuild: a real physics-simulated pile
instead of six fixed stacks pretending to be one.

## What did this work change about who I want to be as a software developer?

It changed how I think about what "done" means. A lot of developers —
including me, most weeks — build to satisfy themselves: the code compiles,
the logic is correct, it matches the plan already in my head. But a player
never sees that plan, only the screen. This week made me want to build for
the person looking at it cold, not for the version of myself who already
knows what it's supposed to be — logic has to be simple and legible from the
outside (toC), not just internally consistent to the person who wrote it
(toB/to-self).
