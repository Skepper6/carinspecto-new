import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Pie, PieChart } from 'recharts';
import { useDB } from '../../lib/db';
import { Card, PageHeader, useLoading, Skeleton, StatCard, FilterBar, useFilters, inRange } from '../../components/ui/kit';
import { ChartTip } from './Overview';
import { groupCount, inspectorPerformance, packagePerformance, periodRange, salesTrendRange } from '../../lib/stats';
import { Target, Timer, ThumbsUp, Percent } from 'lucide-react';
import { money } from '../../lib/format';
import { CITIES } from '../../lib/constants';

const PALETTE = ['#3a2a8c', '#f58220', '#2ea6a0', '#be185d', '#6d28d9', '#0e7490'];

// Name label for the inspector chart: the full name is shown, wrapped onto more lines when it is long (never cut off)
const NameTick = ({ x, y, payload }) => {
  const words = String(payload.value ?? '').split(' ');
  const lines = [];
  let cur = '';
  words.forEach((w) => {
    if (cur && (cur + ' ' + w).length > 12) { lines.push(cur); cur = w; }
    else cur = cur ? `${cur} ${w}` : w;
  });
  if (cur) lines.push(cur);
  const top = -((lines.length - 1) * 0.55);
  return (
    <text x={x} y={y} textAnchor="end" fill="#666" fontSize={12}>
      {lines.map((l, i) => <tspan key={i} x={x} dy={i === 0 ? `${top}em` : '1.1em'}>{l}</tspan>)}
    </text>
  );
};

export default function Analytics() {
  const s = useDB((x) => x);
  const loading = useLoading();
  // the period dropdown (3, 6 or 12 months, or custom dates) drives every number and chart on this page
  const [period, setPeriod] = useState('6m');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const rng = useMemo(() => periodRange(period, custom), [period, custom]);

  const flt = useFilters();
  const fb = useMemo(() => s.bookings.filter((b) => (!flt.f.city || b.location.city === flt.f.city) && (!flt.f.plan || b.planId === flt.f.plan) && inRange(b.date, rng)), [s.bookings, flt.key, rng]); // eslint-disable-line
  const live = fb.filter((b) => b.status !== 'cancelled');
  const trend = useMemo(() => salesTrendRange(fb, rng.from, rng.to), [fb, rng.from, rng.to]);
  const pkg = useMemo(() => packagePerformance(fb, s.plans), [fb, s.plans]);
  const insp = useMemo(() => inspectorPerformance(s).filter((p) => p.completed > 0), [s]);
  const cities = useMemo(() => groupCount(live, (b) => b.location.city), [live]);
  const makes = useMemo(() => groupCount(live, (b) => b.car.make).slice(0, 6), [live]);
  const purpose = useMemo(() => groupCount(live, (b) => b.purpose), [live]);

  const completed = fb.filter((b) => b.status === 'completed').length;
  const cancelled = fb.filter((b) => b.status === 'cancelled').length;
  const rated = fb.filter((b) => b.rating);
  const avgRating = rated.length ? rated.reduce((a, b) => a + b.rating, 0) / rated.length : 0;
  const aov = live.length ? live.reduce((a, b) => a + b.pricing.total, 0) / live.length : 0;

  if (loading) return <div className="page"><Skeleton h={34} w={240} /><div className="grid-4 mt">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={92} r={16} />)}</div><Skeleton h={320} r={16} className="mt" /></div>;

  return (
    <div className="page">
      <PageHeader title="Analytics" subtitle="Sales trends, package performance and inspection quality." />
      <div className="toolbar an-toolbar">
        <div className="an-row">
          <select className="input sm an-period" aria-label="Period" value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="3m">Last 3 months</option>
            <option value="6m">Last 6 months</option>
            <option value="12m">Last 12 months</option>
            <option value="custom">Custom dates</option>
          </select>
          {period === 'custom' && (
            <div className="an-dates">
              <label className="rev-date"><span>From</span><input type="date" className="input sm" aria-label="From date" value={custom.from} max={custom.to || undefined} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /></label>
              <label className="rev-date"><span>To</span><input type="date" className="input sm" aria-label="To date" value={custom.to} min={custom.from || undefined} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /></label>
            </div>
          )}
          <FilterBar flt={flt} defs={[{ key: 'city', label: 'All emirates', options: CITIES }, { key: 'plan', label: 'All plans', options: s.plans.map((p) => ({ value: p.id, label: p.name })) }]} />
        </div>
      </div>
      <div className="grid-4">
        <StatCard icon={Target} label="Completion rate" value={fb.length ? (completed / (completed + cancelled || 1)) * 100 : 0} format={(n) => `${n.toFixed(0)}%`} tone="indigo" />
        <StatCard icon={Percent} label="Avg. order value" value={aov} format={money} tone="orange" />
        <StatCard icon={ThumbsUp} label="Customer rating" value={avgRating} format={(n) => `${n.toFixed(1)} / 5`} tone="teal" />
        <StatCard icon={Timer} label="Cancelled" value={cancelled} tone="violet" />
      </div>

      <Card title="Sales trend – orders & revenue" className="mt">
        <div className="chart lg">
          <ResponsiveContainer>
            <ComposedChart data={trend}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis yAxisId="l" tickLine={false} axisLine={false} width={36} />
              <YAxis yAxisId="r" orientation="right" tickLine={false} axisLine={false} width={52} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip content={<ChartTip money />} />
              <Legend iconType="circle" />
              <Bar yAxisId="l" dataKey="orders" name="Orders" fill="#f58220" radius={[6, 6, 0, 0]} barSize={26} />
              <Line yAxisId="r" type="monotone" dataKey="revenue" name="Revenue" stroke="#3a2a8c" strokeWidth={2.5} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid-2 mt">
        <Card title="Package performance">
          <div className="chart">
            <ResponsiveContainer>
              <BarChart data={pkg}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={36} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="orders" name="Orders" radius={[8, 8, 0, 0]} barSize={46}>{pkg.map((p) => <Cell key={p.name} fill={p.color} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Inspector performance (completed inspections)">
          <div className="chart">
            <ResponsiveContainer>
              <BarChart data={insp} layout="vertical" margin={{ left: 0 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={100} tick={<NameTick />} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="completed" name="Inspections" fill="#2ea6a0" radius={[0, 6, 6, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid-3 mt">
        {[['Orders by city', cities], ['Top car makes', makes], ['Inspection reasons', purpose]].map(([title, data]) => (
          <Card key={title} title={title}>
            <div className="chart sm">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">{data.map((d, i) => <Cell key={d.name} fill={PALETTE[i % PALETTE.length]} />)}</Pie>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="legend">{data.map((d, i) => <li key={d.name}><i style={{ background: PALETTE[i % PALETTE.length] }} />{d.name}<b>{d.value}</b></li>)}</ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
