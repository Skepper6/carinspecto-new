import { useMemo, useState } from 'react';
import { Wallet, Receipt, Undo2, TrendingUp, Download } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { useDB } from '../../lib/db';
import { PageHeader, PayBadge, SearchInput, StatCard, Tabs, useLoading, FilterBar, useFilters, inRange } from '../../components/ui/kit';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import { downloadCSV, fmtDateTime, money } from '../../lib/format';

export default function Revenue() {
  const s = useDB((x) => x);
  const { toast } = useUI();
  const loading = useLoading(500);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const flt = useFilters();

  const base = useMemo(() => s.payments.map((p) => ({ ...p, customer: s.users.find((u) => u.id === p.customerId)?.name ?? '—', booking: s.bookings.find((b) => b.id === p.bookingId) })), [s]);
  const rows = base.filter((p) => tab === 'all' || p.status === tab).filter((p) => `${p.bookingId} ${p.customer} ${p.txnId} ${p.method}`.toLowerCase().includes(q.toLowerCase())).filter((p) => (!flt.f.method || p.method === flt.f.method) && inRange(p.at, flt.f)).sort((a, b) => b.at.localeCompare(a.at));

  const fdefs = [
    { key: 'method', label: 'All methods', options: [...new Set(base.map((p) => p.method))] },
    { key: 'from', label: 'From', type: 'date' }, { key: 'to', label: 'To', type: 'date' }
  ];
  const paid = base.filter((p) => p.status === 'paid');
  const gross = paid.reduce((a, p) => a + p.amount, 0);
  const vat = paid.reduce((a, p) => a + p.vat, 0);
  const refunds = base.filter((p) => p.status === 'refunded').reduce((a, p) => a + p.amount, 0);

  const cols = [
    { key: 'txnId', hide: 'md', label: 'Transaction', width: 150, render: (p) => <span className="mono">{p.txnId}</span> },
    { key: 'bookingId', label: 'Order', width: 100, render: (p) => <b className="mono">{p.bookingId}</b> },
    { key: 'customer', label: 'Customer' },
    { key: 'method', hide: 'md', label: 'Method', width: 170 },
    { key: 'at', hide: 'lg', label: 'Date', width: 150, render: (p) => fmtDateTime(p.at) },
    { key: 'vat', hide: 'md', label: 'VAT', width: 90, render: (p) => money(p.vat) },
    { key: 'amount', label: 'Amount', width: 110, render: (p) => <b>{money(p.amount)}</b> },
    { key: 'status', label: 'Status', width: 110, render: (p) => <PayBadge status={p.status} /> },
  ];

  return (
    <div className="page fill">
      <PageHeader title="Revenue & payments" subtitle="Every transaction, VAT collected and refunds."
        actions={<Button variant="outline" icon={Download} onClick={() => { downloadCSV('car-inspecto-payments.csv', rows.map((p) => ({ Transaction: p.txnId, Order: p.bookingId, Customer: p.customer, Method: p.method, Date: p.at, VAT: p.vat, Amount: p.amount, Status: p.status }))); toast.success('Payments exported.'); }}>Export CSV</Button>} />
      <div className="grid-4 compact">
        <StatCard icon={Wallet} label="Gross revenue" value={gross} format={money} tone="indigo" />
        <StatCard icon={Receipt} label="VAT collected" value={vat} format={money} tone="teal" />
        <StatCard icon={TrendingUp} label="Net of VAT" value={gross - vat} format={money} tone="green" />
        <StatCard icon={Undo2} label="Refunded" value={refunds} format={money} tone="orange" />
      </div>
      <div className="toolbar">
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'all', label: 'All', count: base.length }, { value: 'paid', label: 'Paid' }, { value: 'refunded', label: 'Refunded' }]} />
        <div className="filters"><FilterBar defs={fdefs} flt={flt} /><SearchInput value={q} onChange={setQ} placeholder="Search by transaction ID, order or customer…" /></div>
      </div>
      <DataTable columns={cols} rows={rows} loading={loading} resetKey={tab + q + flt.key} />
    </div>
  );
}
