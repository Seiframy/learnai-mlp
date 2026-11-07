# The Neural Workshop · LearnAI

An interactive 3D exhibit for a fixed 2-input / 2-hidden / 1-output neural network. Inspect a physical circuit, tune it, predict the output and send a signal. The signal passes through the hidden ReLU gates and drives a lift to a marked target.

The original 2D prototype is on the `dev/mlp-connected-activities` branch. The workshop uses its existing TypeScript math engine and state reducer. This exhibit is authored by hand. It does not include AI generation, lecture upload, a backend, network training or saved progress.

## Run locally

Use Node.js 22 and npm. From the repository on `dev/neural-workshop`:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, normally http://127.0.0.1:5173/. No credentials or remote assets are needed. To test and build:

```sh
npm test
npm run build
npm run preview
```

## Try the experiment

1. Leave **X₁ → H₁** at **0.5**. Enter **−1.25** as your prediction and send the signal. H₁ shows **−1 → 0**; nothing leaves H₁ and the lift stays at its base.
2. Click the amber cable or select it under **Component**. Try increasing the weight to **1**. Predict again: the first hidden sum changes, but the output is still **−1.25**.
3. Set the weight to **3**. Predict **1.75**, then send. H₁ now shows **1.5 → 1.5**, its cable carries a signal, and the lift moves past the gold marker. The challenge completes when the prediction is correct and the output is at least **1.5**.
4. Open **See the calculation** to inspect both hidden neurons and the output. Edit a parameter during a run to cancel it. **Reset bench** restores the original exercise.

Weighted inputs and a bias form each hidden sum. ReLU keeps a positive sum and replaces a negative sum with zero. The output adds the weighted hidden activations and its own bias, with no ReLU at that layer. Grading uses an absolute tolerance of 0.001. The lift uses a bounded display range from y = −1 to y = 3; the answer stays unbounded by that display range. Its target marker represents y = 1.5.

## Project structure

| File | Role |
|---|---|
| `src/network.ts`, `src/state.ts` | Existing pure forward pass, validation, grading, and authoritative editable network |
| `src/lesson.ts` | Teaching cues, topology labels, editable field bindings, target, and lift mapping |
| `src/run.ts` | Prediction result, timeline stages and completion rules |
| `src/workbench.ts` | Three.js geometry, lighting, picking, signal and lift rendering, and cleanup |
| `src/Scene.tsx` | Canvas lifecycle, projected HTML labels, and non-WebGL presentation |
| `src/main.tsx`, `src/styles.css` | Inspector, prediction controls, worked explanations, and responsive layout |
| `tests/network.test.ts`, `tests/workshop.test.ts` | Independent calculations, ReLU boundary, lift mapping, and completion checks |
| `tests/browser.mjs` | Automated Chrome interaction checks and screenshot capture |

One React reducer owns the network. A forward pass is derived from it and captured when a run starts. Rendering consumes that result; it does not recompute the MLP. A network revision clears the old attempt and cancels its animation, so the lift and the answer cannot use different parameters.

The exhibit uses original geometry, materials and styling, with no borrowed models, textures or fonts. Three.js is the only new runtime dependency. The fixed camera avoids navigation overhead. The scene caps pixel density, skips hidden-tab draws and has no continuous idle rendering, shadow maps or post-processing. [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer) requires WebGL 2. Students without it can still tune the circuit, predict, read the calculation, and see a lift meter. Reduced-motion mode shows the final state without animation.

## Browser checks and limits

With Vite running and Chrome plus Playwright available, run `node tests/browser.mjs`. The script uses `playwright` from the local Node environment, or the absolute module path in `WORKSHOP_PLAYWRIGHT`. Optional variables: `WORKSHOP_URL` (server URL), `WORKSHOP_CHROME` (Chromium executable) and `WORKSHOP_SCREENSHOTS` (output directory). Playwright is not needed to run or build the exhibit.

The scene is one fixed topology and one lift challenge. The cable pulses show the sign and path of a weighted contribution; their size does not encode its magnitude. Chrome desktop and mobile viewport checks do not replace testing on physical phones, an integrated GPU, or with students. The prototype has not been evaluated for learning outcomes.

## Making it reusable

Give a future lesson generator a versioned schema for the objective, allowed parameter edits, initial values, phase cues, and target. Let it select a registered mechanic such as `network-to-lift`, and fill validated data fields. Keep math, grading, rendering and the set of supported mechanics in reviewed code. Before publishing a generated lesson, check bounds, reference IDs and target reachability with the deterministic engine; have an instructor review the explanation and test a fresh transfer question with learners.
