import { useEffect, useState } from 'react';
import { Sparkles, UserCheck } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Avatar, Badge, SearchInput } from '../ui/kit';
import { CITIES } from '../../lib/constants';
import { useDB, assignInspector, getState } from '../../lib/db';
import { useUI } from '../../context/UIContext';
import { inspectorPerformance, suggestInspector } from '../../lib/stats';
import { carName, fmtDate, fmtTime } from '../../lib/format';

export default function AssignModal({ booking, onClose }) {
  const { toast } = useUI();
  const state = useDB((s) => s);
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const best = booking ? suggestInspector(getState(), booking) : null;

  useEffect(() => { setSel(booking?.inspectorId ?? best?.id ?? null); }, [booking?.id]); // eslint-disable-line

  const list = booking ? inspectorPerformance(state).filter((p) => p.status === 'active').filter((p) => (!city || p.city === city) && `${p.name} ${p.city}`.toLowerCase().includes(q.toLowerCase())) : [];
  const save = () => {
    assignInspector(booking.id, sel);
    toast.success(`${state.users.find((u) => u.id === sel).name} assigned to ${booking.id}.`);
    onClose();
  };

  return (
    <Modal open={!!booking} onClose={onClose} title="Assign inspector" subtitle={booking && `${booking.id} · ${carName(booking.car)} · ${fmtDate(booking.date)} ${fmtTime(booking.time)} · ${booking.location.city}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={UserCheck} disabled={!sel} onClick={save}>Assign</Button></>}>
      <div className="fbar assign-filters"><SearchInput value={q} onChange={setQ} placeholder="Search by inspector name or emirate…" /><select className="input sm" aria-label="Emirate" value={city} onChange={(e) => setCity(e.target.value)}><option value="">All emirates</option>{CITIES.map((c) => <option key={c}>{c}</option>)}</select></div>
      <div className="assign-list">
        {list.map((p) => (
          <button key={p.id} className={sel === p.id ? 'on' : ''} onClick={() => setSel(p.id)}>
            <Avatar name={p.name} size={40} />
            <div>
              <b>{p.name} {best?.id === p.id && <Badge tone="violet"><Sparkles size={11} /> Best match</Badge>}</b>
              <span className="muted small">{p.city}{p.city === booking?.location.city ? ' (same city)' : ''} · {p.active} active · ★ {p.rating}</span>
            </div>
            <i className="radio" />
          </button>
        ))}
        {!list.length && <p className="muted center">No inspectors match.</p>}
      </div>
    </Modal>
  );
}
