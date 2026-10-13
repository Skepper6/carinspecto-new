import { useMemo, useState } from 'react';
import { UserPlus, Ban, CheckCircle2, Trash2, UserCog, Star, Download } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { useDB, createUser, updateUser, removeUser, findUserByEmail } from '../../lib/db';
import { Avatar, Badge, Input, PageHeader, SearchInput, Select, Tabs, useLoading, FilterBar, useFilters, inRange, PhoneInput } from '../../components/ui/kit';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import { inspectorPerformance } from '../../lib/stats';
import { CITIES } from '../../lib/constants';
import { downloadCSV, fmtDate, isValidPhone } from '../../lib/format';

const EMPTY = { name: '', email: '', phone: '', city: '', specialization: '', pw: '' };

export default function Inspectors() {
  const s = useDB((x) => x);
  const { toast, confirm, guard } = useUI();
  const loading = useLoading(500);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const flt = useFilters();
  const [add, setAdd] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState({});
  const [open, setOpen] = useState(null);

  const base = useMemo(() => {
    const perf = inspectorPerformance(s);
    return s.users.filter((u) => u.role === 'inspector').map((u) => ({ ...u, ...perf.find((p) => p.id === u.id), status: u.status }));
  }, [s]);
  const rows = base.filter((u) => tab === 'all' || u.status === tab).filter((u) => `${u.name} ${u.email} ${u.city} ${u.specialization}`.toLowerCase().includes(q.toLowerCase()))
    .filter((u) => (!flt.f.city || u.city === flt.f.city) && (!flt.f.rating || u.rating >= Number(flt.f.rating)) && (!flt.f.avail || (flt.f.avail === 'yes' ? u.available !== false : u.available === false)) && inRange(u.joinedAt, flt.f))
    .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
  const fdefs = [
    { key: 'city', label: 'All emirates', options: CITIES },
    { key: 'rating', label: 'Any rating', options: [{ value: '4.5', label: '4.5+ stars' }, { value: '4', label: '4+ stars' }] },
    { key: 'avail', label: 'Any availability', options: [{ value: 'yes', label: 'Available' }, { value: 'no', label: 'Unavailable' }] },
    { key: 'from', label: 'Joined from', type: 'date' }, { key: 'to', label: 'Joined to', type: 'date' }
  ];
  const cur = base.find((u) => u.id === open);

  const create = async () => {
    const e = {};
    if (f.name.trim().length < 2) e.name = 'Enter a name';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email';
    else if (findUserByEmail(f.email)) e.email = 'This email is already in use';
    if (!f.city) e.city = 'Select a city';
    if (f.phone && !isValidPhone(f.phone)) e.phone = 'Enter a valid UAE number, e.g. +971 50 123 4567';
    if (f.pw.length < 8) e.pw = 'Min. 8 characters';
    setErr(e);
    if (Object.keys(e).length) return;
    if (!await guard(createUser({ ...f, name: f.name.trim() }), `${f.name.trim()} added as an inspector.`, 'Inspector created')) return;
    setAdd(false); setF(EMPTY);
  };
  const toggle = async (u) => {
    const suspend = u.status === 'active';
    if (suspend && !await confirm({ title: `Suspend ${u.name}?`, message: 'Suspended inspectors cannot sign in or receive new assignments.', confirmText: 'Suspend', danger: true })) return;
    await guard(updateUser(u.id, { status: suspend ? 'suspended' : 'active' }), suspend ? `${u.name} suspended.` : `${u.name} reactivated.`);
  };
  const remove = async (u) => {
    if (!await confirm({ title: `Remove ${u.name}?`, message: u.active ? `${u.active} open inspection(s) will go back to the unassigned queue.` : 'This permanently removes the inspector account.', confirmText: 'Remove inspector', danger: true })) return;
    if (await guard(removeUser(u.id), 'Inspector removed.')) setOpen(null);
  };

  const cols = [
    { key: 'name', label: 'Inspector', render: (u) => <span className="with-av"><Avatar name={u.name} size={34} /><span className="cell-2"><b>{u.name}</b><span className="muted small">{u.specialization || u.email}</span></span></span> },
    { key: 'city', hide: 'md', label: 'City', width: 130 },
    { key: 'active', hide: 'md', label: 'Active jobs', width: 140 },
    { key: 'completed', hide: 'lg', label: 'Completed', width: 150 },
    { key: 'rating', hide: 'lg', label: 'Rating', width: 120, render: (u) => <span className="rate"><Star size={14} fill="currentColor" /> {u.rating}</span> },
    { key: 'status', label: 'Status', width: 140, render: (u) => <Badge tone={u.status === 'active' ? 'green' : 'red'} dot>{u.status}</Badge> },
  ];

  const actions = (
    <>
      <Button variant="outline" icon={Download} onClick={() => { downloadCSV('car-inspecto-inspectors.csv', rows.map((u) => ({ Name: u.name, Email: u.email, City: u.city, Completed: u.completed, Active: u.active, Rating: u.rating, Status: u.status }))); toast.success('Inspectors exported.'); }}>Export</Button>
      <Button icon={UserPlus} onClick={() => setAdd(true)}>Add inspector</Button>
    </>
  );

  return (
    <div className="page fill">
      <PageHeader title="Inspectors" subtitle="Add, suspend or remove inspectors and track their performance." actions={actions} />
      <div className="toolbar">
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'all', label: 'All', count: base.length }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]} />
        <div className="filters"><FilterBar defs={fdefs} flt={flt} /><SearchInput value={q} onChange={setQ} placeholder="Search by name, email, city or specialisation…" /></div>
      </div>
      <DataTable columns={cols} rows={rows} loading={loading} onRowClick={(u) => setOpen(u.id)} resetKey={tab + q + flt.key} empty={<><UserCog size={30} /><b>No inspectors found</b></>} />

      <Modal open={add} onClose={() => setAdd(false)} title="Add inspector" subtitle="They can sign in from the Inspector tab with these credentials."
        footer={<><Button variant="ghost" onClick={() => setAdd(false)}>Cancel</Button><Button icon={UserPlus} onClick={create}>Create inspector</Button></>}>
        <div className="form-grid">
          <Input label="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={err.name} />
          <Input label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={err.email} />
          <PhoneInput label="Phone" value={f.phone} onChange={(v) => { setF({ ...f, phone: v }); setErr({ ...err, phone: undefined }); }} error={err.phone} />
          <Select label="Base city" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} options={CITIES} placeholder="Select" error={err.city} />
          <Input label="Specialisation" value={f.specialization} onChange={(e) => setF({ ...f, specialization: e.target.value })} placeholder="e.g. Luxury & EV" />
          <Input label="Temporary password" type="text" value={f.pw} onChange={(e) => setF({ ...f, pw: e.target.value })} error={err.pw} />
        </div>
      </Modal>

      <Modal open={!!cur} onClose={() => setOpen(null)} size="sm" title={cur?.name} subtitle={cur?.email}
        footer={cur && <><Button variant="danger-ghost" icon={Trash2} onClick={() => remove(cur)}>Remove</Button><Button variant={cur.status === 'active' ? 'outline' : 'primary'} icon={cur.status === 'active' ? Ban : CheckCircle2} onClick={() => toggle(cur)}>{cur.status === 'active' ? 'Suspend' : 'Reactivate'}</Button></>}>
        {cur && <dl className="kv"><div><dt>City</dt><dd>{cur.city}</dd></div><div><dt>Phone</dt><dd>{cur.phone || '—'}</dd></div><div><dt>Completed</dt><dd>{cur.completed}</dd></div><div><dt>Active now</dt><dd>{cur.active}</dd></div><div><dt>Joined</dt><dd>{fmtDate(cur.joinedAt)}</dd></div></dl>}
      </Modal>
    </div>
  );
}
