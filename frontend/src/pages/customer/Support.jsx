import { useEffect, useMemo, useRef, useState } from 'react';
import { LifeBuoy, Plus, Send, MessageCircle, Paperclip } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useDB, createTicket, replyTicket, ticketState, markTicketSeen } from '../../lib/db';
import { PageHeader, Badge, Input, Select, Textarea, useLoading, Tabs, SearchInput, FilterBar, useFilters, inRange } from '../../components/ui/kit';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import { FileAttach, AttachmentChip } from '../../components/shared/FileAttach';
import { saveFile } from '../../lib/files';
import { fmtDate, timeAgo } from '../../lib/format';

export const TICKET_CATEGORIES = ['General', 'Booking', 'Reports', 'Payments', 'Service', 'Account', 'Other'];
export const TICKET_TONE = { open: 'amber', in_progress: 'blue', resolved: 'green' };
export const TICKET_LABEL = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved' };
export const PRIORITY_TONE = { low: 'gray', medium: 'amber', high: 'red' };

export function TicketThread({ ticketId, as }) {
  const t = useDB((s) => s.tickets.find((x) => x.id === ticketId));
  const { toast } = useUI();
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [seenAt] = useState(() => t?.seen?.[as] ?? ''); // what was already read when the thread was opened
  const lastAt = t?.messages[t.messages.length - 1]?.at;
  // opening a ticket (or receiving a message while it is open) marks it as seen
  useEffect(() => { if (t && ticketState(t, as).unseen) markTicketSeen(t.id, as); }, [t?.id, lastAt]); // eslint-disable-line
  const listRef = useRef(null);
  // show the first unread message, otherwise the newest one
  useEffect(() => {
    const box = listRef.current; if (!box) return;
    const firstNew = box.querySelector('.msg.new');
    if (firstNew) box.scrollTo({ top: Math.max(0, firstNew.offsetTop - 12), behavior: 'smooth' });
    else box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
  }, [lastAt]);
  if (!t) return null;
  const send = async () => {
    if (!text.trim() && !files.length) return;
    setBusy(true);
    try {
      const attachments = await Promise.all(files.map(saveFile));
      await replyTicket(t.id, as, text.trim(), attachments);
      setText(''); setFiles([]);
    } catch (e) { toast.error(e.message || 'Could not send your message. Please try again.'); }
    setBusy(false);
  };
  return (
    <div className="thread">
      <div className="thread-msgs" ref={listRef}>
        {t.messages.map((m, i) => (
          <div key={i} className={`msg ${m.from === as ? 'me' : ''} ${m.from !== as && m.at > seenAt ? 'new' : ''}`}>
            {m.from !== as && m.at > seenAt && <em className="msg-new">New message</em>}
            {m.text && <p>{m.text}</p>}
            {m.attachments?.length > 0 && <div className="att-row">{m.attachments.map((a) => <AttachmentChip key={a.id} file={a} />)}</div>}
            <span>{m.from === 'admin' ? 'Support team' : 'Customer'} · {timeAgo(m.at)}</span>
          </div>
        ))}
      </div>
      {t.status !== 'resolved' ? (
        <div className="reply-box">
          <div className="reply-row">
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a reply…" onKeyDown={(e) => e.key === 'Enter' && send()} />
            <FileAttach compact value={files} onChange={setFiles} onError={toast.error} />
            <Button icon={Send} loading={busy} onClick={send}>Send</Button>
          </div>
          {files.length > 0 && (
            <ul className="attach-list">
              {files.map((f, i) => <li key={`${f.name}${i}`}><Paperclip size={15} /><span>{f.name}</span><button type="button" className="icon-btn sm" aria-label="Remove" onClick={() => setFiles(files.filter((_, k) => k !== i))}>×</button></li>)}
            </ul>
          )}
        </div>
      ) : <p className="muted small center">This ticket is resolved.</p>}
    </div>
  );
}

