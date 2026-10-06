import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// A sedan modelled entirely in code (no external model files): extruded body, glass cabin, wheels and lamps.
export function buildCar({ color, glass, rim }) {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: 0.55, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.06 });
  const glassM = new THREE.MeshPhysicalMaterial({ color: glass, metalness: 0.2, roughness: 0.04, clearcoat: 1, envMapIntensity: 1.8 });
  const tyre = new THREE.MeshStandardMaterial({ color: '#0d0d0d', roughness: 0.85 });
  const chrome = new THREE.MeshStandardMaterial({ color: rim, metalness: 1, roughness: 0.2 });
  const headM = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 2.4 });
  const tailM = new THREE.MeshStandardMaterial({ color: '#ff2b2b', emissive: '#ff2b2b', emissiveIntensity: 1.8 });

  // lower body: side profile, extruded across the width (Z)
  const lower = new THREE.Shape();
  lower.moveTo(-2.05, 0.34);
  lower.lineTo(2.02, 0.34);
  lower.quadraticCurveTo(2.12, 0.44, 2.06, 0.62);
  lower.quadraticCurveTo(1.92, 0.76, 1.38, 0.82);
  lower.lineTo(0.95, 0.98);
  lower.lineTo(-1.38, 0.98);
  lower.lineTo(-1.95, 0.86);
  lower.quadraticCurveTo(-2.1, 0.8, -2.08, 0.62);
  lower.quadraticCurveTo(-2.05, 0.46, -2.05, 0.34);
  const bodyGeo = new THREE.ExtrudeGeometry(lower, { depth: 1.7, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 6, curveSegments: 24 });
  bodyGeo.translate(0, 0, -0.85);
  g.add(new THREE.Mesh(bodyGeo, paint));

  // glass cabin: caps (side windows) use glass, the profile edges use paint
  const cabin = new THREE.Shape();
  cabin.moveTo(0.98, 0.9);
  cabin.quadraticCurveTo(0.74, 1.3, 0.28, 1.46);
  cabin.lineTo(-0.9, 1.46);
  cabin.quadraticCurveTo(-1.26, 1.4, -1.46, 0.9);
  cabin.closePath();
  const cabGeo = new THREE.ExtrudeGeometry(cabin, { depth: 1.46, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 4, curveSegments: 20 });
  cabGeo.translate(0, 0, -0.73);
  g.add(new THREE.Mesh(cabGeo, [glassM, paint]));

  // wheels with five-spoke rims
  const wheel = (x, z) => {
    const w = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.34, 48), tyre);
    t.rotation.x = Math.PI / 2;
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.36, 40), chrome);
    r.rotation.x = Math.PI / 2;
    w.add(t, r);
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.38), chrome);
      s.rotation.z = (i / 5) * Math.PI * 2;
      w.add(s);
    }
    w.position.set(x, 0.42, z);
    g.add(w);
  };
  [-1.25, 1.28].forEach((x) => [-0.8, 0.8].forEach((z) => wheel(x, z)));

  // lamps
  [-0.6, 0.6].forEach((z) => {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.34), headM); h.position.set(2.04, 0.6, z); g.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.3), tailM); t.position.set(-2.06, 0.66, z); g.add(t);
  });
  return g;
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const grd = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(0,0,0,.6)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = grd;
  x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

/**
 * Real-time 3D car.
 * mode: 'spin' (turns slowly) | 'scroll' (turns with the page) | 'drag' (drag to turn) | 'still'
 * Renders nothing WebGL-related when the browser has no WebGL; `fallback` is shown instead.
 */
export default function Car3D({ color = '#ffac00', glass = '#0a0d0e', rim = '#d6d9dc', mode = 'spin', fov = 30, speed = 0.35, className = '', fallback = null }) {
  const host = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      setFailed(true);
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    el.style.touchAction = mode === 'drag' ? 'none' : 'pan-y';

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
    camera.position.set(4.9, 2.0, 7.4);
    camera.lookAt(0, 0.62, 0);

    const pivot = new THREE.Group();
    pivot.add(buildCar({ color, glass, rim }));
    scene.add(pivot);

    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 2.8), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.002;
    scene.add(shadow);
    const key = new THREE.DirectionalLight('#ffffff', 1.3);
    key.position.set(3, 6, 4);
    scene.add(key);

    // only animate while on screen
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
    io.observe(el);

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let target = 0;
    let drag = null;
    const onScroll = () => { target = window.scrollY * 0.0019; };
    if (mode === 'scroll') { onScroll(); window.addEventListener('scroll', onScroll, { passive: true }); }
    const down = (e) => { if (mode !== 'drag') return; drag = { x: e.clientX, r: pivot.rotation.y }; };
    const move = (e) => { if (drag) pivot.rotation.y = drag.r + (e.clientX - drag.x) * 0.008; };
    const up = () => { drag = null; };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);

    const resize = () => {
      const w = el.clientWidth; const h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let last = performance.now();
    renderer.setAnimationLoop(() => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible) return;
      if (mode === 'spin' && !reduce && !drag) pivot.rotation.y += dt * speed;
      if (mode === 'scroll') pivot.rotation.y += (target - pivot.rotation.y) * 0.08;
      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      scene.traverse((o) => {
        o.geometry?.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m?.map?.dispose(); m?.dispose(); });
      });
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [color, glass, rim, mode, fov, speed]);

  if (failed) return fallback;
  return <div ref={host} className={`car3d ${className}`} role="img" aria-label="3D model of a car" />;
}
