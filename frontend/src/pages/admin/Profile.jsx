import { useState } from 'react';
import { Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useDB, updateUser } from '../../lib/db';
import { Avatar, Card, Input, PageHeader, PhoneInput } from '../../components/ui/kit';
import Button from '../../components/ui/Button';
import ChangePasswordCard from '../../components/shared/ChangePasswordCard';
import { fmtDate, isValidPhone } from '../../lib/format';

export default function Profile() {
  const { user } = useAuth();
  const { guard } = useUI();
  const me = useDB((s) => s.users.find((u) => u.id === user.id));
  const [f, setF] = useState({ name: me.name, phone: me.phone ?? '' });
  const [err, setErr] = useState({});

  const save = async () => {
    const e = {};
    if (f.name.trim().length < 2) e.name = 'Enter your name';
    if (f.phone && !isValidPhone(f.phone)) e.phone = 'Enter a valid UAE number, e.g. +971 50 123 4567';
    setErr(e);
    if (Object.keys(e).length) return;
    await guard(updateUser(me.id, { name: f.name.trim(), phone: f.phone }), 'Profile updated.');
  };

  return (
    <div className="page">
      <PageHeader title="My profile" subtitle="Your administrator account details and password." />
      <div className="grid-2-1">
        <Card title="Details">
          <div className="profile-head"><Avatar name={me.name} size={64} /><div><b>{me.name}</b><p className="muted small">Administrator since {fmtDate(me.joinedAt)}</p></div></div>
          <div className="form-grid">
            <Input label="Full name" value={f.name} onChange={(e) => { setF({ ...f, name: e.target.value }); setErr({ ...err, name: undefined }); }} error={err.name} />
            <PhoneInput label="Phone" value={f.phone} onChange={(v) => { setF({ ...f, phone: v }); setErr({ ...err, phone: undefined }); }} error={err.phone} />
            <Input className="span-2" label="Email" value={me.email} disabled hint="Your email is your sign-in and cannot be changed here." />
          </div>
          <Button icon={Save} onClick={save}>Save changes</Button>
        </Card>
        <ChangePasswordCard />
      </div>
    </div>
  );
}
