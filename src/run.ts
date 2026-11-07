import { isCorrect, type ForwardPass, type Network } from './network.js';
import { edges, meetsGoal } from './lesson.js';

export const duration = 3200;
export type Run = { pass: ForwardPass; contributions: number[]; correct: boolean; elapsed: number };

export function startRun(network: Network, pass: ForwardPass, prediction: string): Run | null {
  if (!prediction.trim() || !Number.isFinite(Number(prediction))) return null;
  const contributions = edges.map(({field}) => field.kind === 'hiddenWeight'
    ? network.inputs[field.input] * network.hiddenWeights[field.neuron][field.input]
    : pass.hidden[field.index] * network.outputWeights[field.index]);
  return { pass, contributions, correct: isCorrect(prediction, pass.output), elapsed: 0 };
}

export function frame(elapsed: number) {
  const progress = (start: number, end: number) => Math.max(0, Math.min(1, (elapsed - start) / (end - start)));
  const phase = elapsed < 950 ? 1 : elapsed < 1700 ? 2 : elapsed < 2450 ? 3 : 4;
  return { phase, input: progress(0, 950), output: progress(1700, 2450), lift: progress(2450, duration), done: elapsed >= duration };
}
export const completed = (run: Run) => frame(run.elapsed).done && run.correct && meetsGoal(run.pass);
