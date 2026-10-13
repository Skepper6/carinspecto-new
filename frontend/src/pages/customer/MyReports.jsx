import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useDB } from '../../lib/db';
import DownloadReportButton from '../../components/shared/DownloadReportButton';
import { PageHeader, SearchInput, useLoading, Badge, FilterBar, useFilters, inRange } from '../../components/ui/kit';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import ReportModal from '../../components/shared/ReportModal';
import { itemTotals, verdict } from '../../lib/inspectionSchema';
import { carName, fmtDate } from '../../lib/format';

export default function MyReports() {
  const { user } = useAuth();
  const { toast } = useUI();
  const state = useDB((s) => s);
  const loading = useLoading(500);
  const [q, setQ] = useState('');
  const flt = useFilters();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(() => params.get('report'));   // a shared link opens that report straight away

  const rows = useMemo(() => state.bookings
    .filter((b) => b.customerId === user.id && b.status === 'completed' && state.inspections[b.id]?.status === 'completed')
    .map((b) => {
      const plan = state.plans.find((p) => p.id === b.planId);
      const ins = state.inspections[b.id];
      return { ...b, plan, ins, score: itemTotals(plan, ins.data).score, inspector: state.users.find((u) => u.id === b.inspectorId) };
    })
    .filter((r) => `${r.id} ${carName(r.car)} ${r.car.reg}`.toLowerCase().includes(q.toLowerCase()))
    .filter((r) => (!flt.f.plan || r.planId === flt.f.plan) && (!flt.f.verdict || verdict(r.score).label === flt.f.verdict) && inRange(r.date, flt.f))
    .sort((a, b) => b.date.localeCompare(a.date)), [state, user.id, q, flt.key]); // eslint-disable-line

  const fdefs = [
    { key: 'plan', label: 'All plans', options: state.plans.map((p) => ({ value: p.id, label: p.name })) },
    { key: 'verdict', label: 'All scores', options: ['Excellent', 'Good', 'Fair', 'Poor'] },
    { key: 'from', label: 'From', type: 'date' }, { key: 'to', label: 'To', type: 'date' }
  ];

  const cols = [
    { key: 'id', label: 'Report', width: 115, render: (r) => <b className="mono">{r.id}</b> },
    { key: 'car', label: 'Vehicle', sortValue: (r) => carName(r.car), render: (r) => <div className="cell-2"><b>{carName(r.car)}</b><span className="muted small">{r.car.reg}</span></div> },
    { key: 'date', hide: 'lg', label: 'Inspected', width: 130, render: (r) => fmtDate(r.date) },
    { key: 'plan', hide: 'md', label: 'Plan', width: 110, sortValue: (r) => r.plan.name, render: (r) => r.plan.name },
    { key: 'score', hide: 'sm', label: 'Health score', width: 170, render: (r) => { const v = verdict(r.score); return <span className="score-cell"><b>{r.score}</b><Badge tone={v.tone}>{v.label}</Badge></span>; } },
    {
      key: 'a', label: '', sortable: false, width: 220, align: 'right',
      render: (r) => (
        <span className="row-actions">
          <Button size="sm" variant="ghost" icon={Eye} onClick={(e) => { e.stopPropagation(); setOpen(r.id); }}>View</Button>
          <DownloadReportButton bookingId={r.id} />
        </span>
      ),
    },
  ];

  return (
    <div className="page fill">
      <PageHeader title="Inspection reports" subtitle="View online or download the branded PDF." />
      <div className="toolbar"><span /><div className="filters"><FilterBar defs={fdefs} flt={flt} /><SearchInput value={q} onChange={setQ} placeholder="Search by report ID, car or plate…" /></div></div>
      <DataTable columns={cols} rows={rows} loading={loading} onRowClick={(r) => setOpen(r.id)} resetKey={q + flt.key}
        empty={<><FileText size={30} /><b>No reports yet</b><span className="muted">Reports appear here as soon as an inspection is completed.</span></>} />
      <ReportModal bookingId={open} onClose={() => { setOpen(null); if (params.has('report')) setParams({}, { replace: true }); }} />
    </div>
  );
}