export default function Support() {
  const { user } = useAuth();
  const { toast } = useUI();
  const all = useDB((s) => s.tickets.filter((t) => t.customerId === user.id));
  const bookings = useDB((s) => s.bookings.filter((b) => b.customerId === user.id));
  const loading = useLoading(450);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const flt = useFilters();
  const [open, setOpen] = useState(null);
  const [creating, setCreating] = useState(false);
  const blank = { subject: '', category: 'General', categoryDetail: '', priority: 'medium', message: '', bookingId: '' };
  const [f, setF] = useState(blank);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState({});

  const rows = useMemo(() => all
    .filter((t) => tab === 'all' || t.status === tab)
    .filter((t) => (!flt.f.category || t.category === flt.f.category) && (!flt.f.priority || t.priority === flt.f.priority) && inRange(t.createdAt, flt.f))
    .filter((t) => `${t.id} ${t.subject} ${t.category}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [all, tab, q, flt.key]); // eslint-disable-line

  const submit = async () => {
    const e = {};
    if (f.subject.trim().length < 4) e.subject = 'Add a short subject';
    if (f.category === 'Other' && f.categoryDetail.trim().length < 3) e.categoryDetail = 'Please tell us what this is about';
    if (f.message.trim().length < 10) e.message = 'Please describe the issue (10+ characters)';
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const attachments = await Promise.all(files.map(saveFile));
      const t = await createTicket(user, { ...f, categoryDetail: f.category === 'Other' ? f.categoryDetail.trim() : '', attachments });
      setCreating(false); setF(blank); setFiles([]);
      toast.success(`Ticket ${t.id} created. We usually reply within a few hours.`);
    } catch (e) { toast.error(e.message || 'Could not create the ticket. Please try again.'); }
    setBusy(false);
  };

  const cols = [
    { key: 'id', hide: 'sm', label: 'Ticket', width: 115, render: (t) => <b className="mono">{t.id}</b> },
    { key: 'subject', label: 'Subject', render: (t) => <div className="cell-2"><b className="tk-title">{ticketState(t, 'customer').unseen && <i className="new-dot" />}<span>{t.subject}</span>{ticketState(t, 'customer').unseen && <span className="new-tag">New reply</span>}</b><span className="muted small">{t.category}{t.category === 'Other' && t.categoryDetail ? ` · ${t.categoryDetail}` : ''}</span></div> },
    { key: 'priority', hide: 'md', label: 'Priority', width: 110, render: (t) => <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge> },
    { key: 'status', label: 'Status', width: 150, render: (t) => <Badge tone={TICKET_TONE[t.status]} dot>{TICKET_LABEL[t.status]}</Badge> },
    { key: 'createdAt', hide: 'md', label: 'Created', width: 130, render: (t) => fmtDate(t.createdAt) },
    { key: 'm', hide: 'lg', label: 'Replies', width: 90, sortValue: (t) => t.messages.length, render: (t) => <span className="muted"><MessageCircle size={14} /> {t.messages.length}{t.messages.some((m) => m.attachments?.length) && <> · <Paperclip size={13} /></>}</span> },
  ];
  const fdefs = [
    { key: 'category', label: 'All categories', options: TICKET_CATEGORIES },
    { key: 'priority', label: 'All priorities', options: ['low', 'medium', 'high'] },
    { key: 'from', label: 'From', type: 'date' }, { key: 'to', label: 'To', type: 'date' },
  ];

  return (
    <div className="page fill">
      <PageHeader title="Support" subtitle="Questions about a booking or report? We are here to help." actions={<Button icon={Plus} onClick={() => setCreating(true)}>New ticket</Button>} />
      <div className="toolbar">
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'all', label: 'All', count: all.length }, { value: 'open', label: 'Open' }, { value: 'in_progress', label: 'In progress' }, { value: 'resolved', label: 'Resolved' }]} />
        <div className="filters"><FilterBar defs={fdefs} flt={flt} /><SearchInput value={q} onChange={setQ} placeholder="Search by ticket ID or subject…" /></div>
      </div>
      <DataTable columns={cols} rows={rows} loading={loading} onRowClick={(t) => setOpen(t.id)} rowClass={(t) => (ticketState(t, 'customer').unseen ? 'row-attn' : '')} resetKey={tab + q + flt.key}
        empty={<><LifeBuoy size={30} /><b>No tickets</b><span className="muted">Need help? Create a ticket and we will get back to you.</span></>} />

      <Modal open={creating} onClose={() => setCreating(false)} title="Create support ticket" footer={<><Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button><Button icon={Send} loading={busy} onClick={submit}>Submit ticket</Button></>}>
        <div className="form-grid">
          <Input className="span-2" label="Subject" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} error={errs.subject} />
          <Select label="Category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} options={TICKET_CATEGORIES} />
          <Select label="Priority" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} options={['low', 'medium', 'high']} />
          {f.category === 'Other' && <Input className="span-2" label="Please specify" value={f.categoryDetail} onChange={(e) => { setF({ ...f, categoryDetail: e.target.value }); setErrs({ ...errs, categoryDetail: undefined }); }} placeholder="What is this about?" error={errs.categoryDetail} autoFocus />}
          <Select className="span-2" label="Related booking (optional)" value={f.bookingId} onChange={(e) => setF({ ...f, bookingId: e.target.value })} options={bookings.map((b) => ({ value: b.id, label: `${b.id} · ${b.car.make} ${b.car.model}` }))} placeholder="None" />
          <Textarea className="span-2" label="How can we help?" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} error={errs.message} />
          <div className="span-2 field"><span className="field-label">Attachments (optional)</span><FileAttach value={files} onChange={setFiles} onError={toast.error} /></div>
        </div>
      </Modal>
      <Modal open={!!open} onClose={() => setOpen(null)} size="md" title={open ? all.find((t) => t.id === open)?.subject : ''} subtitle={open}>
        {open && <TicketThread ticketId={open} as="customer" />}
      </Modal>
    </div>
  );
}
