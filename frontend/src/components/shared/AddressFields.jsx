import { Crosshair } from 'lucide-react';
import { CITIES, ADDRESS_LABELS, REGION_LABEL } from '../../lib/constants';
import { Field, Input, Select, PhoneInput } from '../ui/kit';
import { isValidPhone, PHONE_ERROR } from '../../lib/format';
import Button from '../ui/Button';

// custom label typed under "Other" becomes the saved label
export const withLabel = (a) => ({ ...a, label: a.label === 'Other' && a.labelOther?.trim() ? a.labelOther.trim() : a.label });
export const EMPTY_ADDRESS = { label: 'Home', building: '', unit: '', street: '', area: '', landmark: '', city: '', phone: '', lat: null, lng: null };

export const formatAddress = (a) => [a.building, a.unit && `Unit ${a.unit}`, a.street, a.area].filter(Boolean).join(', ') || a.address || a.line || '';

export function validateAddress(a, { phone = true } = {}) {
  const e = {};
  if (!a.city) e.city = `Select a ${REGION_LABEL.toLowerCase()}`;
  if (!a.area || a.area.trim().length < 2) e.area = 'Enter the area / community';
  if (!a.street || a.street.trim().length < 2) e.street = 'Enter the street or road';
  if (!a.building || a.building.trim().length < 1) e.building = 'Enter the building / villa';
  if (phone && !isValidPhone(a.phone)) e.phone = PHONE_ERROR;
  return e;
}

// Zomato-style address form: every part is its own field.
export default function AddressFields({ value, onChange, errors = {}, onGps, locating, showPhone = true }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  const isOther = value.label === 'Other' || !ADDRESS_LABELS.includes(value.label);
  const otherText = value.labelOther ?? (ADDRESS_LABELS.includes(value.label) ? '' : value.label);
  return (
    <>
      <div className="form-grid">
        <Select label={REGION_LABEL} value={value.city} onChange={set('city')} options={CITIES} placeholder="Select" error={errors.city} />
        {onGps ? <Field label="Use my location"><Button type="button" variant="outline" icon={Crosshair} loading={locating} onClick={onGps}>Detect with GPS</Button></Field> : <span />}
        <Input label="Area / community" value={value.area} onChange={set('area')} placeholder="e.g. Dubai Marina" error={errors.area} />
        <Input label="Street / road" value={value.street} onChange={set('street')} placeholder="e.g. Al Wasl Road" error={errors.street} />
        <Input label="Building / villa name & number" value={value.building} onChange={set('building')} placeholder="e.g. Villa 12 or Marina Tower" error={errors.building} />
        <Input label="Floor / apartment (optional)" value={value.unit} onChange={set('unit')} placeholder="e.g. 14, Apt 1402" />
        <Input className="span-2" label="Landmark (optional)" value={value.landmark} onChange={set('landmark')} placeholder="e.g. Near Spinneys, opposite the mosque" />
        {showPhone && <PhoneInput className="span-2" label="Contact number for the visit" value={value.phone} onChange={(v) => onChange({ ...value, phone: v })} error={errors.phone} />}
      </div>
      <Field label="Save address as">
        <div className="chips tight">
          {ADDRESS_LABELS.map((l) => <button key={l} type="button" className={`chip ${(l === 'Other' ? isOther : value.label === l) ? 'on' : ''}`} onClick={() => onChange({ ...value, label: l, labelOther: l === 'Other' ? otherText : '' })}>{l}</button>)}
        </div>
        {isOther && <input className="input mt-s" autoFocus value={otherText} onChange={(e) => onChange({ ...value, label: 'Other', labelOther: e.target.value })} placeholder="Name this place, e.g. Gym, Parents' house" aria-label="Address name" />}
      </Field>
      {value.lat != null && <p className="muted small mt-s">GPS pinned: {value.lat.toFixed(4)}, {value.lng.toFixed(4)}</p>}
    </>
  );
}
