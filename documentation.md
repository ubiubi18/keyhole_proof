# Keyhole Proof Documentation

Keyhole Proof is an experiment for a CAPTCHA-like task.

A CAPTCHA should be easy enough for a person, but annoying or costly for a bot. This project tests whether 3D shape puzzles can help with that.

## The Basic Idea

The app shows:

- one 3D shape made from little cubes
- several 2D keyhole shapes
- one correct answer

The correct answer is a flat shadow of the 3D shape from one possible rotation. The wrong answers look similar, but they are not valid shadows of the shape.

A human can often look at the blocks and quickly think, "yes, that hole fits" or "no, that part is wrong."

A bot may need to:

1. read the 3D shape
2. understand where every cube is
3. try all valid cube rotations
4. turn each rotation into a 2D shadow
5. compare that shadow with every answer
6. avoid trick answers that look close

The thesis is not that bots cannot solve it. The thesis is that solving many of these puzzles could become too expensive compared with the value of attacking the system.

## Why 3D Rotations?

The cube shape can be turned in 24 valid axis-aligned ways.

The app does not ask the player to move the object into the exact answer view. It asks the player to judge which flat keyhole could match after rotation.

That is the human skill being tested: fast mental rotation and shape matching.

## What Is A Seed?

A seed is a piece of text that creates a puzzle.

If the same seed and difficulty are used again, the same puzzle appears again:

- same 3D shape
- same correct answer
- same wrong answers
- same answer order
- same display rotation

This is useful because a server can later check that a submitted answer belongs to a real challenge.

## Why SHA-256?

The app uses a 64-character SHA-256 hex seed.

SHA-256 is a hash function. A hash turns input into a long fixed-size code. A tiny input change creates a very different code.

In this project, the seed helps make the challenge space very large. That matters because attackers should not be able to precompute a small list of puzzles and answers.

If a user types normal text as a seed, the app first hashes it into a SHA-256 seed.

## Randomness And Reproducibility

Puzzle generation does not use `Math.random`.

Instead, it uses a deterministic SHA-256 counter-stream PRNG. That means the puzzle still feels random, but it can be exactly rebuilt from the seed.

This is important for proof-of-human-work experiments:

- random-looking puzzles are generated
- the server can reproduce them
- the same seed always gives the same result
- the seed space is too large to casually precalculate

## What Makes Bots Work Harder?

The app tries to make bot solving more expensive by combining:

- 3D geometry
- mental rotation
- many possible seeds
- visually close wrong answers
- connected shapes with no detached pieces
- deterministic checks that can be verified later

For a human, the task is mostly visual.

For a bot, the task may require computer vision, geometry reconstruction, search, or model calls. If that cost is higher than the reward for solving, the defense becomes useful.

## What This Is Not

This is not a finished security system.

A real deployment would also need:

- server-created challenge seeds
- replay protection
- timing checks
- accessibility alternatives
- rate limits
- user testing
- tests against real bot solvers

Keyhole Proof is a prototype for exploring the idea.

## Run Locally

```sh
npm install
npm run dev
npm run test
npm run build
```
