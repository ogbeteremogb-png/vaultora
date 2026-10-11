import { Link, useLocation } from "wouter";
import { type ComponentType, type ReactNode, useState } from "react";
import { ArrowUpRight, BarChart3, Bell, ChevronRight, CircleDollarSign, ClipboardList, Copy, Inbox, LayoutDashboard, LogOut, Menu, ShieldCheck, Sparkles, WalletCards, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { PreferenceSelectors, usePreferences } from "../contexts/PreferencesContext";

export function LogoMark({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="brand-mark"><span className="brand-icon">V</span>{!compact && <span className="brand-word">VAULTORA</span>}</Link>;
}

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const { t } = usePreferences();
  return <header className="public-header"><div className="wide-row"><LogoMark /><div className="header-tools"><PreferenceSelectors/><nav className={open ? "public-nav open" : "public-nav"}><Link href="/plans">{t("plans")}</Link><Link href="/about">{t("about")}</Link><Link href="/contact">{t("contact")}</Link><Link href="/login" className="nav-login">{t("login")}</Link><Link href="/signup" className="button button-gold button-small">{t("openAccount")} <ArrowUpRight size={15}/></Link></nav></div><button className="icon-button mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X size={20}/> : <Menu size={20}/>}</button></div></header>;
}

export function PublicFooter() {
  return <footer className="public-footer"><div className="footer-grid"><div><LogoMark /><p className="muted footer-copy">A transparent digital vault for disciplined crypto growth.</p></div><div><p className="eyebrow">Explore</p><Link href="/plans">Investment plans</Link><Link href="/about">Our principles</Link><Link href="/contact">Contact team</Link></div><div><p className="eyebrow">Account</p><Link href="/signup">Create account</Link><Link href="/login">Log in</Link><Link href="/forgot-password">Reset password</Link></div><div><p className="eyebrow">Risk note</p><p className="muted small-copy">Digital asset markets are volatile. Platform plan terms are illustrative and not financial advice.</p></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Vaultora</span><span>Every balance move is recorded.</span></div></footer>;
}

export function MarketTicker() {
  const { data, isLoading } = trpc.market.ticker.useQuery(undefined, { refetchInterval: 60_000 });
  const prices = data ?? [];
  return <div className="market-rail"><div className="rail-label"><span className="live-dot"/> Live market rail</div>{(isLoading ? [{ symbol: "BTC", name: "Bitcoin", price: 104820.12, change: 2.84 }, { symbol: "ETH", name: "Ethereum", price: 3842.76, change: 1.42 }, { symbol: "USDT", name: "Tether", price: 1, change: 0.01 }] : prices).map(item => <div className="ticker-item" key={item.symbol}><span className="coin-token">{item.symbol.slice(0, 1)}</span><span><strong>{item.symbol}</strong><small>{item.name}</small></span><span className="ticker-price">${item.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span><span className={item.change >= 0 ? "positive" : "negative"}>{item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%</span></div>)}</div>;
}

export function Button({ children, className = "", variant = "gold", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "gold" | "outline" | "ghost" | "danger" }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

export function Field({ label, hint, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return <label className="field"><span>{label}</span><input {...props} />{hint && <small>{hint}</small>}</label>;
}

export function SelectField({ label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return <label className="field"><span>{label}</span><select {...props}>{children}</select></label>;
}

export function TextAreaField({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return <label className="field"><span>{label}</span><textarea {...props}/></label>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action}</div>;
}

export function MetricCard({ label, value, detail, icon: Icon = CircleDollarSign, tone = "gold" }: { label: string; value: string; detail?: string; icon?: ComponentType<{ size?: number }>; tone?: "gold" | "green" | "blue" | "muted" }) {
  return <div className={`metric-card tone-${tone}`}><div className="metric-top"><span>{label}</span><Icon size={17}/></div><strong>{value}</strong>{detail && <small>{detail}</small>}</div>;
}

export function StatusBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const tone = normalized.includes("approved") || normalized.includes("active") || normalized.includes("sent") || normalized.includes("credit") ? "green" : normalized.includes("reject") || normalized.includes("debit") || normalized.includes("suspend") ? "red" : "gold";
  return <span className={`status-badge status-${tone}`}><span/> {value}</span>;
}

export function CopyButton({ value }: { value: string }) {
  return <button className="copy-button" onClick={() => { navigator.clipboard?.writeText(value); toast.success("Copied to clipboard"); }} aria-label="Copy"><Copy size={14}/></button>;
}

const userLinks = [
  { href: "/app", label: "Overview", icon: LayoutDashboard },
  { href: "/app/deposit", label: "Deposit", icon: WalletCards },
  { href: "/app/invest", label: "Invest", icon: Sparkles },
  { href: "/app/withdraw", label: "Withdraw", icon: ArrowUpRight },
  { href: "/app/transactions", label: "Transactions", icon: ClipboardList },
  { href: "/app/inbox", label: "Inbox", icon: Inbox },
  { href: "/app/settings", label: "Settings", icon: ShieldCheck },
];
const adminLinks = [
  { href: "/admin", label: "Control center", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: ShieldCheck },
  { href: "/admin/deposits", label: "Deposits", icon: WalletCards },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: ArrowUpRight },
  { href: "/admin/wallets", label: "Deposit addresses", icon: CircleDollarSign },
  { href: "/admin/messages", label: "Email management", icon: Inbox },
  { href: "/admin/activity", label: "Activity log", icon: ClipboardList },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: me } = trpc.auth.me.useQuery();
  const unread = trpc.inbox.unreadCount.useQuery(undefined, { enabled: Boolean(me) });
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => navigate("/") });
  const isAdminPath = location.startsWith("/admin");
  const links = isAdminPath ? adminLinks : userLinks;
  return <div className={`app-frame ${collapsed ? "sidebar-collapsed" : ""}`}><aside className={`app-sidebar ${mobileOpen ? "mobile-open" : ""}`}><div className="sidebar-top"><LogoMark compact/><button className="icon-button sidebar-close" onClick={() => setMobileOpen(false)}><X size={18}/></button></div><div className="sidebar-label">{isAdminPath ? "Operations" : "Your vault"}</div><nav className="side-nav">{links.map(link => { const Icon = link.icon; const active = location === link.href; return <Link key={link.href} href={link.href} className={active ? "active" : ""} onClick={() => setMobileOpen(false)}><Icon size={17}/><span>{link.label}</span>{link.href === "/app/inbox" && unread.data ? <em>{unread.data}</em> : null}</Link>; })}</nav><div className="sidebar-bottom">{isAdminPath && <Link href="/app" className="back-user"><ChevronRight size={16}/> User portal</Link>}<button className="side-logout" onClick={() => logout.mutate()}><LogOut size={16}/> Sign out</button></div></aside><main className="app-main"><div className="app-topbar"><button className="icon-button menu-trigger" onClick={() => setMobileOpen(true)}><Menu size={20}/></button><div className="topbar-context">{isAdminPath ? "Admin control center" : "Personal vault"}<span>·</span><span className="topbar-user">{me?.fullName ?? "Loading session"}</span></div><div className="topbar-actions"><Link href="/app/inbox" className="topbar-icon"><Bell size={18}/>{unread.data ? <i/> : null}</Link><button className="collapse-button" onClick={() => setCollapsed(!collapsed)}>{collapsed ? "Expand" : "Collapse"}</button></div></div><div className="app-content">{children}</div></main></div>;
}

export function SectionCard({ title, description, action, children, className = "" }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`section-card ${className}`}><div className="section-card-head"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>{children}</section>;
}

export function EmptyState({ icon: Icon = BarChart3, title, description }: { icon?: typeof BarChart3; title: string; description: string }) {
  return <div className="empty-state"><Icon size={24}/><strong>{title}</strong><p>{description}</p></div>;
}
