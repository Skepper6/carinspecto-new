import { useState } from 'react';
import { Plus, Pencil, Trash2, Save } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { useDB, updateContent, updatePlan } from '../../lib/db';
import { Card, Input, PageHeader, Tabs, Textarea, EmptyState, SearchInput } from '../../components/ui/kit';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { money, uid } from '../../lib/format';
import { TAX_NAME } from '../../lib/constants';

export default function Content() {
  const content = useDB((s) => s.content);
  const plans = useDB((s) => s.plans);
  const { toast, confirm, guard } = useUI();
  const [tab, setTab] = useState('faq');
  const [fq, setFq] = useState('');
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState({});
  const [terms, setTerms] = useState(content.terms);
  const [privacy, setPrivacy] = useState(content.privacy);
  const [prices, setPrices] = useState(Object.fromEntries(plans.map((p) => [p.id, p.price])));

  const saveFaq = async () => {
    const e = {};
    if (edit.q.trim().length < 5) e.q = 'Enter the question';
    if (edit.a.trim().length < 10) e.a = 'Enter a fuller answer';
    setErr(e);
    if (Object.keys(e).length) return;
    const exists = content.faqs.some((f) => f.id === edit.id);
    if (!await guard(updateContent({ faqs: exists ? content.faqs.map((f) => (f.id === edit.id ? edit : f)) : [...content.faqs, edit] }), exists ? 'FAQ updated.' : 'FAQ added.')) return;
    setEdit(null);
  };
  const delFaq = async (f) => {
    if (!await confirm({ title: 'Delete this FAQ?', message: f.q, confirmText: 'Delete', danger: true })) return;
    await guard(updateContent({ faqs: content.faqs.filter((x) => x.id !== f.id) }), 'FAQ deleted.');
  };
  const savePrices = async () => {
    for (const p of plans) {
      const n = Number(prices[p.id]);
      if (!n || n < 100) return toast.error(`Enter a valid price for ${p.name}.`);
    }
    await guard(Promise.all(plans.map((p) => updatePlan(p.id, { price: Number(prices[p.id]) }))), 'Plan prices updated. New bookings will use these prices.');
  };

  return (
    <div className="page">
      <PageHeader title="Content & plans" subtitle="Manage the FAQ, legal text and package pricing shown across the site." />
      <div className="toolbar"><Tabs value={tab} onChange={setTab} tabs={[{ value: 'faq', label: 'FAQ' }, { value: 'legal', label: 'Terms & privacy' }, { value: 'plans', label: 'Plan pricing' }]} /><span /></div>

      {tab === 'faq' && (
        <Card title={`${content.faqs.length} questions`} action={<div className="row-actions"><SearchInput value={fq} onChange={setFq} placeholder="Search by question or answer…" /><Button size="sm" className="keep-label" icon={Plus} onClick={() => { setErr({}); setEdit({ id: uid('f'), q: '', a: '' }); }}>Add FAQ</Button></div>} pad={false}>
          {content.faqs.length === 0 ? <EmptyState title="No FAQs yet" text="Add the first question." /> : (
            <ul className="list static">
              {content.faqs.filter((f) => `${f.q} ${f.a}`.toLowerCase().includes(fq.toLowerCase())).map((f) => (
                <li key={f.id} className="faq-row">
                  <div className="li-main"><b>{f.q}</b><span className="muted small">{f.a}</span></div>
                  <button className="icon-btn sm" onClick={() => { setErr({}); setEdit(f); }} aria-label="Edit"><Pencil size={15} /></button>
                  <button className="icon-btn sm danger" onClick={() => delFaq(f)} aria-label="Delete"><Trash2 size={15} /></button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'legal' && (
        <div className="grid-2">
          <Card title="Terms & conditions"><Textarea rows={9} value={terms} onChange={(e) => setTerms(e.target.value)} /><Button icon={Save} onClick={() => guard(updateContent({ terms }), 'Terms saved.')}>Save terms</Button></Card>
          <Card title="Privacy policy"><Textarea rows={9} value={privacy} onChange={(e) => setPrivacy(e.target.value)} /><Button icon={Save} onClick={() => guard(updateContent({ privacy }), 'Privacy policy saved.')}>Save policy</Button></Card>
        </div>
      )}

      {tab === 'plans' && (
        <Card title={`Package pricing (excl. ${TAX_NAME})`}>
          <div className="form-grid three">
            {plans.map((p) => <Input key={p.id} label={`${p.name} – ${p.checkpoints} checkpoints`} type="number" value={prices[p.id]} onChange={(e) => setPrices({ ...prices, [p.id]: e.target.value })} hint={`Currently ${money(p.price)}`} />)}
          </div>
          <Button icon={Save} onClick={savePrices}>Save prices</Button>
        </Card>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && content.faqs.some((f) => f.id === edit.id) ? 'Edit FAQ' : 'Add FAQ'}
        footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button icon={Save} onClick={saveFaq}>Save</Button></>}>
        {edit && <div className="form-grid"><Input className="span-2" label="Question" value={edit.q} onChange={(e) => setEdit({ ...edit, q: e.target.value })} error={err.q} /><Textarea className="span-2" label="Answer" value={edit.a} onChange={(e) => setEdit({ ...edit, a: e.target.value })} error={err.a} /></div>}
      </Modal>
    </div>
  );
}
