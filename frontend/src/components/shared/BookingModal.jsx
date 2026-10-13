import Modal from '../ui/Modal';
import { Avatar, PayBadge, StatusBadge, Timeline } from '../ui/kit';
import { useDB } from '../../lib/db';
import { carName, fmtDate, fmtTime, money } from '../../lib/format';
import { VAT_RATE } from '../../lib/constants';

// Read-only booking details used by all three portals. `footer` lets each portal add its own actions.
export default function BookingModal({ bookingId, onClose, footer }) {
  const d = useDB((s) => {
    const b = s.bookings.find((x) => x.id === bookingId);
    if (!b) return null;
    return { b, plan: s.plans.find((p) => p.id === b.planId), customer: s.users.find((u) => u.id === b.customerId), inspector: s.users.find((u) => u.id === b.inspectorId) };
  });
  return (
    <Modal open={!!bookingId} onClose={onClose} size="lg" title={d ? `Booking ${d.b.id}` : 'Booking'} subtitle={d ? carName(d.b.car) : ''} footer={d && footer?.(d.b)}>
      {d && (
        <div className="detail-grid">
          <div>
            <div className="row-between"><StatusBadge status={d.b.status} /><PayBadge status={d.b.payment.status} /></div>
            <dl className="kv col">
              <div><dt>Vehicle</dt><dd>{carName(d.b.car)} · {d.b.car.type}</dd></div>
              <div><dt>Fuel / Reg.</dt><dd>{d.b.car.fuel} · {d.b.car.reg}</dd></div>
              <div><dt>Plan</dt><dd>{d.plan?.name} ({d.plan?.checkpoints} checkpoints)</dd></div>
              <div><dt>Slot</dt><dd>{fmtDate(d.b.date)} at {fmtTime(d.b.time)}</dd></div>
              <div><dt>Location</dt><dd>{d.b.location.address}, {d.b.location.city}</dd></div>
              <div><dt>Reason</dt><dd>{d.b.purpose}</dd></div>
              <div><dt>Customer</dt><dd className="with-av"><Avatar name={d.customer?.name} size={24} />{d.customer?.name}</dd></div>
              <div><dt>Inspector</dt><dd className="with-av">{d.inspector ? <><Avatar name={d.inspector.name} size={24} />{d.inspector.name}</> : <span className="muted">Not assigned yet</span>}</dd></div>
            </dl>
            <div className="price-box">
              <div><span>{d.plan?.name} inspection</span><b>{money(d.b.pricing.plan)}</b></div>
              {d.b.pricing.discount > 0 && <div className="disc"><span>Promo discount</span><b>−{money(d.b.pricing.discount)}</b></div>}
              <div><span>Booking fee</span><b>{money(d.b.pricing.bookingFee)}</b></div>
              <div><span>VAT ({Math.round(VAT_RATE * 100)}%)</span><b>{money(d.b.pricing.vat)}</b></div>
              <div className="total"><span>Total · {d.b.payment.method}</span><b>{money(d.b.pricing.total)}</b></div>
            </div>
          </div>
          <div>
            <h4 className="mb">Activity</h4>
            <Timeline items={d.b.timeline} status={d.b.status} />
          </div>
        </div>
      )}
    </Modal>
  );
}
