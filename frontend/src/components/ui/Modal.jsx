import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Animated modal. Stays mounted briefly after `open` flips to false so the exit animation can play.
// open modals, topmost last – Escape must only close the one on top
const STACK = [];

export default function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', drawer = false }) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const panel = useRef(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // both frames are cancelled on close, otherwise a quick open-then-close could flip a closing modal back to "visible"
      let r2;
      const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setVisible(true)); });
      return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 240);
    return () => clearTimeout(t);
  }, [open]);

  // keep the latest onClose without re-running the effect (inline handlers change every render)
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    if (!open) return undefined;
    const me = {};
    STACK.push(me);
    const onKey = (e) => e.key === 'Escape' && STACK[STACK.length - 1] === me && closeRef.current?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // focus the dialog once when it opens – unless something inside already took focus (e.g. autoFocus)
    const t = setTimeout(() => { if (panel.current && !panel.current.contains(document.activeElement)) panel.current.focus(); }, 30);
    return () => { clearTimeout(t); STACK.splice(STACK.indexOf(me), 1); document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);

  if (!mounted) return null;
  return createPortal(
    <div className={`modal-root ${visible ? 'in' : ''} ${drawer ? 'is-drawer' : ''}`}>
      <div className="modal-backdrop" onClick={onClose} />
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`modal modal-${size}`}>
        <header className="modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p className="muted small">{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}
