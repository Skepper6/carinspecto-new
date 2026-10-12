import { useMemo, useState } from 'react';
import { Ticket, MessageCircle, CheckCheck, Inbox, Users } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { useDB, setTicketStatus, ticketState } from '../../lib/db';
import { Avatar, Badge, PageHeader, SearchInput, Tabs, useLoading, FilterBar, useFilters, inRange, StatCard } from '../../components/ui/kit';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import { TicketThread, TICKET_CATEGORIES, PRIORITY_TONE, TICKET_LABEL, TICKET_TONE } from '../customer/Support';
import { fmtDate, timeAgo } from '../../lib/format';

export default function Tickets() {
  const s = useDB((x) => x);
  const { guard } = useUI();
  const loading = useLoading(500);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const flt = useFilters();
  const [open, setOpen] = useState(null);

  const base = useMemo(() => s.tickets.map((t) => ({ ...t, customer: s.users.find((u) => u.id === t.customerId), st: ticketState(t, 'admin') })), [s]);
  const rows = base.filter((t) => tab === 'all' || (tab === 'needs' ? t.st.awaiting : t.status === tab))
    .filter((t) => `${t.id} ${t.subject} ${t.customer?.name} ${t.category}`.toLowerCase().includes(q.toLowerCase()))
    .filter((t) => (!flt.f.category || t.category === flt.f.category) && (!flt.f.priority || t.priority === flt.f.priority) && inRange(t.createdAt, flt.f))
    .sort((a, b) => (b.st.last?.at ?? b.createdAt).localeCompare(a.st.last?.at ?? a.createdAt)); // latest activity first
  const cur = base.find((t) => t.id === open);
  const c = (st) => base.filter((t) => t.status === st).length;

  const fdefs = [
    { key: 'category', label: 'All categories', options: TICKET_CATEGORIES },
    { key: 'priority', label: 'All priorities', options: ['low', 'medium', 'high'] },
    { key: 'from', label: 'From', type: 'date' }, { key: 'to', label: 'To', type: 'date' }
  ];
  const cols = [
    { key: 'id', hide: 'sm', label: 'Ticket', width: 115, render: (t) => <span className="tk-id">{t.st.unseen && <i className="new-dot" />}<b className="mono">{t.id}</b></span> },
    { key: 'subject', label: 'Subject', render: (t) => <div className="cell-2"><b className="tk-title"><span>{t.subject}</span>{t.st.unseen && <span className="new-tag">New</span>}</b><span className="muted small">{t.category}{t.category === 'Other' && t.categoryDetail ? ` · ${t.categoryDetail}` : ''}{t.bookingId ? ` · ${t.bookingId}` : ''}</span></div> },
    { key: 'customer', hide: 'lg', label: 'Customer', width: 170, sortValue: (t) => t.customer?.name, render: (t) => <span className="with-av"><Avatar name={t.customer?.name} size={28} />{t.customer?.name}</span> },
    { key: 'priority', hide: 'xl', label: 'Priority', width: 100, sortValue: (t) => ({ high: 0, medium: 1, low: 2 }[t.priority]), render: (t) => <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge> },
    { key: 'status', label: 'Status', width: 175, render: (t) => (t.st.awaiting ? <Badge tone="red" dot>Awaiting reply</Badge> : <Badge tone={TICKET_TONE[t.status]} dot>{TICKET_LABEL[t.status]}</Badge>) },
    { key: 'last', hide: 'md', label: 'Last message', width: 240, sortValue: (t) => t.st.last?.at ?? '', render: (t) => (
      <div className="cell-2 lm"><span className={t.st.awaiting ? 'await' : ''}>{t.st.last?.text || (t.st.last?.attachments?.length ? '📎 Attachment' : '—')}</span><span className="muted small">{t.st.last?.from === 'admin' ? 'You' : 'Customer'} · {t.st.last ? timeAgo(t.st.last.at) : ''}</span></div>
    ) },
      ];

  return (
    <div className="page fill">
      <PageHeader title="Support tickets" subtitle="Reply to customers and close the loop." />
      <div className="grid-4 compact">
        <StatCard icon={Inbox} label="New messages" value={base.filter((t) => t.st.unseen).length} tone="orange" hint="not opened yet" />
        <StatCard icon={MessageCircle} label="Awaiting your reply" value={base.filter((t) => t.st.awaiting).length} tone="violet" hint="customer wrote last" />
        <StatCard icon={Users} label="Customers waiting" value={new Set(base.filter((t) => t.st.awaiting).map((t) => t.customerId)).size} tone="indigo" hint="different people" />
        <StatCard icon={Ticket} label="Open tickets" value={base.filter((t) => t.status !== 'resolved').length} tone="teal" hint="not resolved" />
      </div>
      <div className="toolbar">
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'all', label: 'All', count: base.length }, { value: 'needs', label: 'Needs reply', count: base.filter((t) => t.st.awaiting).length }, { value: 'open', label: 'Open', count: c('open') }, { value: 'in_progress', label: 'In progress', count: c('in_progress') }, { value: 'resolved', label: 'Resolved', count: c('resolved') }]} />
        <div className="filters"><FilterBar defs={fdefs} flt={flt} /><SearchInput value={q} onChange={setQ} placeholder="Search by ticket ID, subject, customer or category…" /></div>
      </div>
      <DataTable columns={cols} rows={rows} loading={loading} onRowClick={(t) => setOpen(t.id)} rowClass={(t) => (t.st.unseen ? 'row-attn' : '')} resetKey={tab + q + flt.key} empty={<><Ticket size={30} /><b>No tickets</b></>} />

      <Modal open={!!cur} onClose={() => setOpen(null)} size="md" title={cur?.subject} subtitle={cur && `${cur.id} · ${cur.customer?.name} · ${cur.category}`}
        footer={cur && cur.status !== 'resolved' && <Button variant="outline" icon={CheckCheck} onClick={() => guard(setTicketStatus(cur.id, 'resolved'), `${cur.id} marked as resolved.`)}>Mark resolved</Button>}>
        {cur && (
          <>
            <div className="row-between mb"><Badge tone={TICKET_TONE[cur.status]} dot>{TICKET_LABEL[cur.status]}</Badge><Badge tone={PRIORITY_TONE[cur.priority]}>{cur.priority} priority</Badge></div>
            <TicketThread ticketId={cur.id} as="admin" />
          </>
        )}
      </Modal>
    </div>
  );
}
