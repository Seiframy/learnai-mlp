import * as T from 'three';
import { edges, liftTravel, lesson, nodes, type ControlId } from './lesson';
import { frame, type Run } from './run';
import type { Network } from './network';

type Point = { x: number; y: number };
export function makeWorkbench(host: HTMLDivElement, select: (id: ControlId) => void, labels: (points: Point[]) => void) {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.26;
  host.append(renderer.domElement);
  const scene = new T.Scene();
  const camera = new T.OrthographicCamera();
  camera.position.set(0, 10.5, 13.5);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();

  const key = new T.DirectionalLight(0xffe1a8, 3.1);
  key.position.set(-3, 7, 4);
  const rim = new T.DirectionalLight(0x65defe, 2.3);
  rim.position.set(4, 5, -5);
  scene.add(key, rim, new T.HemisphereLight(0xb8e5fc, 0x252238, 1.65));
  const metal = (color: number, roughness = .5) => new T.MeshStandardMaterial({ color, roughness, metalness: .24 });
  const flat = (color: number) => new T.MeshBasicMaterial({ color });
  const navy = metal(0x142739), top = metal(0x203b4c), steel = metal(0x537589);
  const gold = metal(0xcb8c45), cream = flat(0xf9c67e);
  const aqua = 0x59f4df, amber = 0xffb658, coral = 0xff795f;
  const hits: T.Object3D[] = [];
  function mesh<M extends T.Material>(g: T.BufferGeometry, m: M, x: number, y: number, z: number, parent: T.Object3D = scene) {
    const item = new T.Mesh(g,m);
    item.position.set(x,y,z);
    parent.add(item);
    return item;
  }
  const box = <M extends T.Material>(w: number,h: number,d: number,m: M,x: number,y: number,z: number,p?: T.Object3D) =>
    mesh(new T.BoxGeometry(w,h,d),m,x,y,z,p);
  const cyl = <M extends T.Material>(r: number,h: number,m: M,x: number,y: number,z: number,p?: T.Object3D) =>
    mesh(new T.CylinderGeometry(r,r,h,24),m,x,y,z,p);
  const pipe = <M extends T.Material>(path: T.Curve<T.Vector3>,radius: number,m: M) =>
    mesh(new T.TubeGeometry(path,20,radius,6),m,0,0,0);
  function pickable(item: T.Object3D, id: ControlId) { item.userData.id = id; hits.push(item); }

  box(12.55,.34,6.3,navy,0,-.35,0);
  box(12.38,.16,6.12,gold,0,-.23,0);
  box(12.2,.22,5.96,top,0,-.13,0);
  box(11.75,.045,5.48,navy,0,-.012,0);
  const gridPoints: number[] = [];
  for (let i=-11;i<=11;i++) gridPoints.push(i*.5,.015,-2.7,i*.5,.015,2.7);
  for (let i=-5;i<=5;i++) gridPoints.push(-5.85,.015,i*.5,5.85,.015,i*.5);
  const grid = new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(gridPoints,3)),
    new T.LineBasicMaterial({color:0x284758}));
  scene.add(grid);
  for (const x of [-5.98,5.98]) for (const z of [-2.84,2.84]) cyl(.075,.03,gold,x,0,z);
  for (const x of [-4.65,-1.55,1.63,4.37]) {
    box(1.42,.025,.075,steel,x,.032,2.53);
    for (let i=-3;i<=3;i++) box(.05,.03,.15,gold,x+i*.16,.034,2.53);
  }
  const positions = [[-4.62,-1.36],[-4.62,1.36],[-1.62,-1.36],[-1.62,1.36],[1.48,0]] as const;
  const pad = flat(0x101f2c);
  const discs = positions.map(([x,z],i) => {
    const accent = i<2 ? aqua : i<4 ? amber : 0xb2b2ff;
    cyl(.78,.04,pad,x,.034,z);
    const base = cyl(.68,.28,navy,x,.17,z);
    const band = cyl(.63,.085,metal(accent),x,.32,z);
    const body = cyl(.56,.27,steel,x,.45,z);
    const cap = cyl(.49,.075,navy,x,.615,z);
    const ring = mesh(new T.TorusGeometry(.46,.024,8,32),flat(accent),x,.658,z);
    ring.rotation.x = -Math.PI/2;
    const status = cyl(.21,.06,flat(accent),x,.675,z);
    [base,band,body,cap,ring,status].forEach(item => pickable(item,nodes[i].id));
    return {ring,status,accent};
  });
  const pellet = new T.SphereGeometry(.10,12,8);
  const invisible = new T.MeshBasicMaterial({ visible:false });
  const wires = edges.map((e,i) => {
    const [x,z] = positions[e.from], [xx,zz] = positions[e.to];
    const bend = i===1 ? .44 : i===2 ? -.44 : 0;
    const path = new T.CubicBezierCurve3(new T.Vector3(x+.48,.22,z),
      new T.Vector3(x+1.06,.22+bend*.35,z+bend), new T.Vector3(xx-1.06,.22+bend*.35,zz+bend), new T.Vector3(xx-.48,.22,zz));
    const wire = pipe(path,.044,metal(0x51a7aa));
    pickable(pipe(path,.14,invisible),e.id);
    const signal = mesh(pellet,flat(aqua),0,0,0);
    signal.visible = false;
    return {path,wire,signal};
  });

  const liftX = 4.36;
  pipe(new T.LineCurve3(new T.Vector3(2.05,.21,0),new T.Vector3(3.35,.21,0)),.065,gold);
  box(2.02,.18,2.35,navy,liftX,.13,0);
  box(1.89,.08,2.22,steel,liftX,.25,0);
  for (const x of [liftX-.84,liftX+.84]) for (const z of [-.91,.91]) {
    box(.12,2.33,.12,steel,x,1.29,z);
    box(.22,.09,.22,gold,x,2.47,z);
  }
  const platform = new T.Group();
  platform.position.set(liftX,.34,0);
  scene.add(platform);
  box(1.57,.18,1.67,metal(0xaf7745),0,0,0,platform);
  box(1.45,.07,1.54,navy,0,.12,0,platform);
  for (let i=-3;i<=3;i++) box(.13,.016,1.25,cream,i*.19,.165,0,platform);
  const beacon = mesh(new T.IcosahedronGeometry(.28,0),metal(0x68b3c3,.31),0,.50,0,platform);
  beacon.rotation.set(.32,.42,.10);
  cyl(.33,.1,navy,0,.25,0,platform);
  const goalY = .34 + liftTravel(lesson.goal)*1.62;
  box(1.9,.055,.065,cream,liftX,goalY,-.95);
  for (const x of [liftX-.86,liftX+.86]) box(.15,.09,.27,cream,x,goalY,.91);

  const ray = new T.Raycaster(), ndc = new T.Vector2(), point = new T.Vector3();
  function pointer(e: PointerEvent) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);
    ray.setFromCamera(ndc,camera);
    return ray.intersectObjects(hits,false)[0]?.object.userData.id as ControlId | undefined;
  }
  const click = (e: PointerEvent) => { const id = pointer(e); if (id) select(id); };
  const move = (e: PointerEvent) => { renderer.domElement.style.cursor = pointer(e) ? 'pointer' : 'default'; };
  renderer.domElement.addEventListener('pointerup',click);
  renderer.domElement.addEventListener('pointermove',move);

  const draw = () => { if (!document.hidden) renderer.render(scene,camera); };
  function resize() {
    const w=host.clientWidth,h=host.clientHeight;
    if (!w || !h) return;
    const aspect=w/h,width=Math.max(13.25,6.65*aspect);
    camera.left=-width/2; camera.right=width/2;
    camera.top=width/aspect/2; camera.bottom=-camera.top;
    camera.updateProjectionMatrix();
    renderer.setSize(w,h);
    labels([...positions.map(([x,z]) => new T.Vector3(x,1.16,z)),new T.Vector3(liftX,2.84,0),
      ...wires.map(({path}) => path.getPoint(.5).add(new T.Vector3(0,.13,0)))].map(v => {
        v.project(camera);
        return {x:(v.x+1)*50,y:(1-v.y)*50};
      }));
    draw();
  }
  const observer=new ResizeObserver(resize);
  observer.observe(host);
  document.addEventListener('visibilitychange',draw);
  resize();
  return {
    update(network: Network,selected: ControlId,run: Run | null) {
      const f=run ? frame(run.elapsed) : null;
      discs.forEach(({ring,status,accent},i) => {
        ring.material.color.setHex(selected===nodes[i].id ? 0xffffff : accent);
        const blocked=run && f && f.phase>=2 && i>=2 && i<4 && run.pass.hidden[i-2]===0;
        status.material.color.setHex(blocked ? coral : accent);
      });
      wires.forEach(({wire,signal,path},i) => {
        const e=edges[i], field=e.field;
        const weight=field.kind==='hiddenWeight' ? network.hiddenWeights[field.neuron][field.input] : network.outputWeights[field.index];
        wire.material.color.setHex(selected===e.id ? amber : weight<0 ? 0x996686 : 0x4e9a9e);
        const first=i<4, contribution=run?.contributions[i] ?? 0;
        signal.visible=!!f && f.phase===(first ? 1 : 3) && contribution!==0;
        if (signal.visible && f) {
          path.getPoint(first ? f.input : f.output,point);
          signal.position.copy(point);
          signal.material.color.setHex(contribution<0 ? coral : aqua);
        }
      });
      const t=f?.lift ?? 0;
      platform.position.y=.34+(run ? liftTravel(run.pass.output)*1.62*t*t*(3-2*t) : 0);
      beacon.material.color.setHex(f?.done && run && run.pass.output>=lesson.goal ? 0x67ffcb : 0x68b3c3);
      draw();
    },
    dispose() {
      observer.disconnect();
      document.removeEventListener('visibilitychange',draw);
      renderer.domElement.removeEventListener('pointerup',click);
      renderer.domElement.removeEventListener('pointermove',move);
      const geometries=new Set<T.BufferGeometry>(), materials=new Set<T.Material>();
      scene.traverse(object => {
        if (object instanceof T.Mesh || object instanceof T.LineSegments) { geometries.add(object.geometry); materials.add(object.material); }
      });
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
