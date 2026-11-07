import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forward, initialNetwork } from '../src/network.js';
import { liftTravel, meetsGoal } from '../src/lesson.js';
import { completed, duration, frame, startRun } from '../src/run.js';

test('ReLU flat region keeps the lift parked; opening the gate raises it past the marker', () => {
  const n = initialNetwork();
  for (const weight of [.5, 1, 1.5]) {
    n.hiddenWeights[0][0] = weight;
    const pass = forward(n);
    assert.equal(pass.hidden[0], 0);
    assert.equal(pass.output, -1.25);
    assert.equal(liftTravel(pass.output), 0);
    assert.equal(startRun(n, pass, '-1.25')!.contributions[4], 0);
    assert.equal(meetsGoal(pass), false);
  }
  n.hiddenWeights[0][0] = 3;
  const pass = forward(n);
  assert.equal(pass.hidden[0], 1.5);
  assert.equal(pass.output, 1.75);
  assert.deepEqual(startRun(n, pass, '1.75')!.contributions, [3, -2, 1, 1, 3, -1.5]);
  assert.equal(liftTravel(pass.output), .6875);
  assert.ok(liftTravel(pass.output) > liftTravel(1.5));
});

test('lift presentation clamps the position without clipping the numerical answer', () => {
  assert.equal(liftTravel(-25), 0);
  assert.equal(liftTravel(21), 1);
  assert.equal(liftTravel(1.5), .625);
});

test('completion needs a finished run, correct prediction and enough lift output', () => {
  const n = initialNetwork();
  const first = forward(n);
  assert.equal(startRun(n, first, ''), null);
  assert.equal(startRun(n, first, 'Infinity'), null);
  assert.equal(completed({...startRun(n, first, '-1.25')!, elapsed: duration}), false);
  n.hiddenWeights[0][0] = 3;
  const second = forward(n);
  assert.equal(completed(startRun(n, second, '1.75')!), false);
  assert.equal(completed({...startRun(n, second, '1')!, elapsed: duration}), false);
  assert.equal(completed({...startRun(n, second, '1.75')!, elapsed: duration}), true);
  assert.equal(meetsGoal({ ...second, output: 1.5 }), true);
});

test('signals, ReLU and lift run in order and settle at the finished frame', () => {
  assert.deepEqual([0, 950, 1700, 2450].map(t => frame(t).phase), [1, 2, 3, 4]);
  assert.equal(frame(949).output, 0);
  assert.equal(frame(1699).output, 0);
  assert.equal(frame(2449).lift, 0);
  assert.equal(frame(duration - 1).done, false);
  assert.equal(frame(duration).done, true);
  assert.equal(frame(duration + 1).lift, 1);
});
