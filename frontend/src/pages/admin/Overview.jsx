import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Users, ClipboardList, Hourglass, CheckCircle2, UserCog, ArrowRight, Sparkles, AlertTriangle } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDB, assignInspector, getState } from '../../lib/db';
import { useUI } from '../../context/UIContext';
import { Card, StatCard, StatusBadge, useLoading, Skeleton, Avatar, EmptyState, FilterBar, useFilters } from '../../components/ui/kit';
import Button from '../../components/ui/Button';
import BookingModal from '../../components/shared/BookingModal';
import AssignModal from '../../components/shared/AssignModal';
import { packagePerformance, salesTrend, suggestInspector } from '../../lib/stats';
import { addDays, carName, fmtDate, isoDate, money } from '../../lib/format';
import { CITIES } from '../../lib/constants';

export const ChartTip = ({ active, payload, label, money: isMoney }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <b>{label ?? payload[0].name}</b>
      {payload.map((p) => <div key={p.dataKey}><i style={{ background: p.color || p.payload?.color }} />{p.name}: <b>{isMoney && /revenue/i.test(p.name) ? money(p.value) : p.value.toLocaleString('en-GB')}</b></div>)}
    </div>
  );
};

export default function Overview() {
  const s = useDB((x) => x);
  const { toast } = useUI();
  const loading = useLoading();
  const flt = useFilters();
  const bookings = useMemo(() => {
    const from = flt.f.period ? isoDate(addDays(new Date(), -Number(flt.f.period))) : null;
    return s.bookings.filter((b) => (!flt.f.city || b.location.city === flt.f.city) && (!from || b.date >= from));
  }, [s.bookings, flt.key]); // eslint-disable-line
  const [view, setView] = useState(null);
  const [assign, setAssign] = useState(null);

  const k = useMemo(() => {
    const live = bookings.filter((b) => b.status !== 'cancelled');
    const revenue = live.filter((b) => b.payment.status === 'paid').reduce((a, b) => a + b.pricing.total, 0);
    const win = (from, to) => live.filter((b) => b.date > isoDate(addDays(new Date(), from)) && b.date <= isoDate(addDays(new Date(), to))).reduce((a, b) => a + b.pricing.total, 0);
    const last30 = win(-30, 0);
    const prev30 = win(-60, -30);
    return {
      revenue, trend: prev30 ? Math.round(((last30 - prev30) / prev30) * 100) : 0,
      customers: s.users.filter((u) => u.role === 'customer').length, orders: live.length,
      pending: bookings.filter((b) => ['pending', 'assigned', 'ongoing'].includes(b.status)).length,
      completed: bookings.filter((b) => b.status === 'completed').length,
      inspectors: s.users.filter((u) => u.role === 'inspector' && u.status === 'active').length,
    };
  }, [s, bookings]);

  const trend = useMemo(() => salesTrend(bookings, 6), [bookings]);
  const pkg = useMemo(() => packagePerformance(bookings, s.plans), [bookings, s.plans]);
  const unassigned = bookings.filter((b) => b.status === 'pending').sort((a, b) => a.date.localeCompare(b.date));
  const recent = [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  if (loading) return <div className="page"><Skeleton h={34} w={260} /><div className="grid-6 mt">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={92} r={16} />)}</div><Skeleton h={300} r={16} className="mt" /></div>;

  const autoAssign = (b) => {
    const i = suggestInspector(getState(), b);
    if (!i) return toast.error('No inspector is available right now.');
    assignInspector(b.id, i.id);
    toast.success(`${b.id} auto-assigned to ${i.name}.`);
  };

  return (
    <div className="page">
      <div className="hello"><div><h1>Operations overview</h1><p className="muted">Live snapshot of revenue, customers and inspections.</p></div></div>

      <div className="toolbar"><span /><FilterBar flt={flt} defs={[{ key: 'period', label: 'All time', options: [{ value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }, { value: '365', label: 'Last 12 months' }] }, { key: 'city', label: 'All emirates', options: CITIES }]} /></div>
      <div className="grid-6">
        <StatCard icon={Wallet} label="Total revenue" value={k.revenue} format={money} tone="indigo" hint="vs prior 30 days" trend={k.trend} />
        <StatCard icon={Users} label="Customers" value={k.customers} tone="teal" />
        <StatCard icon={ClipboardList} label="Total orders" value={k.orders} tone="violet" />
        <StatCard icon={Hourglass} label="Pending / active" value={k.pending} tone="orange" />
        <StatCard icon={CheckCircle2} label="Completed" value={k.completed} tone="green" />
        <StatCard icon={UserCog} label="Active inspectors" value={k.inspectors} tone="blue" />
      </div>

      <div className="grid-2-1 mt">
        <Card title="Revenue – last 6 months">
          <div className="chart">
            <ResponsiveContainer>
              <AreaChart data={trend} margin={{ left: 0, right: 8, top: 8 }}>
                <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a2a8c" stopOpacity={0.35} /><stop offset="1" stopColor="#3a2a8c" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip content={<ChartTip money />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3a2a8c" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Revenue by package">
          <div className="chart sm">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pkg} dataKey="revenue" nameKey="name" innerRadius="58%" outerRadius="86%" paddingAngle={3} stroke="none">
                  {pkg.map((p) => <Cell key={p.name} fill={p.color} />)}
                </Pie>
                <Tooltip content={<ChartTip money />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="legend">{pkg.map((p) => <li key={p.name}><i style={{ background: p.color }} />{p.name}<b>{money(p.revenue)}</b></li>)}</ul>
        </Card>
      </div>

      <div className="grid-2-1 mt">
        <Card title="Latest orders" action={<Link to="/admin/bookings" className="link-btn">All orders <ArrowRight size={14} /></Link>} pad={false}>
          <ul className="list">
            {recent.map((b) => (
              <li key={b.id} onClick={() => setView(b.id)}>
                <Avatar name={s.users.find((u) => u.id === b.customerId)?.name} size={36} />
                <div className="li-main"><b>{carName(b.car)}</b><span className="muted small">{b.id} · {s.users.find((u) => u.id === b.customerId)?.name} · {fmtDate(b.date)}</span></div>
                <b>{money(b.pricing.total)}</b><StatusBadge status={b.status} />
              </li>
            ))}
          </ul>
        </Card>
        <Card title={<>Needs assignment {unassigned.length > 0 && <span className="count-pill">{unassigned.length}</span>}</>}>
          {unassigned.length === 0 ? <EmptyState icon={CheckCircle2} title="All caught up" text="Every booking has an inspector." /> : (
            <ul className="mini-list">
              {unassigned.slice(0, 4).map((b) => (
                <li key={b.id}>
                  <div><b>{b.id} · {carName(b.car)}</b><span className="muted small">{fmtDate(b.date)} · {b.location.city}</span></div>
                  <div className="row-actions"><Button size="sm" variant="ghost" icon={Sparkles} onClick={() => autoAssign(b)}>Auto</Button><Button size="sm" variant="outline" onClick={() => setAssign(b)}>Assign</Button></div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <BookingModal bookingId={view} onClose={() => setView(null)} />
      <AssignModal booking={assign} onClose={() => setAssign(null)} />
    </div>
  );
}
