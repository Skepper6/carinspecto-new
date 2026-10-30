import { useState } from 'react';
import { Save, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useDB, updateUser } from '../../lib/db';
import { ratingOf } from '../../lib/stats';
import { Avatar, Card, Input, PageHeader, Select, Stars, PhoneInput } from '../../components/ui/kit';
import Button from '../../components/ui/Button';
import ChangePasswordCard from '../../components/shared/ChangePasswordCard';
import { CITIES } from '../../lib/constants';
import { fmtDate, isValidPhone, PHONE_ERROR } from '../../lib/format';

export default function Profile() {
  const { user } = useAuth();
  const { guard } = useUI();
  const me = useDB((s) => s.users.find((u) => u.id === user.id));
  const mine = useDB((s) => ratingOf(s.bookings, user.id));
  const done = useDB((s) => s.bookings.filter((b) => b.inspectorId === user.id && b.status === 'completed').length);
  const [f, setF] = useState({ name: me.name, phone: me.phone ?? '', city: me.city ?? '', specialization: me.specialization ?? '' });
  const [err, setErr] = useState({});

  const save = async () => {
    const e = {};
    if (f.name.trim().length < 2) e.name = 'Enter your name';
    if (f.phone && !isValidPhone(f.phone)) e.phone = PHONE_ERROR;
    setErr(e);
    if (Object.keys(e).length) return;
    await guard(updateUser(me.id, f), 'Profile updated.');
  };

  return (
    <div className="page">
      <PageHeader title="My profile" subtitle="Your details are visible to the admin team and customers." />
      <div className="grid-2-1">
        <Card title="Details">
          <div className="profile-head"><Avatar name={me.name} size={64} /><div><b>{me.name}</b><p className="muted small">Inspector since {fmtDate(me.joinedAt)}</p></div></div>
          <div className="form-grid">
            <Input label="Full name" value={f.name} onChange={(e) => { setF({ ...f, name: e.target.value }); setErr({ ...err, name: undefined }); }} error={err.name} />
            <PhoneInput label="Phone" value={f.phone} onChange={(v) => { setF({ ...f, phone: v }); setErr({ ...err, phone: undefined }); }} error={err.phone} />
            <Select label="Base city" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} options={CITIES} />
            <Input label="Specialisation" value={f.specialization} onChange={(e) => setF({ ...f, specialization: e.target.value })} />
            <Input className="span-2" label="Email" value={me.email} disabled />
          </div>
          <Button icon={Save} onClick={save}>Save changes</Button>
        </Card>
        <Card title="Performance">
          <div className="perf">
            <div><b>{done}</b><span>Inspections done</span></div>
            <div><b>{mine.rating?.toFixed(1) ?? '—'}</b><span>Average rating{mine.reviews ? ` · ${mine.reviews} review${mine.reviews > 1 ? 's' : ''}` : ''}</span></div>
          </div>
          <Stars value={Math.round(mine.rating ?? 0)} size={22} />
          <p className="muted small mt-s">Ratings come from customers after each completed inspection. The number is the average of all of them.</p>
        </Card>
      </div>
      <div className="mt"><ChangePasswordCard /></div>
    </div>
  );
}
