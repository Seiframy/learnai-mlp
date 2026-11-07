import { useEffect, useMemo, useReducer, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { display, forward, workedSolution, type ForwardPass, type Network } from './network';
import { initialState, labReducer, type Field } from './state';
import { controls, lesson, meetsGoal, type ControlId } from './lesson';
import { completed, duration, frame, startRun, type Run } from './run';
import { parameter, Scene } from './Scene';
import './styles.css';

function Inspector({ network, selection, select, edit }: {
  network: Network; selection: ControlId; select: (id: ControlId) => void; edit: (field: Field, value: number) => void;
}) {
  const control = controls.find(c => c.id === selection)!;
  const value = parameter(network, selection);
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState('');
  const weight = control.field.kind.endsWith('Weight');
  function apply(raw: string) {
    setDraft(raw);
    const numeric = Number(raw);
    if (raw.trim() && Number.isFinite(numeric) && Math.abs(numeric) <= 10) {
      edit(control.field,numeric);
      setError('');
    } else setError('Use a number from −10 to 10. The last valid value is still in use.');
  }
  return <section className="panel" aria-labelledby="inspect-title">
    <span className="kicker">01 / ADJUST</span>
    <h2 id="inspect-title">Tune the circuit</h2>
    <div className="fields">
      <label>Component<select value={selection} onChange={e => select(e.target.value as ControlId)}>
        <optgroup label="Connection weights">{controls.slice(0,6).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
        <optgroup label="Inputs and biases">{controls.slice(6).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
      </select></label>
      <label>{weight ? 'Weight' : 'Value'}<input type="number" step="any" min="-10" max="10" value={draft}
        aria-invalid={!!error} aria-describedby={error ? 'parameter-error' : undefined} onChange={e => apply(e.target.value)}/></label>
    </div>
    <input type="range" aria-label="Adjust selected parameter" min="-10" max="10" step=".01" value={value} onChange={e => apply(e.target.value)}/>
    <p id="parameter-error" className={error ? 'error' : 'muted'}>{error || (selection === 'x1-h1' ? (value === 3 ? 'Now predict the output and send a signal.' : 'Try 3 to see what changes at the first ReLU.') : 'Select any node or cable to inspect its value.')}</p>
  </section>;
}

function Experiment({ network, pass, run, setRun }: { network: Network; pass: ForwardPass; run: Run | null; setRun: (r: Run | null) => void }) {
  const [guess, setGuess] = useState('');
  const [error, setError] = useState('');
  const f = run ? frame(run.elapsed) : null;
  const done = !!f?.done;
  const playing = !!run && !done;
  useEffect(() => {
    if (!run || !playing) return;
    const snapshot = run;
    const start = performance.now() - snapshot.elapsed;
    let ticket = 0;
    function tick(now: number) {
      const elapsed = Math.max(0, Math.min(duration, now - start));
      setRun({ ...snapshot, elapsed });
      if (elapsed < duration) ticket = requestAnimationFrame(tick);
    }
    ticket = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ticket);
  // Frame updates keep this attempt's original clock.
  }, [playing, setRun]);
  function launch(event: FormEvent) {
    event.preventDefault();
    const next = startRun(network, pass, guess);
    if (!next) { setError('Enter a numeric prediction first.'); return; }
    setError('');
    setRun(matchMedia('(prefers-reduced-motion: reduce)').matches ? {...next,elapsed:duration} : next);
  }
  return <section className="panel experiment" aria-labelledby="test-title">
    <span className="kicker">02 / TEST</span>
    <h2 id="test-title">Predict &amp; send</h2>
    <form className="fields" onSubmit={launch} noValidate>
      <label>Predicted output y<input type="number" step="any" placeholder="e.g. 0.5" value={guess} disabled={playing}
        aria-invalid={!!error} aria-describedby={error ? 'prediction-error' : undefined}
        onChange={e => {setGuess(e.target.value);setError('');}}/></label>
      <button className="primary" disabled={playing}>{playing ? 'Signal in transit…' : 'Send signal'} <span aria-hidden="true">↗</span></button>
    </form>
    {error && <p id="prediction-error" className="error" role="alert">{error}</p>}
    <div aria-live="polite">
      <p className="muted">{lesson.cues[f?.phase ?? 0]}</p>
      {run && f && f.phase >= 2 && <p className="relu-line">ReLU · H₁: <strong>{display(run.pass.hiddenSums[0])} → {display(run.pass.hidden[0])}</strong>
        {' · '}H₂: <strong>{display(run.pass.hiddenSums[1])} → {display(run.pass.hidden[1])}</strong>
        {run.pass.hiddenSums.some(v => v < 0) && <span className="blocked"> · Negative sum blocked</span>}</p>}
      {run && done && <>
        <p className={completed(run) ? 'success outcome' : 'outcome'}>
          {completed(run) ? 'Challenge complete' : meetsGoal(run.pass) ? 'Lift reached target' : 'Lift below target'}
          {' · '}Output <strong>{display(run.pass.output)}</strong>
        </p>
        <p className="muted">{run.correct ? 'Prediction correct.' : 'Prediction off. Compare your calculation with the worked result.'}</p>
        <details><summary>See the calculation</summary>
          <p>{workedSolution(network,run.pass,'h1')}</p><p>{workedSolution(network,run.pass,'h2')}</p>
          <p>{workedSolution(network,run.pass,'output')}</p>
        </details>
      </>}
    </div>
  </section>;
}

function App() {
  const [state, dispatch] = useReducer(labReducer, undefined, initialState);
  const [selection, select] = useState<ControlId>(lesson.defaultSelection);
  const [attempt, setAttempt] = useState<{revision: number; run: Run | null}>({revision:0,run:null});
  const { network, revision } = state;
  const pass = useMemo(() => forward(network), [network]);
  const run = attempt.revision === revision ? attempt.run : null;
  const setRun = useMemo(() => (next: Run | null) => setAttempt({revision,run:next}), [revision]);
  const [resetKey, setResetKey] = useState(0);
  return <main>
    <header className="mast"><a href="./" className="brand"><span aria-hidden="true">◈</span> LearnAI</a>
      <div className="edition">INTERACTIVE EXHIBITS <b> / </b> 001</div>
      <button className="reset" onClick={() => {dispatch({type:'reset'});select(lesson.defaultSelection);setResetKey(k=>k+1);}}>↺ Reset bench</button></header>
    <div className="hero"><div><span className="kicker">APPLIED MACHINE LEARNING / FIELD LAB</span><h1>{lesson.title}</h1>
      <p>Send a signal through a tiny neural network and use its output to power a lift.</p></div>
      <div className="objective"><span>MISSION OBJECTIVE</span><strong>Lift target ≥ {lesson.goal.toFixed(2)}</strong><small>Predict the output to complete the challenge.</small></div>
    </div>
    <Scene network={network} selection={selection} select={select} run={run}/>
    <div className="console">
      <Inspector key={selection+':'+resetKey} network={network} selection={selection} select={select} edit={(field,value) => dispatch({type:'edit',field,value})}/>
      <Experiment key={revision} network={network} pass={pass} run={run} setRun={setRun}/>
    </div>
    <footer>LEARN AI / EXPERIMENT 001 <span>2 INPUTS · 2 ReLU UNITS · 1 LINEAR OUTPUT</span></footer>
  </main>;
}

createRoot(document.getElementById('root')!).render(<App/>);
