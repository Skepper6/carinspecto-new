import { useRef, useState } from 'react';
import { ShieldCheck, RotateCcw } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { maskPlate } from '../../lib/image';

// Drag a box over the number plate – on apply it is replaced with the Car InspectO logo.
export default function PlateMaskModal({ photo, onClose, onApply }) {
  const box = useRef(null);
  const [rect, setRect] = useState(null);
  const [start, setStart] = useState(null);
  const [busy, setBusy] = useState(false);

  const pos = (e) => {
    const b = box.current.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)), y: Math.min(1, Math.max(0, (e.clientY - b.top) / b.height)) };
  };
  const down = (e) => { e.preventDefault(); box.current.setPointerCapture(e.pointerId); const p = pos(e); setStart(p); setRect({ x: p.x, y: p.y, w: 0, h: 0 }); };
  const move = (e) => {
    if (!start) return;
    const p = pos(e);
    setRect({ x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) });
  };
  const up = () => setStart(null);
  const valid = rect && rect.w > 0.02 && rect.h > 0.01;

  const apply = async () => {
    setBusy(true);
    try { onApply(await maskPlate(photo.src, rect)); setRect(null); } finally { setBusy(false); }
  };

  return (
    <Modal open={!!photo} onClose={onClose} size="lg" title="Cover the number plate" subtitle="Drag a box over the plate. The Car InspectO logo replaces the registration in the report."
      footer={<><Button variant="ghost" icon={RotateCcw} onClick={() => setRect(null)} disabled={!rect}>Reset</Button><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={ShieldCheck} disabled={!valid} loading={busy} onClick={apply}>Apply logo</Button></>}>
      {photo && (
        <div className="mask-box" ref={box} onPointerDown={down} onPointerMove={move} onPointerUp={up}>
          <img src={photo.src} alt="Vehicle" draggable={false} />
          {rect && <div className="mask-rect" style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%` }}><img src="/logo.png" alt="" /></div>}
        </div>
      )}
    </Modal>
  );
}
