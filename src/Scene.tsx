import { useEffect, useRef, useState } from 'react';
import { display, type Network } from './network';
import { controls, edges, liftTravel, lesson, nodes, type ControlId } from './lesson';
import { frame, type Run } from './run';
import { makeWorkbench } from './workbench';

export function parameter(network: Network, id: ControlId) {
  const field = controls.find(c => c.id === id)!.field;
  switch (field.kind) {
    case 'input': return network.inputs[field.index];
    case 'hiddenWeight': return network.hiddenWeights[field.neuron][field.input];
    case 'hiddenBias': return network.hiddenBiases[field.index];
    case 'outputWeight': return network.outputWeights[field.index];
    case 'outputBias': return network.outputBias;
  }
}

interface Props { network: Network; selection: ControlId; select: (id: ControlId) => void; run: Run | null }

export function Scene({ network, selection, select, run }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const workbench = useRef<ReturnType<typeof makeWorkbench> | null>(null);
  const [points, setPoints] = useState<{x:number;y:number}[]>([]);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    try {
      const wb = makeWorkbench(host.current!, select, setPoints);
      workbench.current = wb;
      const canvas = host.current!.querySelector('canvas')!;
      const lost = () => setFallback(true);
      canvas.addEventListener('webglcontextlost', lost);
      return () => {
        canvas.removeEventListener('webglcontextlost', lost);
        wb.dispose();
        workbench.current = null;
      };
    } catch {
      setFallback(true);
    }
  }, [select]);
  useEffect(() => {
    workbench.current?.update(network, selection, run);
  }, [network, selection, run]);
  const f = run ? frame(run.elapsed) : null;
  const activeWire = edges.findIndex(e => e.id === selection);
  const readout = f && f.phase === 4 && run ? display(run.pass.output) : '—';
  const label = (i: number) => {
    if (i < 2) return display(network.inputs[i]);
    if (i < 4 && run && f && f.phase >= 2) return display(run.pass.hiddenSums[i-2]) + ' → ' + display(run.pass.hidden[i-2]);
    if (i === 4) return readout;
    return 'ReLU';
  };
  return <section className="scene" aria-label="Interactive workbench">
    <div className="scene-meta"><span className="led" /> WORKBENCH 01 <b> / </b> FORWARD PASS</div>
    <div className="scene-index">{f ? <>{String(f.phase).padStart(2, '0')} / <strong>{lesson.stageNames[f.phase]}</strong></> : <>NETWORK <strong>02 / 02 / 01</strong></>}</div>
    <div className="viewport" ref={host} hidden={fallback} aria-hidden="true"/>
    {!fallback && points.length > 0 && <>
      {nodes.map((node, i) => <button key={node.id} type="button" className={'tag node n'+i}
        style={{left: points[i].x+'%',top:points[i].y+'%'}} onClick={() => select(node.id)}
        aria-label={'Inspect '+node.name} aria-pressed={selection === node.id}>
        <b>{node.label}</b><span>{label(i)}</span>
      </button>)}
      <div className="tag lift-tag" style={{left:points[5].x+'%',top:points[5].y+'%'}}>
        <b>LIFT</b><span>{readout}</span>
      </div>
      {activeWire >= 0 && <div className="tag wire-tag" style={{left:points[6+activeWire].x+'%',top:points[6+activeWire].y+'%'}} aria-hidden="true">
        {display(parameter(network,selection))}
      </div>}
    </>}
    {fallback && <div className="fallback">
      <p>3D is unavailable. You can still run the experiment and read its results.</p>
      <div className="fallback-nodes">{nodes.map((node,i) => <button key={node.id} type="button" onClick={() => select(node.id)} aria-pressed={selection === node.id}>{node.label} · {label(i)}</button>)}</div>
      <label>Lift travel <meter min="0" max="1" value={run && f ? f.lift*liftTravel(run.pass.output) : 0}/></label>
    </div>}
    <div className="legend"><span><i/> Positive signal</span><span><i/> Negative signal</span><span><i/> Selected connection</span></div>
  </section>;
}
