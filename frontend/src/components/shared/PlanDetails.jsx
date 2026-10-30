import { useState } from 'react';
import { Check, X, ChevronRight } from 'lucide-react';
import { planDetails } from '../../lib/planDetails';
import { TAX_NAME } from '../../lib/constants';
import { money } from '../../lib/format';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

// Short feature list for a plan card, with a "View full details" link that opens the complete breakdown in a popup.
export default function PlanDetails({ plan, onChoose, chooseLabel = 'Choose plan' }) {
  const [open, setOpen] = useState(false);
  const d = planDetails(plan);
  const show = (e) => { e.stopPropagation(); setOpen(true); };
  return (
    // the popup is rendered through a portal, but React still bubbles its clicks to the card, so stop them here
    <span className="pd-wrap" style={{ display: 'contents' }} onClick={(e) => e.stopPropagation()}>
      <ul>{plan.features.map((f) => <li key={f}><Check size={14} />{f}</li>)}</ul>
      <span role="button" tabIndex={0} className="plan-more" onClick={show} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), show(e))}>
        View full details <ChevronRight size={14} />
      </span>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title={`${plan.name} plan`}
        subtitle={`${money(plan.price)} + ${TAX_NAME}`}
        footer={onChoose && <Button onClick={() => { setOpen(false); onChoose(); }}>{chooseLabel}</Button>}
      >
        <div className="pd-facts">
          <span>{plan.checkpoints} checkpoints</span>
          <span>{plan.duration}</span>
          <span>Photo-backed PDF report</span>
        </div>
        {d.best && <p className="pd-best"><b>Best for:</b> {d.best}</p>}
        <div className="pd-grid">
          {d.groups.map((g) => (
            <div key={g.id} className="pd-card">
              <h5>{g.title}{g.count > 0 && <em>{g.count} checks</em>}</h5>
              <ul>{g.items.map((t) => <li key={t}><Check size={14} />{t}</li>)}</ul>
            </div>
          ))}
          <div className="pd-card">
            <h5>Also included</h5>
            <ul>{d.includes.map((t) => <li key={t}><Check size={14} />{t}</li>)}</ul>
          </div>
          {d.notIncluded.length > 0 && (
            <div className="pd-card not">
              <h5>Not included</h5>
              <ul>{d.notIncluded.map((t) => <li key={t}><X size={14} />{t}</li>)}</ul>
            </div>
          )}
        </div>
      </Modal>
    </span>
  );
}
