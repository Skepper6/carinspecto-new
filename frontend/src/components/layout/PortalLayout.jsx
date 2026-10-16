import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, CalendarPlus, ClipboardList, FileText, UserCircle, LifeBuoy, ClipboardCheck, History, Users, UserCog,
  Ticket, Wallet, BarChart3, FileCog, Bell, Menu, Moon, Sun, LogOut, CheckCheck, ChevronsLeft,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useDB, markNotificationsRead, ticketState } from '../../lib/db';
import { Avatar, Logo } from '../ui/kit';
import { timeAgo } from '../../lib/format';

const NAV = {
  customer: [
    ['/app', 'Dashboard', LayoutDashboard, true], ['/app/book', 'New Booking', CalendarPlus], ['/app/bookings', 'My Bookings', ClipboardList],
    ['/app/reports', 'Reports', FileText], ['/app/support', 'Support', LifeBuoy], ['/app/profile', 'Profile', UserCircle],
  ],
  inspector: [
    ['/inspector', 'Dashboard', LayoutDashboard, true], ['/inspector/assignments', 'Assignments', ClipboardCheck],
    ['/inspector/history', 'History', History], ['/inspector/profile', 'Profile', UserCircle],
  ],
  admin: [
    ['/admin', 'Overview', LayoutDashboard, true], ['/admin/bookings', 'Orders', ClipboardList], ['/admin/customers', 'Customers', Users],
    ['/admin/inspectors', 'Inspectors', UserCog], ['/admin/tickets', 'Support tickets', Ticket], ['/admin/revenue', 'Revenue', Wallet],
    ['/admin/analytics', 'Analytics', BarChart3], ['/admin/content', 'Content & plans', FileCog], ['/admin/profile', 'Profile', UserCircle],
  ],
};
const ROLE_LABEL = { customer: 'Customer', inspector: 'Inspector', admin: 'Administrator' };

function Notifications({ user }) {
  const [open, setOpen] = useState(false);
  const [only, setOnly] = useState('all');
  const ref = useRef(null);
  const items = useDB((s) => s.notifications.filter((n) => n.userId === user.id));
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="notif" ref={ref}>
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        <Bell size={19} />{unread > 0 && <i className="notif-dot">{unread > 9 ? '9+' : unread}</i>}
      </button>
      {open && (
        <div className="popover">
          <header>
            <strong>Notifications</strong>
            <button className="link-btn" onClick={() => markNotificationsRead(user.id)}><CheckCheck size={14} /> Mark all read</button>
          </header>
          <div className="pop-tabs"><button className={only === 'all' ? 'on' : ''} onClick={() => setOnly('all')}>All</button><button className={only === 'unread' ? 'on' : ''} onClick={() => setOnly('unread')}>Unread{unread > 0 ? ` (${unread})` : ''}</button></div>
          <div className="popover-list">
            {(only === 'unread' ? items.filter((n) => !n.read) : items).length === 0 && <p className="muted center pad">{only === 'unread' ? 'No unread notifications' : "You're all caught up 🎉"}</p>}
            {(only === 'unread' ? items.filter((n) => !n.read) : items).slice(0, 12).map((n) => (
              <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`}>
                <b>{n.title}</b><span>{n.body}</span><em>{timeAgo(n.at)}</em>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PortalLayout({ role }) {
  const { user, logout } = useAuth();
  const { theme, setTheme, toast } = useUI();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  const contentRef = useRef(null);

  useEffect(() => { setOpen(false); contentRef.current?.scrollTo({ top: 0 }); }, [loc.pathname]);

  const attn = useDB((st) => (role === 'admin' ? st.tickets.filter((t) => ticketState(t, 'admin').unseen).length : role === 'customer' ? st.tickets.filter((t) => t.customerId === user.id && ticketState(t, 'customer').unseen).length : 0));
  // a message / reply / assignment arrived from another tab -> tell the user right away
  useEffect(() => {
    const on = (e) => {
      const old = new Set(e.detail.prev.notifications.map((n) => n.id));
      e.detail.next.notifications.filter((n) => n.userId === user.id && !old.has(n.id)).slice(0, 2).forEach((n) => toast.info(`${n.title} – ${n.body}`));
    };
    window.addEventListener('ci:remote-update', on);
    return () => window.removeEventListener('ci:remote-update', on);
  }, [user.id]); // eslint-disable-line
  const items = NAV[role];
  const current = items.find(([to, , , end]) => (end ? loc.pathname === to : loc.pathname === to || loc.pathname.startsWith(`${to}/`)))
    ?? (loc.pathname.includes('/inspect/') ? ['', 'Inspection', null] : null);

  const doLogout = async () => {
    await logout();
    toast.info('You have been signed out.');
    nav('/');
  };

  return (
    <div className={`shell portal-${role} ${collapsed ? 'collapsed' : ''}`}>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="side-top">
          <Link to="/" className="side-logo"><span className="logo-chip"><Logo height={56} /></span></Link>
          <span className={`role-pill role-${role}`}>{ROLE_LABEL[role]} portal</span>
        </div>
        <nav>
          {items.map(([to, label, Icon, end]) => (
            <NavLink key={to} to={to} end={end} title={label} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon size={19} /><span>{label}</span>{attn > 0 && /^(Support tickets|Support)$/.test(label) && <i className="nav-badge">{attn}</i>}
            </NavLink>
          ))}
        </nav>
        <div className="side-bottom">
          <button className="side-link" onClick={doLogout}><LogOut size={18} /><span>Logout</span></button>
          <button className="side-link" onClick={() => setCollapsed((c) => !c)}><ChevronsLeft size={18} /><span>Collapse</span></button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <Link to="/" className="topbar-logo" aria-label="Car InspectO home"><Logo height={30} /></Link>
          <h2>{current?.[1] ?? 'Car InspectO'}</h2>
          <div className="top-actions">
            <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <Notifications user={user} />
            <div className="user-chip">
              <Avatar name={user.name} size={34} />
              <div className="user-meta"><b>{user.name}</b><span>{role === 'admin' ? 'Admin' : ROLE_LABEL[role]}</span></div>
            </div>
          </div>
        </header>
        <main className="content" ref={contentRef}>
          <Outlet key={loc.pathname} />
        </main>
      </div>
    </div>
  );
}
