import { useState } from 'react';
import { MapPin, CreditCard, Plus, Trash2, Star, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useDB, updateUser } from '../../lib/db';
import { Avatar, Card, EmptyState, Input, PageHeader, Select, Badge, PhoneInput } from '../../components/ui/kit';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import AddressFields, { EMPTY_ADDRESS, formatAddress, validateAddress, withLabel } from '../../components/shared/AddressFields';
import ChangePasswordCard from '../../components/shared/ChangePasswordCard';
import { resendVerification } from '../../services/auth';
import { CITIES } from '../../lib/constants';
import { fmtDate, uid, isValidPhone } from '../../lib/format';

export default function Profile() {
  const { user } = useAuth();
  const { confirm, guard } = useUI();
  const me = useDB((s) => s.users.find((u) => u.id === user.id));
  const [f, setF] = useState({ name: me.name, phone: me.phone ?? '' });
  const [errs, setErrs] = useState({});
  const [addrModal, setAddrModal] = useState(false);
  const [a, setA] = useState({ ...EMPTY_ADDRESS });
  const [cardModal, setCardModal] = useState(false);
  const [c, setC] = useState({ number: '', exp: '', brand: 'Visa' });
  const [ae, setAe] = useState({});
  const [ce, setCe] = useState({});

  const resend = () => guard(resendVerification(), 'Verification email sent. Check your inbox.');
  const saveProfile = async () => {
    const e = {};
    if (f.name.trim().length < 2) e.name = 'Enter your name';
    if (f.phone && !isValidPhone(f.phone)) e.phone = 'Enter a valid UAE number, e.g. +971 50 123 4567';
    setErrs(e);
    if (Object.keys(e).length) return;
    await guard(updateUser(me.id, { name: f.name.trim(), phone: f.phone }), 'Profile updated.');
  };

  const addAddress = async () => {
    const e = validateAddress(a, { phone: false });
    setAe(e);
    if (Object.keys(e).length) return;
    const list = [...(me.addresses ?? []), { id: uid('a'), ...withLabel(a), line: formatAddress(a), address: formatAddress(a), isDefault: !(me.addresses?.length) }];
    if (!await guard(updateUser(me.id, { addresses: list }), 'Address saved.')) return;
    setAddrModal(false); setA({ ...EMPTY_ADDRESS });
  };
  const addCard = async () => {
    const digits = c.number.replace(/\s/g, '');
    const e = {};
    if (!/^\d{16}$/.test(digits)) e.number = 'Enter a 16-digit card number';
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(c.exp)) e.exp = 'Use MM/YY';
    setCe(e);
    if (Object.keys(e).length) return;
    if (!await guard(updateUser(me.id, { paymentMethods: [...(me.paymentMethods ?? []), { id: uid('p'), type: 'card', brand: c.brand, last4: digits.slice(-4), exp: c.exp, isDefault: !(me.paymentMethods?.length) }] }), 'Payment method added.')) return;
    setCardModal(false); setC({ number: '', exp: '', brand: 'Visa' });
  };

  const remove = async (kind, item) => {
    const ok = await confirm({ title: `Remove this ${kind === 'addresses' ? 'address' : 'card'}?`, message: 'This cannot be undone.', confirmText: 'Remove', danger: true });
    if (!ok) return;
    await guard(updateUser(me.id, { [kind]: me[kind].filter((x) => x.id !== item.id) }), 'Removed.');
  };
  const makeDefault = (kind, item) => guard(updateUser(me.id, { [kind]: me[kind].map((x) => ({ ...x, isDefault: x.id === item.id })) }), 'Default updated.');

  return (
    <div className="page">
      <PageHeader title="Profile" subtitle="Manage your personal details, addresses and payment methods." />
      <div className="grid-2-1">
        <Card title="Personal details">
          <div className="profile-head"><Avatar name={me.name} size={64} /><div><b>{me.name}</b><p className="muted small">Member since {fmtDate(me.joinedAt)}</p></div></div>
          <div className="form-grid">
            <Input label="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errs.name} />
            <PhoneInput label="Phone" value={f.phone} onChange={(v) => { setF({ ...f, phone: v }); setErrs({ ...errs, phone: undefined }); }} error={errs.phone} />
            <Input className="span-2" label="Email" value={me.email} disabled hint="Email is linked to your sign-in and cannot be changed here." />
          </div>
          <div className="verify-row">
            {me.emailVerified
              ? <Badge tone="green" dot>Email verified</Badge>
              : <><Badge tone="amber" dot>Email not verified</Badge><button type="button" className="link-btn" onClick={resend}>Resend verification email</button></>}
          </div>
          <Button icon={Save} onClick={saveProfile}>Save changes</Button>
        </Card>

        <Card title="Payment methods" action={<Button size="sm" variant="outline" icon={Plus} onClick={() => setCardModal(true)}>Add</Button>}>
          {me.paymentMethods?.length ? me.paymentMethods.map((p) => (
            <div key={p.id} className="item-row">
              <span className="li-icon"><CreditCard size={18} /></span>
              <div className="li-main"><b>{p.brand} •••• {p.last4}</b><span className="muted small">Expires {p.exp}</span></div>
              {p.isDefault ? <Badge tone="green">Default</Badge> : <button className="link-btn" onClick={() => makeDefault('paymentMethods', p)}>Make default</button>}
              <button className="icon-btn sm danger" onClick={() => remove('paymentMethods', p)} aria-label="Remove"><Trash2 size={15} /></button>
            </div>
          )) : <EmptyState icon={CreditCard} title="No saved cards" text="Add a card for faster checkout." />}
        </Card>
      </div>

      <div className="mt"><ChangePasswordCard /></div>

      <Card title="Saved addresses" className="mt" action={<Button size="sm" variant="outline" icon={Plus} onClick={() => setAddrModal(true)}>Add address</Button>}>
        {me.addresses?.length ? (
          <div className="grid-3">
            {me.addresses.map((x) => (
              <div key={x.id} className="addr">
                <div className="row-between"><b><MapPin size={15} /> {x.label}</b>{x.isDefault && <Badge tone="green">Default</Badge>}</div>
                <p>{formatAddress(x)}, {x.city}{x.landmark ? <><br /><span className="muted small">Landmark: {x.landmark}</span></> : null}</p>
                <div className="row-between">
                  {!x.isDefault ? <button className="link-btn" onClick={() => makeDefault('addresses', x)}>Make default</button> : <span />}
                  <button className="icon-btn sm danger" onClick={() => remove('addresses', x)} aria-label="Remove"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={MapPin} title="No addresses saved" text="Save your home or office to book faster." />}
      </Card>

      <Modal open={addrModal} onClose={() => setAddrModal(false)} title="Add address" subtitle="Each part is a separate field so inspectors can find you easily." footer={<><Button variant="ghost" onClick={() => setAddrModal(false)}>Cancel</Button><Button onClick={addAddress}>Save address</Button></>}>
        <AddressFields value={a} onChange={(v) => { setA(v); setAe({}); }} errors={ae} showPhone={false} />
      </Modal>
      <Modal open={cardModal} onClose={() => setCardModal(false)} title="Add card" footer={<><Button variant="ghost" onClick={() => setCardModal(false)}>Cancel</Button><Button onClick={addCard}>Save card</Button></>}>
        <div className="form-grid">
          <Select label="Network" value={c.brand} onChange={(e) => setC({ ...c, brand: e.target.value })} options={['Visa', 'Mastercard', 'Amex']} />
          <Input label="Expiry" value={c.exp} onChange={(e) => setC({ ...c, exp: e.target.value })} placeholder="MM/YY" error={ce.exp} />
          <Input className="span-2" label="Card number" value={c.number} onChange={(e) => setC({ ...c, number: e.target.value })} placeholder="1234 5678 9012 3456" error={ce.number} inputMode="numeric" />
        </div>
        <p className="muted small mt-s">Demo only – card details are never sent anywhere. Only the last 4 digits are stored.</p>
      </Modal>
    </div>
  );
}
