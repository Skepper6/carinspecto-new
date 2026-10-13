import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardCheck, CheckCircle2, CalendarDays, Star, Play, MapPin, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useDB, updateUser } from '../../lib/db';
import { Card, EmptyState, StatCard, StatusBadge, useLoading, Skeleton } from '../../components/ui/kit';
import Button from '../../components/ui/Button';
import { addDays, carName, fmtDate, fmtTime, isoDate } from '../../lib/format';

export default function Dashboard() {
  const { user } = useAuth();
  const { guard } = useUI();
  const nav = useNavigate();
  const me = useDB((s) => s.users.find((u) => u.id === user.id));
  const mine = useDB((s) => s.bookings.filter((b) => b.inspectorId === user.id));
  const plans = useDB((s) => s.plans);
  const loading = useLoading();
  const today = isoDate();

  const queue = mine.filter((b) => ['assigned', 'ongoing'].includes(b.status)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const [schedStatus, setSchedStatus] = useState('');
  const todays = queue.filter((b) => b.date <= today).filter((b) => !schedStatus || b.status === schedStatus);
  const done = mine.filter((b) => b.status === 'completed');
  const month = done.filter((b) => b.date.slice(0, 7) === today.slice(0, 7));
  const week = Array.from({ length: 7 }, (_, i) => { const d = isoDate(addDays(new Date(), i)); return { d, n: queue.filter((b) => b.date === d).length }; });
  const weekTotal = week.reduce((s, w) => s + w.n, 0);
  const weekMax = Math.max(4, ...week.map((w) => w.n));   // the scale grows once a day has more than 4

  if (loading) return <div className="page"><Skeleton h={34} w={260} /><div className="grid-4 mt"><Skeleton h={92} r={16} /><Skeleton h={92} r={16} /><Skeleton h={92} r={16} /><Skeleton h={92} r={16} /></div><Skeleton h={260} r={16} className="mt" /></div>;

  const toggle = () => guard(updateUser(me.id, { available: !me.available }), me.available ? 'You are now unavailable for new assignments.' : 'You are available for new assignments.');

  return (
    <div className="page">
      <div className="hello">
        <div><h1>Hello, {user.name.split(' ')[0]} 🛠️</h1><p className="muted">{todays.length ? `You have ${todays.length} inspection${todays.length > 1 ? 's' : ''} to work on today.` : 'No inspections due today – enjoy the breather.'}</p></div>
        <label className="switch"><input type="checkbox" checked={!!me.available} onChange={toggle} /><i /><span>{me.available ? 'Available' : 'Unavailable'}</span></label>
      </div>

      <div className="grid-4">
        <StatCard icon={ClipboardCheck} label="In my queue" value={queue.length} tone="indigo" />
        <StatCard icon={CalendarDays} label="Due today" value={todays.length} tone="orange" />
        <StatCard icon={CheckCircle2} label="Completed this month" value={month.length} tone="teal" />
        <StatCard icon={Star} label="Average rating" value={me.rating ?? 0} format={(n) => n.toFixed(1)} tone="violet" />
      </div>

      <div className="grid-2-1 mt">
        <Card title="Today's schedule" action={<div className="row-actions"><select className="input sm" aria-label="Filter by status" value={schedStatus} onChange={(e) => setSchedStatus(e.target.value)}><option value="">All statuses</option><option value="assigned">Not started</option><option value="ongoing">In progress</option></select><Link to="/inspector/assignments" className="link-btn">All assignments <ArrowRight size={14} /></Link></div>} pad={false}>
          {todays.length === 0 ? <EmptyState icon={CalendarDays} title="Nothing scheduled today" text="Check upcoming assignments for what is next." /> : (
            <ul className="list">
              {todays.slice(0, 5).map((b) => (
                <li key={b.id} onClick={() => nav(`/inspector/inspect/${b.id}`)}>
                  <span className="li-time"><b>{fmtTime(b.time)}</b><em>{b.date < today ? 'Overdue' : 'Today'}</em></span>
                  <div className="li-main"><b>{carName(b.car)}</b><span className="muted small"><MapPin size={12} /> {b.location.address}, {b.location.city} · {plans.find((p) => p.id === b.planId)?.name}</span></div>
                  <StatusBadge status={b.status} />
                  <Button size="sm" icon={Play}>{b.status === 'ongoing' ? 'Continue' : 'Start'}</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Next 7 days">
          <div className="wk-head"><b>{weekTotal}</b><span>inspection{weekTotal === 1 ? '' : 's'} in the next 7 days</span></div>
          <div className="wk-chart" role="img" aria-label={`Inspections per day: ${week.map((w) => `${fmtDate(w.d, { weekday: 'long' })} ${w.n}`).join(', ')}`}>
            {week.map((w, i) => (
              <div key={w.d} className={`wk-col ${i === 0 ? 'today' : ''} ${w.n ? 'has' : ''}`}>
                <div className="wk-plot">
                  <em>{w.n}</em>
                  <i style={{ height: `${w.n ? Math.max(14, (w.n / weekMax) * 82) : 0}%` }} />
                </div>
                <span>{fmtDate(w.d, { weekday: 'short' })}</span><b>{fmtDate(w.d, { day: 'numeric' })}</b>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
