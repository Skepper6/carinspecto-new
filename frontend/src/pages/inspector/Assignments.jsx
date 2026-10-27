import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ClipboardCheck, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDB } from '../../lib/db';
import { PageHeader, SearchInput, StatusBadge, Tabs, useLoading, FilterBar, useFilters, inRange } from '../../components/ui/kit';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import BookingModal from '../../components/shared/BookingModal';
import { CITIES, ALL_REGIONS } from '../../lib/constants';
import { carName, fmtDate, fmtTime, isoDate } from '../../lib/format';

export default function Assignments() {
  const { user } = useAuth();
  const nav = useNavigate();
  const mine = useDB((s) => s.bookings.filter((b) => b.inspectorId === user.id && ['assigned', 'ongoing'].includes(b.status)));
  const plans = useDB((s) => s.plans);
  const loading = useLoading(500);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const flt = useFilters();
  const [view, setView] = useState(null);
  const today = isoDate();

  const rows = useMemo(() => mine
    .filter((b) => (tab === 'all' ? true : tab === 'today' ? b.date <= today : tab === 'upcoming' ? b.date > today : b.status === 'ongoing'))
    .filter((b) => `${b.id} ${carName(b.car)} ${b.location.city} ${b.location.address}`.toLowerCase().includes(q.toLowerCase()))
    .filter((b) => (!flt.f.plan || b.planId === flt.f.plan) && (!flt.f.city || b.location.city === flt.f.city) && inRange(b.date, flt.f))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)), [mine, tab, q, today, flt.key]); // eslint-disable-line

  const fdefs = [
    { key: 'plan', label: 'All plans', options: plans.map((p) => ({ value: p.id, label: p.name })) },
    { key: 'city', label: ALL_REGIONS, options: CITIES },
    { key: 'from', label: 'From', type: 'date' }, { key: 'to', label: 'To', type: 'date' }
  ];
  const cols = [
    { key: 'id', hide: 'sm', label: 'Booking ID', width: 135, render: (b) => <b className="mono">{b.id}</b> },
    { key: 'car', label: 'Vehicle', phoneMinWidth: 200, sortValue: (b) => carName(b.car), render: (b) => <div className="cell-2"><b>{carName(b.car)}</b><span className="muted small">{b.car.fuel} · {b.car.reg}</span></div> },
    { key: 'date', label: 'Slot', width: 150, render: (b) => <div className="cell-2"><b>{b.date === today ? 'Today' : fmtDate(b.date)}</b><span className="muted small">{fmtTime(b.time)}</span></div> },
    { key: 'loc', hide: 'md', phoneHide: true, label: 'Location', width: 180, sortValue: (b) => b.location.city, render: (b) => <div className="cell-2"><b><MapPin size={13} /> {b.location.city}</b><span className="muted small">{b.location.address}</span></div> },
    { key: 'plan', hide: 'lg', label: 'Plan', width: 100, render: (b) => plans.find((p) => p.id === b.planId)?.name },
    { key: 'status', label: 'Status', width: 140, render: (b) => <StatusBadge status={b.status} /> },
    {
      key: 'a', label: '', width: 140, align: 'right', sortable: false,
      render: (b) => <Button size="sm" icon={Play} onClick={(e) => { e.stopPropagation(); nav(`/inspector/inspect/${b.id}`); }}>{b.status === 'ongoing' ? 'Continue' : 'Start'}</Button>,
    },
  ];

  return (
    <div className="page fill">
      <PageHeader title="Assignments" subtitle="Inspections assigned to you. Open one to start the digital checklist." />
      <div className="toolbar">
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'all', label: 'All', count: mine.length }, { value: 'today', label: 'Due today' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'ongoing', label: 'In progress' }]} />
        <div className="filters"><FilterBar defs={fdefs} flt={flt} /><SearchInput value={q} onChange={setQ} placeholder="Search by booking ID, car, city or address…" /></div>
      </div>
      <DataTable columns={cols} rows={rows} loading={loading} onRowClick={(b) => setView(b.id)} resetKey={tab + q + flt.key}
        empty={<><ClipboardCheck size={30} /><b>No assignments</b><span className="muted">New inspections assigned to you will appear here.</span></>} />
      <BookingModal bookingId={view} onClose={() => setView(null)} footer={(b) => <Button icon={Play} onClick={() => nav(`/inspector/inspect/${b.id}`)}>{b.status === 'ongoing' ? 'Continue inspection' : 'Start inspection'}</Button>} />
    </div>
  );
}
