import type { Field } from './state.js';
import type { ForwardPass } from './network.js';

export const lesson = {
  id: 'neural-workshop-v1',
  title: 'The Neural Workshop',
  target: 'output',
  goal: 1.5,
  defaultSelection: 'x1-h1',
  stageNames: ['READY', 'WEIGHTED INPUTS', 'ReLU GATE', 'LINEAR OUTPUT', 'LIFT RESPONSE'] as const,
  cues: [
    'Predict the output, then send a signal through the network.',
    'The inputs send a weighted contribution down each connection.',
    'ReLU replaces negative hidden sums with zero. A zero sends no signal onward.',
    'The output adds both weighted activations and its bias. The output has no ReLU.',
    'The output sets the lift position. Compare it with the gold target marker.',
  ],
} as const;

export const nodes = [
  { id: 'x1', label: 'X₁', name: 'Input 1', field: { kind: 'input', index: 0 } },
  { id: 'x2', label: 'X₂', name: 'Input 2', field: { kind: 'input', index: 1 } },
  { id: 'h1', label: 'H₁', name: 'Hidden 1 bias', field: { kind: 'hiddenBias', index: 0 } },
  { id: 'h2', label: 'H₂', name: 'Hidden 2 bias', field: { kind: 'hiddenBias', index: 1 } },
  { id: 'y', label: 'Y', name: 'Output bias', field: { kind: 'outputBias' } },
] as const satisfies readonly { id: string; label: string; name: string; field: Field }[];

export const edges = [
  { id: 'x1-h1', from: 0, to: 2, name: 'X₁ → H₁', field: { kind: 'hiddenWeight', neuron: 0, input: 0 } },
  { id: 'x2-h1', from: 1, to: 2, name: 'X₂ → H₁', field: { kind: 'hiddenWeight', neuron: 0, input: 1 } },
  { id: 'x1-h2', from: 0, to: 3, name: 'X₁ → H₂', field: { kind: 'hiddenWeight', neuron: 1, input: 0 } },
  { id: 'x2-h2', from: 1, to: 3, name: 'X₂ → H₂', field: { kind: 'hiddenWeight', neuron: 1, input: 1 } },
  { id: 'h1-y', from: 2, to: 4, name: 'H₁ → Y', field: { kind: 'outputWeight', index: 0 } },
  { id: 'h2-y', from: 3, to: 4, name: 'H₂ → Y', field: { kind: 'outputWeight', index: 1 } },
] as const satisfies readonly { id: string; from: number; to: number; name: string; field: Field }[];

export const controls = [...edges, ...nodes];
export type ControlId = typeof controls[number]['id'];

// Presentation coordinates only. The numeric readout always shows the true output.
export function liftTravel(output: number): number {
  return Math.min(1, Math.max(0, (output + 1) / 4));
}
export const meetsGoal = (pass: ForwardPass) => pass.output >= lesson.goal;
