import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Eye, History as HistoryIcon, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDB } from '../../lib/db';
import { PageHeader, SearchInput, useLoading, Badge, FilterBar, useFilters, inRange } from '../../components/ui/kit';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import ReportModal from '../../components/shared/ReportModal';
import DownloadReportButton from '../../components/shared/DownloadReportButton';
import { itemTotals, verdict } from '../../lib/inspectionSchema';
import { carName, fmtDate } from '../../lib/format';

export default function History() {
  const { user } = useAuth();
  const nav = useNavigate();
  const s = useDB((x) => x);
  const loading = useLoading(500);
  const [q, setQ] = useState('');
  const flt = useFilters();
  const [open, setOpen] = useState(null);

  const rows = useMemo(() => s.bookings
    .filter((b) => b.inspectorId === user.id && b.status === 'completed' && s.inspections[b.id])
    .map((b) => { const plan = s.plans.find((p) => p.id === b.planId); return { ...b, plan, score: itemTotals(plan, s.inspections[b.id].data).score, customer: s.users.find((u) => u.id === b.customerId) }; })
    .filter((r) => `${r.id} ${carName(r.car)} ${r.customer?.name} ${r.car.reg}`.toLowerCase().includes(q.toLowerCase()))
    .filter((r) => (!flt.f.plan || r.planId === flt.f.plan) && (!flt.f.verdict || verdict(r.score).label === flt.f.verdict) && (!flt.f.rating || (r.rating ?? 0) >= Number(flt.f.rating)) && inRange(r.date, flt.f))
    .sort((a, b) => b.date.localeCompare(a.date)), [s, user.id, q, flt.key]); // eslint-disable-line

  const fdefs = [
    { key: 'plan', label: 'All plans', options: s.plans.map((p) => ({ value: p.id, label: p.name })) },
    { key: 'verdict', label: 'All scores', options: ['Excellent', 'Good', 'Fair', 'Poor'] },
    { key: 'rating', label: 'Any rating', options: [{ value: '5', label: '5 stars' }, { value: '4', label: '4+ stars' }, { value: '3', label: '3+ stars' }] },
    { key: 'from', label: 'From', type: 'date' }, { key: 'to', label: 'To', type: 'date' }
  ];
  const cols = [
    { key: 'id', label: 'Booking ID', width: 135, render: (r) => <b className="mono">{r.id}</b> },
    { key: 'car', label: 'Vehicle', phoneMinWidth: 200, sortValue: (r) => carName(r.car), render: (r) => <div className="cell-2"><b>{carName(r.car)}</b><span className="muted small">{r.car.reg}</span></div> },
    { key: 'cust', hide: 'md', label: 'Customer', width: 160, sortValue: (r) => r.customer?.name, render: (r) => r.customer?.name },
    { key: 'date', hide: 'lg', label: 'Date', width: 120, render: (r) => fmtDate(r.date) },
    { key: 'score', hide: 'sm', label: 'Score', width: 160, render: (r) => { const v = verdict(r.score); return <span className="score-cell"><b>{r.score}</b><Badge tone={v.tone}>{v.label}</Badge></span>; } },
    { key: 'rating', hide: 'lg', label: 'Rating', width: 90, sortValue: (r) => r.rating ?? 0, render: (r) => (r.rating ? <span className="rate"><Star size={14} fill="currentColor" /> {r.rating}</span> : <span className="muted">—</span>) },
    {
      key: 'a', label: '', width: 210, align: 'right', sortable: false,
      render: (r) => (
        <span className="row-actions">
          <Button size="sm" variant="ghost" icon={Eye} onClick={(e) => { e.stopPropagation(); setOpen(r.id); }}>View</Button>
          <Button size="sm" variant="outline" icon={Pencil} onClick={(e) => { e.stopPropagation(); nav(`/inspector/inspect/${r.id}`); }}>Edit</Button>
          <DownloadReportButton bookingId={r.id} />
        </span>
      ),
    },
  ];

  return (
    <div className="page fill">
      <PageHeader title="Inspection history" subtitle="Completed inspections – open one to edit and re-save the record." />
      <div className="toolbar"><span /><div className="filters"><FilterBar defs={fdefs} flt={flt} /><SearchInput value={q} onChange={setQ} placeholder="Search by booking ID, car, plate or customer…" /></div></div>
      <DataTable columns={cols} rows={rows} loading={loading} onRowClick={(r) => setOpen(r.id)} resetKey={q + flt.key}
        empty={<><HistoryIcon size={30} /><b>No completed inspections yet</b><span className="muted">Finished inspections will be listed here.</span></>} />
      <ReportModal bookingId={open} onClose={() => setOpen(null)} />
    </div>
  );
}
