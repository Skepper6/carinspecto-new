import { useMemo, useState } from 'react';
import { Download, Ban, CheckCircle2, Users, Trash2 } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { useDB, updateUser, removeUser } from '../../lib/db';
import { Avatar, Badge, PageHeader, SearchInput, StatusBadge, Tabs, useLoading, FilterBar, useFilters, inRange } from '../../components/ui/kit';
import { CITIES } from '../../lib/constants';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import { carName, downloadCSV, fmtDate, money } from '../../lib/format';

export default function Customers() {
  const s = useDB((x) => x);
  const { toast, confirm, guard } = useUI();
  const loading = useLoading(500);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const flt = useFilters();
  const [open, setOpen] = useState(null);

  const base = useMemo(() => s.users.filter((u) => u.role === 'customer').map((u) => {
    const bs = s.bookings.filter((b) => b.customerId === u.id);
    return { ...u, orders: bs.length, spent: bs.filter((b) => b.payment.status === 'paid').reduce((a, b) => a + b.pricing.total, 0), bs };
  }), [s]);
  const rows = useMemo(() => base.filter((u) => tab === 'all' || u.status === tab)
    .filter((u) => `${u.name} ${u.email} ${u.phone} ${u.city}`.toLowerCase().includes(q.toLowerCase()))
    .filter((u) => (!flt.f.city || u.city === flt.f.city) && (!flt.f.bookings || (flt.f.bookings === 'with' ? u.orders > 0 : u.orders === 0)) && inRange(u.joinedAt, flt.f))
    .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt)), [base, tab, q, flt.key]); // eslint-disable-line
  const fdefs = [
    { key: 'city', label: 'All emirates', options: CITIES },
    { key: 'bookings', label: 'All customers', options: [{ value: 'with', label: 'With bookings' }, { value: 'none', label: 'No bookings yet' }] },
    { key: 'from', label: 'Joined from', type: 'date' }, { key: 'to', label: 'Joined to', type: 'date' }
  ];
  const cur = base.find((u) => u.id === open);

  const toggle = async (u) => {
    const suspend = u.status === 'active';
    if (suspend && !await confirm({ title: `Suspend ${u.name}?`, message: 'They will not be able to sign in or book until reactivated.', confirmText: 'Suspend', danger: true })) return;
    await guard(updateUser(u.id, { status: suspend ? 'suspended' : 'active' }), suspend ? `${u.name} suspended.` : `${u.name} reactivated.`);
  };
  const remove = async (u) => {
    if (!await confirm({ title: `Delete ${u.name}?`, message: 'The customer account is removed permanently. Their past bookings remain for your records.', confirmText: 'Delete customer', danger: true })) return;
    if (await guard(removeUser(u.id), 'Customer deleted.')) setOpen(null);
  };

  const cols = [
    { key: 'name', label: 'Customer', render: (u) => <span className="with-av"><Avatar name={u.name} size={34} /><span className="cell-2"><b>{u.name}</b><span className="muted small">{u.email}</span></span></span> },
    { key: 'phone', hide: 'lg', label: 'Phone', width: 150 },
    { key: 'city', hide: 'md', label: 'City', width: 110 },
    { key: 'orders', hide: 'md', label: 'Orders', width: 90 },
    { key: 'spent', hide: 'sm', label: 'Total spent', width: 120, render: (u) => money(u.spent) },
    { key: 'joinedAt', hide: 'md', label: 'Joined', width: 120, render: (u) => fmtDate(u.joinedAt) },
    { key: 'status', label: 'Status', width: 130, render: (u) => <Badge tone={u.status === 'active' ? 'green' : 'red'} dot>{u.status}</Badge> },
  ];

  return (
    <div className="page fill">
      <PageHeader title="Customers" subtitle="Everyone who has booked or signed up."
        actions={<Button variant="outline" icon={Download} onClick={() => { downloadCSV('car-inspecto-customers.csv', rows.map((u) => ({ Name: u.name, Email: u.email, Phone: u.phone, City: u.city, Orders: u.orders, Spent: u.spent, Joined: u.joinedAt.slice(0, 10), Status: u.status }))); toast.success('Customers exported.'); }}>Export CSV</Button>} />
      <div className="toolbar">
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'all', label: 'All', count: base.length }, { value: 'active', label: 'Active', count: base.filter((u) => u.status === 'active').length }, { value: 'suspended', label: 'Suspended', count: base.filter((u) => u.status === 'suspended').length }]} />
        <div className="filters"><FilterBar defs={fdefs} flt={flt} /><SearchInput value={q} onChange={setQ} placeholder="Search by name, email, phone or city…" /></div>
      </div>
      <DataTable columns={cols} rows={rows} loading={loading} onRowClick={(u) => setOpen(u.id)} resetKey={tab + q + flt.key}
        empty={<><Users size={30} /><b>No customers found</b></>} />

      <Modal open={!!cur} onClose={() => setOpen(null)} size="md" title={cur?.name} subtitle={cur?.email}
        footer={cur && <>
          <Button variant="danger-ghost" icon={Trash2} onClick={() => remove(cur)}>Delete</Button>
          <Button variant={cur.status === 'active' ? 'outline' : 'primary'} icon={cur.status === 'active' ? Ban : CheckCircle2} onClick={() => toggle(cur)}>{cur.status === 'active' ? 'Suspend' : 'Reactivate'}</Button>
        </>}>
        {cur && (
          <>
            <dl className="kv"><div><dt>Phone</dt><dd>{cur.phone || '—'}</dd></div><div><dt>City</dt><dd>{cur.city || '—'}</dd></div><div><dt>Orders</dt><dd>{cur.orders}</dd></div><div><dt>Spent</dt><dd>{money(cur.spent)}</dd></div></dl>
            <h4 className="mt mb">Booking history</h4>
            <ul className="mini-list scroll">
              {cur.bs.length === 0 && <li className="muted">No bookings yet.</li>}
              {cur.bs.slice(0, 20).map((b) => <li key={b.id}><div><b>{b.id} · {carName(b.car)}</b><span className="muted small">{fmtDate(b.date)}</span></div><StatusBadge status={b.status} /></li>)}
            </ul>
          </>
        )}
      </Modal>
    </div>
  );
}
