import { useMemo, useState } from 'react';
import { Download, FileText, UserPlus, ClipboardList, XCircle } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { useDB, cancelBooking } from '../../lib/db';
import { Avatar, PageHeader, PayBadge, SearchInput, StatusBadge, Tabs, useLoading, FilterBar, useFilters, inRange } from '../../components/ui/kit';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import BookingModal from '../../components/shared/BookingModal';
import AssignModal from '../../components/shared/AssignModal';
import ReportModal from '../../components/shared/ReportModal';
import DownloadReportButton from '../../components/shared/DownloadReportButton';
import { CITIES } from '../../lib/constants';
import { carName, downloadCSV, fmtDate, fmtTime, money } from '../../lib/format';

export default function Bookings() {
  const s = useDB((x) => x);
  const { toast, confirm, guard } = useUI();
  const loading = useLoading(500);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const flt = useFilters();
  const [view, setView] = useState(null);
  const [assign, setAssign] = useState(null);
  const [report, setReport] = useState(null);

  const user = (id) => s.users.find((u) => u.id === id);
  const base = useMemo(() => s.bookings.map((b) => ({ ...b, customer: user(b.customerId), inspector: user(b.inspectorId), planName: s.plans.find((p) => p.id === b.planId)?.name })), [s]); // eslint-disable-line
  const rows = useMemo(() => base
    .filter((b) => tab === 'all' || b.status === tab)
    .filter((b) => (!flt.f.city || b.location.city === flt.f.city) && (!flt.f.plan || b.planId === flt.f.plan) && (!flt.f.inspector || b.inspectorId === flt.f.inspector) && (!flt.f.pay || b.payment.status === flt.f.pay) && inRange(b.date, flt.f))
    .filter((b) => `${b.id} ${carName(b.car)} ${b.customer?.name} ${b.inspector?.name ?? ''} ${b.car.reg}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [base, tab, q, flt.key]); // eslint-disable-line

  const fdefs = [
    { key: 'city', label: 'All emirates', options: CITIES },
    { key: 'plan', label: 'All plans', options: s.plans.map((p) => ({ value: p.id, label: p.name })) },
    { key: 'inspector', label: 'All inspectors', options: s.users.filter((u) => u.role === 'inspector').map((u) => ({ value: u.id, label: u.name })) },
    { key: 'pay', label: 'All payments', options: ['paid', 'pending', 'refunded'] },
    { key: 'from', label: 'From', type: 'date' }, { key: 'to', label: 'To', type: 'date' }
  ];
  const cancel = async (b) => {
    if (!await confirm({ title: 'Cancel this booking?', message: `${b.id} will be cancelled and the customer refunded ${money(b.pricing.total)}.`, confirmText: 'Cancel booking', cancelText: 'Keep', danger: true })) return;
    if (await guard(cancelBooking(b.id), b.payment.status === 'paid' ? 'Booking cancelled and refund initiated.' : 'Booking cancelled.')) setView(null);
  };
  const exportCSV = () => {
    downloadCSV('car-inspecto-orders.csv', rows.map((b) => ({ Booking: b.id, Customer: b.customer?.name, Vehicle: carName(b.car), Reg: b.car.reg, Plan: b.planName, City: b.location.city, Date: b.date, Time: b.time, Status: b.status, Inspector: b.inspector?.name ?? '', Total: b.pricing.total, Payment: b.payment.status })));
    toast.success(`Exported ${rows.length} orders.`);
  };
  const count = (st) => base.filter((b) => b.status === st).length;

  const cols = [
    { key: 'id', hide: 'sm', label: 'Order', width: '8%', render: (b) => <b className="mono">{b.id}</b> },
    { key: 'customer', hide: 'md', label: 'Customer', width: '14%', sortValue: (b) => b.customer?.name, render: (b) => <span className="with-av"><Avatar name={b.customer?.name} size={28} />{b.customer?.name}</span> },
    { key: 'car', label: 'Vehicle', width: '14%', sortValue: (b) => carName(b.car), render: (b) => <div className="cell-2"><b>{carName(b.car)}</b><span className="muted small">{b.planName}</span></div> },
    { key: 'date', hide: 'lg', label: 'Slot', width: '11%', render: (b) => <div className="cell-2"><b>{fmtDate(b.date)}</b><span className="muted small">{fmtTime(b.time)}</span></div> },
    { key: 'inspector', hide: 'md', label: 'Inspector', width: '13%', sortValue: (b) => b.inspector?.name ?? '', render: (b) => (b.inspector ? b.inspector.name : <Button size="sm" variant="outline" icon={UserPlus} onClick={(e) => { e.stopPropagation(); setAssign(b); }} disabled={['cancelled', 'completed'].includes(b.status)}>Assign</Button>) },
    { key: 'status', label: 'Status', width: '15%', render: (b) => <StatusBadge status={b.status} /> },
    { key: 'total', hide: 'sm', label: 'Total', width: '8%', sortValue: (b) => b.pricing.total, render: (b) => <b>{money(b.pricing.total)}</b> },
    { key: 'pay', hide: 'sm', label: 'Payment', width: '9%', sortValue: (b) => b.payment.status, render: (b) => <PayBadge status={b.payment.status} /> },
    {
      key: 'a', label: 'Report', width: '8%', sortable: false, align: 'right',
      render: (b) => b.status === 'completed' ? <DownloadReportButton bookingId={b.id} /> : null,
    },
  ];

  return (
    <div className="page fill">
      <PageHeader title="Orders & bookings" subtitle="Filter, assign inspectors and download reports." actions={<Button variant="outline" icon={Download} onClick={exportCSV}>Export CSV</Button>} />
      <div className="toolbar wrap-bar">
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'all', label: 'All', count: base.length }, { value: 'pending', label: 'Pending', count: count('pending') }, { value: 'assigned', label: 'Assigned', count: count('assigned') }, { value: 'ongoing', label: 'Ongoing', count: count('ongoing') }, { value: 'completed', label: 'Completed', count: count('completed') }, { value: 'cancelled', label: 'Cancelled', count: count('cancelled') }]} />
        <div className="filters"><FilterBar defs={fdefs} flt={flt} /><SearchInput value={q} onChange={setQ} placeholder="Search by order ID, customer, car, plate or inspector…" /></div>
      </div>
      <DataTable columns={cols} rows={rows} loading={loading} onRowClick={(b) => setView(b.id)} resetKey={tab + q + flt.key}
        empty={<><ClipboardList size={30} /><b>No orders match</b><span className="muted">Adjust the filters to see more.</span></>} />

      <BookingModal bookingId={view} onClose={() => setView(null)} footer={(b) => (
        <>
          {!['cancelled', 'completed'].includes(b.status) && <Button variant="danger-ghost" icon={XCircle} onClick={() => cancel(b)}>Cancel</Button>}
          {!['cancelled', 'completed'].includes(b.status) && <Button variant="outline" icon={UserPlus} onClick={() => setAssign(b)}>{b.inspectorId ? 'Reassign' : 'Assign inspector'}</Button>}
          {b.status === 'completed' && <Button icon={FileText} onClick={() => setReport(b.id)}>View report</Button>}
        </>
      )} />
      <AssignModal booking={assign} onClose={() => setAssign(null)} />
      <ReportModal bookingId={report} onClose={() => setReport(null)} />
    </div>
  );
}
