import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, FileText, CalendarClock, XCircle, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useDB, cancelBooking, rescheduleBooking, rateBooking } from '../../lib/db';
import { PageHeader, SearchInput, StatusBadge, Tabs, useLoading, Stars, Field, Select, Tm, FilterBar, useFilters, inRange } from '../../components/ui/kit';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Calendar from '../../components/ui/Calendar';
import BookingModal from '../../components/shared/BookingModal';
import ReportModal from '../../components/shared/ReportModal';
import { carName, fmtDate, fmtTime, isoDate, money } from '../../lib/format';
import { TIME_SLOTS, INSPECTION_REASONS } from '../../lib/constants';

export default function MyBookings() {
  const { user } = useAuth();
  const { toast, confirm, guard } = useUI();
  const all = useDB((s) => s.bookings.filter((b) => b.customerId === user.id));
  const plans = useDB((s) => s.plans);
  const loading = useLoading(500);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const flt = useFilters();
  const [view, setView] = useState(null);
  const [report, setReport] = useState(null);
  const [resched, setResched] = useState(null);
  const [rd, setRd] = useState({ date: '', time: '' });

  const planName = (id) => plans.find((p) => p.id === id)?.name;
  const rows = useMemo(() => all
    .filter((b) => tab === 'all' || (tab === 'active' ? ['pending', 'assigned', 'ongoing'].includes(b.status) : b.status === tab))
    .filter((b) => `${b.id} ${carName(b.car)} ${b.car.reg}`.toLowerCase().includes(q.toLowerCase()))
    .filter((b) => (!flt.f.plan || b.planId === flt.f.plan) && (!flt.f.reason || b.purpose === flt.f.reason || (flt.f.reason === 'Other' && !INSPECTION_REASONS.includes(b.purpose))) && inRange(b.date, flt.f))
    .sort((a, b) => b.date.localeCompare(a.date)), [all, tab, q, flt.key]); // eslint-disable-line

  const counts = (f) => all.filter(f).length;
  const canChange = (b) => ['pending', 'assigned'].includes(b.status);

  const cancel = async (b) => {
    const ok = await confirm({ title: 'Cancel this booking?', message: `${b.id} (${carName(b.car)}) will be cancelled${b.payment.status === 'paid' ? ` and ${money(b.pricing.total)} refunded to your original payment method` : ''}.`, confirmText: 'Yes, cancel booking', cancelText: 'Keep booking', danger: true });
    if (!ok) return;
    if (await guard(cancelBooking(b.id), b.payment.status === 'paid' ? 'Booking cancelled. Your refund is on its way.' : 'Booking cancelled.')) setView(null);
  };
  const saveResched = async () => {
    if (!rd.date || !rd.time) return toast.warn('Pick a new date and time.');
    if (!await guard(rescheduleBooking(resched.id, rd.date, rd.time), `Rescheduled to ${fmtDate(rd.date)} at ${fmtTime(rd.time)}.`)) return;
    setResched(null); setView(null);
  };

  const cols = [
    { key: 'id', hide: 'sm', label: 'Booking ID', width: 135, render: (b) => <b className="mono">{b.id}</b> },
    { key: 'car', label: 'Vehicle', sortValue: (b) => carName(b.car), render: (b) => <div className="cell-2"><b>{carName(b.car)}</b><span className="muted small">{b.car.fuel} · {b.car.reg}</span></div> },
    { key: 'planId', hide: 'lg', label: 'Plan', width: 110, render: (b) => planName(b.planId) },
    { key: 'date', hide: 'sm', label: 'Date & time', width: 170, render: (b) => <div className="cell-2"><b>{fmtDate(b.date)}</b><span className="muted small">{fmtTime(b.time)}</span></div> },
    { key: 'status', label: 'Status', width: 140, render: (b) => <StatusBadge status={b.status} /> },
    { key: 'total', hide: 'md', label: 'Total', width: 100, sortValue: (b) => b.pricing.total, render: (b) => money(b.pricing.total) },
    {
      key: 'actions', label: '', width: 150, sortable: false, align: 'right',
      render: (b) => b.status === 'completed'
        ? <Button size="sm" variant="outline" icon={FileText} onClick={(e) => { e.stopPropagation(); setReport(b.id); }}>Report</Button>
        : null,
    },
  ];

  const fdefs = [
    { key: 'plan', label: 'All plans', options: plans.map((p) => ({ value: p.id, label: p.name })) },
    { key: 'reason', label: 'All reasons', options: INSPECTION_REASONS },
    { key: 'from', label: 'From', type: 'date' }, { key: 'to', label: 'To', type: 'date' }
  ];
  const viewing = all.find((b) => b.id === view);
  return (
    <div className="page fill">
      <PageHeader title="My bookings" subtitle="Track every inspection from booking to report."
        actions={<Link to="/app/book"><Button icon={CalendarPlus}>New booking</Button></Link>} />
      <div className="toolbar">
        <Tabs value={tab} onChange={setTab} tabs={[
          { value: 'all', label: 'All', count: all.length }, { value: 'active', label: 'Active', count: counts((b) => ['pending', 'assigned', 'ongoing'].includes(b.status)) },
          { value: 'completed', label: 'Completed', count: counts((b) => b.status === 'completed') }, { value: 'cancelled', label: 'Cancelled', count: counts((b) => b.status === 'cancelled') },
        ]} />
        <div className="filters"><FilterBar defs={fdefs} flt={flt} /><SearchInput value={q} onChange={setQ} placeholder="Search by booking ID, car or plate…" /></div>
      </div>
      <DataTable columns={cols} rows={rows} loading={loading} onRowClick={(b) => setView(b.id)} resetKey={tab + q + flt.key}
        empty={<><CalendarPlus size={30} /><b>No bookings here</b><span className="muted">Book your first inspection to get started.</span></>} />

      <BookingModal bookingId={view} onClose={() => setView(null)} footer={(b) => (
        <>
          {canChange(b) && <Button variant="danger-ghost" icon={XCircle} onClick={() => cancel(b)}>Cancel booking</Button>}
          {canChange(b) && <Button variant="outline" icon={CalendarClock} onClick={() => { setRd({ date: '', time: '' }); setResched(b); }}>Reschedule</Button>}
          {b.status === 'completed' && (
            <>
              <span className="rate-inline"><span className="muted small">{b.rating ? 'Your rating' : 'Rate your inspector'}</span><Stars size={28} value={b.rating ?? 0} onChange={(n) => guard(rateBooking(b.id, n), 'Thanks for your feedback!')} /></span>
              <Button icon={FileText} onClick={() => setReport(b.id)}>View report</Button>
            </>
          )}
        </>
      )} />
      <ReportModal bookingId={report} onClose={() => setReport(null)} />

      <Modal open={!!resched} onClose={() => setResched(null)} size="md" title="Reschedule inspection" subtitle={resched && `${resched.id} · ${carName(resched.car)}`}
        footer={<><Button variant="ghost" onClick={() => setResched(null)}>Close</Button><Button onClick={saveResched}>Confirm new slot</Button></>}>
        <div className="cal-wrap">
          <Calendar value={rd.date} min={isoDate()} onChange={(d) => setRd({ date: d, time: '' })} />
          <div className="slots">
            <h4>{rd.date ? fmtDate(rd.date, { weekday: 'long', day: 'numeric', month: 'short' }) : 'Select a date'}</h4>
            <div className="slot-grid">{TIME_SLOTS.map((t) => <button key={t} type="button" disabled={!rd.date || new Date(`${rd.date}T${t}:00`) <= new Date()} className={rd.time === t ? 'on' : ''} onClick={() => setRd({ ...rd, time: t })}><Tm t={t} /></button>)}</div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
