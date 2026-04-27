# Keyhole Proof

**Keyhole Proof** is a CAPTCHA and proof-of-human-work experiment built around fast 3D spatial judgment. The playable prototype is called **3D Keyhole Snap Judgment**.

![Keyhole Proof easy, medium, and hard modes rotating](docs/keyhole-proof-modes.gif)

The hypothesis is simple: some visual-spatial tasks may be cheap for human perception but expensive for automated solvers at scale. If each challenge can be generated from a large seed space and solved by humans in a few seconds, then an attacker may need enough model calls, search, or custom geometry reasoning that solving becomes economically unattractive.

## How The Challenge Works

A puzzle shows a connected 3D object made from small cubes and several connected 2D keyhole silhouettes. Exactly one keyhole is a valid orthographic projection of the 3D object under one of the 24 axis-aligned cube rotations. The other choices are near-miss distractors that are visually plausible but invalid.

Humans can often rotate the object mentally and reject near misses quickly. A solver must reconstruct the 3D shape, enumerate rotations, project the object, compare silhouettes, and avoid distractors. The experiment is about measuring whether that gap can be made large enough to matter.

## Reproducibility

Each active challenge seed is a 64-character SHA-256 hex digest. Non-hash text entered into the seed field is canonicalized by hashing it first.

Given the same SHA-256 seed and difficulty, the app deterministically generates:

- the 3D polycube
- the displayed 3D orientation
- the valid answer projection
- all distractors
- the shuffled answer order

Puzzle generation does not use `Math.random`; all generation choices come from a deterministic SHA-256 counter-stream PRNG.

## Difficulty Levels

- Easy: 7 cubes, 4 answer choices
- Medium: 10 cubes, 5 answer choices
- Hard: 13 cubes, 6 answer choices

## Development

```sh
npm install
npm run dev
npm run test
npm run build
```

## Status

This is a research prototype, not a finished CAPTCHA system. A production proof-of-human-work system would also need server-issued nonces, replay protection, timing analysis, accessibility alternatives, adversarial testing, and live cost measurements against real solver pipelines.
