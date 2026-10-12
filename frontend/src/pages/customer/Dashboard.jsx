import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, ClipboardList, FileText, Hourglass, Check, Car, UserCheck, ScanSearch, ArrowRight, Sparkles, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDB } from '../../lib/db';
import { Card, StatCard, StatusBadge, useLoading, Skeleton, EmptyState, Stars } from '../../components/ui/kit';
import Button from '../../components/ui/Button';
import BookingModal from '../../components/shared/BookingModal';
import ReportModal from '../../components/shared/ReportModal';
import { carName, fmtDate, fmtTime, isoDate, money } from '../../lib/format';

const TRACK = [['Booked', Check], ['Inspector assigned', UserCheck], ['Inspecting', ScanSearch], ['Report ready', FileText]];
const stage = (s) => ({ pending: 0, assigned: 1, ongoing: 2, completed: 3 }[s] ?? 0);

export default function Dashboard() {
  const { user } = useAuth();
  const all = useDB((s) => s.bookings.filter((b) => b.customerId === user.id));
  const plans = useDB((s) => s.plans);
  const users = useDB((s) => s.users);
  const loading = useLoading();
  const [recentStatus, setRecentStatus] = useState('');
  const [view, setView] = useState(null);
  const [report, setReport] = useState(null);

  const active = all.filter((b) => ['pending', 'assigned', 'ongoing'].includes(b.status)).sort((a, b) => a.date.localeCompare(b.date));
  const done = all.filter((b) => b.status === 'completed');
  const byRecent = (a, c) => (c.date + c.time).localeCompare(a.date + a.time);
  const ongoing = active.filter((b) => b.status === 'ongoing').sort(byRecent);
  const upcoming = active.filter((b) => b.status !== 'ongoing' && b.date >= isoDate()).sort((a, c) => (a.date + a.time).localeCompare(c.date + c.time));
  // an inspection happening now comes first (most recent), then the soonest upcoming one
  const next = ongoing[0] ?? upcoming[0] ?? [...active].sort(byRecent)[0];
  const recent = [...all].filter((b) => !recentStatus || b.status === recentStatus).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  const hour = new Date().getHours();

  if (loading) return (
    <div className="page"><Skeleton h={34} w={280} /><div className="grid-4 mt"><Skeleton h={92} r={16} /><Skeleton h={92} r={16} /><Skeleton h={92} r={16} /><Skeleton h={92} r={16} /></div><Skeleton h={220} r={16} className="mt" /></div>
  );

  return (
    <div className="page">
      <div className="hello">
        <div>
          <h1>Good {hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'}, {user.name.split(' ')[0]} 👋</h1>
          <p className="muted">Here is what is happening with your inspections.</p>
        </div>
        <Link to="/app/book"><Button icon={CalendarPlus}>New booking</Button></Link>
      </div>

      <div className="grid-4">
        <StatCard icon={ClipboardList} label="Total bookings" value={all.length} tone="indigo" />
        <StatCard icon={Hourglass} label="In progress" value={active.length} tone="orange" />
        <StatCard icon={FileText} label="Reports ready" value={done.length} tone="teal" />
        <StatCard icon={Sparkles} label="Total spent" value={all.filter((b) => b.payment.status === 'paid').reduce((a, b) => a + b.pricing.total, 0)} format={(n) => money(n)} tone="violet" />
      </div>

      <div className="grid-2-1 mt">
        <Card title={next?.status === 'ongoing' ? 'Current inspection' : 'Next inspection'} action={next && <button className="link-btn" onClick={() => setView(next.id)}>Details <ArrowRight size={14} /></button>}>
          {next ? (
            <div className="next">
              <div className="next-head">
                <span className="next-icon"><Car size={24} /></span>
                <div>
                  <h4>{carName(next.car)}</h4>
                  <p className="muted small">{plans.find((p) => p.id === next.planId)?.name} · {fmtDate(next.date, { weekday: 'short', day: 'numeric', month: 'short' })} at {fmtTime(next.time)}</p>
                </div>
                <StatusBadge status={next.status} />
              </div>
              <ol className="track">
                {TRACK.map(([l, Icon], i) => (
                  <li key={l} className={i <= stage(next.status) ? 'done' : ''}><span><Icon size={16} /></span><em>{l}</em></li>
                ))}
                <li aria-hidden="true" className="track-fill" style={{ width: `${(stage(next.status) / 3) * 75}%` }} />
              </ol>
              <p className="next-note">
                {next.inspectorId ? <>Your inspector is <b>{users.find((u) => u.id === next.inspectorId)?.name}</b>.</> : 'We are matching you with the best available inspector.'}
              </p>
            </div>
          ) : (
            <EmptyState icon={CalendarPlus} title="No upcoming inspections" text="Book a certified inspection in under two minutes." action={<Link to="/app/book"><Button>Book now</Button></Link>} />
          )}
        </Card>

        <Card title="Why Car InspectO">
          <ul className="perk-list">
            <li><Check size={16} /> Certified multi-point checklist</li>
            <li><Check size={16} /> Photo-backed PDF report</li>
            <li><Check size={16} /> Free reschedule up to 4 hrs before</li>
          </ul>
        </Card>
      </div>

      <Card title="Recent bookings" className="mt" action={<div className="row-actions"><select className="input sm" aria-label="Filter by status" value={recentStatus} onChange={(e) => setRecentStatus(e.target.value)}><option value="">All statuses</option>{['pending', 'assigned', 'ongoing', 'completed', 'cancelled'].map((x) => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</option>)}</select><Link to="/app/bookings" className="link-btn">View all <ArrowRight size={14} /></Link></div>} pad={false}>
        {recent.length === 0 ? <EmptyState title="No bookings yet" text="Your bookings will show up here." /> : (
          <ul className="list">
            {recent.map((b) => (
              <li key={b.id} onClick={() => setView(b.id)}>
                <span className="li-icon"><Car size={18} /></span>
                <div className="li-main"><b>{carName(b.car)}</b><span className="muted small">{b.id} · {fmtDate(b.date)} · {plans.find((p) => p.id === b.planId)?.name}</span></div>
                <StatusBadge status={b.status} />
                {b.status === 'completed' && <Button size="sm" variant="outline" icon={FileText} onClick={(e) => { e.stopPropagation(); setReport(b.id); }}>Report</Button>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <BookingModal bookingId={view} onClose={() => setView(null)} />
      <ReportModal bookingId={report} onClose={() => setReport(null)} />
    </div>
  );
}
