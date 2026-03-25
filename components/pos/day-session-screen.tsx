'use client';

import { useState } from 'react';
import { usePOS } from '@/lib/pos-context';
import { formatCurrency, generateId, DaySession } from '@/lib/pos-store';
import {
  CalendarClock, DollarSign, TrendingUp, ShoppingBag,
  Lock, Unlock, AlertCircle, CheckCircle2, Clock, User,
} from 'lucide-react';

export function DaySessionScreen() {
  const { state, dispatch } = usePOS();
  const isAdmin = state.currentUser?.role === 'admin';
  const sym = state.settings.currencySymbol;
  const session = state.daySession;
  const todayStr = new Date().toISOString().split('T')[0];

  const todaySales = state.sales.filter(s =>
    session ? s.sessionId === session.id : s.date === todayStr
  );
  const todayRevenue = todaySales.reduce((s, sale) => s + sale.total, 0);

  function calcProfit(sale: typeof todaySales[0]) {
    let cost = 0;
    sale.items.forEach(item => {
      const product = state.products.find(p => p.id === item.productId);
      cost += (product?.costPrice ?? 0) * item.quantity;
    });
    return sale.total - cost;
  }
  const todayProfit = todaySales.reduce((s, sale) => s + calcProfit(sale), 0);

  const [openingCash, setOpeningCash] = useState('');
  const [openNotes, setOpenNotes] = useState('');

  function handleOpenSession() {
    const cash = parseFloat(openingCash);
    if (isNaN(cash) || cash < 0) return;
    const newSession: DaySession = {
      id: generateId(),
      date: todayStr,
      openingCash: cash,
      closingCash: null,
      openedAt: new Date().toISOString(),
      closedAt: null,
      openedBy: state.currentUser?.name ?? 'Unknown',
      totalSales: 0,
      sessionNotes: openNotes,
    };
    dispatch({ type: 'OPEN_DAY_SESSION', session: newSession });
    dispatch({ type: 'SET_SCREEN', screen: 'pos' });
    setOpeningCash('');
    setOpenNotes('');
  }

  const [closingCash, setClosingCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);

  function handleCloseSession() {
    if (!confirmClose) { setConfirmClose(true); return; }
    const cash = parseFloat(closingCash);
    if (isNaN(cash) || cash < 0) return;
    dispatch({ type: 'CLOSE_DAY_SESSION', closingCash: cash, notes: closeNotes });
    setClosingCash('');
    setCloseNotes('');
    setConfirmClose(false);
  }

  const expectedCash = session ? session.openingCash + session.totalSales : 0;
  const closingCashNum = parseFloat(closingCash);
  const cashDiff = !isNaN(closingCashNum) && closingCash !== '' ? closingCashNum - expectedCash : null;

  const inputCls = 'w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all';

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="px-4 pt-4 pb-3 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <CalendarClock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-foreground font-bold text-lg leading-tight">Day Session</h1>
            <p className="text-muted-foreground text-xs" suppressHydrationWarning>
              {new Date().toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {session && (
            <span className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/20 text-success text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Live
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-8">

        {/* Status banner */}
        <div className={`flex items-center gap-3 px-4 py-4 rounded-2xl border ${
          session ? 'bg-primary/8 border-primary/25' : 'bg-secondary border-border'
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            session ? 'bg-primary/20' : 'bg-muted'
          }`}>
            {session
              ? <Unlock className="w-5 h-5 text-primary" />
              : <Lock className="w-5 h-5 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-sm ${session ? 'text-primary' : 'text-foreground'}`}>
              {session ? 'Day Session is Open' : 'No Active Session'}
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {session
                ? `Opened at ${new Date(session.openedAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })} by ${session.openedBy}`
                : 'Open a session to start selling for the day'}
            </p>
          </div>
        </div>

        {/* Active session stats */}
        {session && (
          <div className="grid grid-cols-2 gap-3">
            <StatTile icon={<DollarSign className="w-4 h-4" />} label="Opening Cash"     value={formatCurrency(session.openingCash, sym)}   accent="info" />
            <StatTile icon={<ShoppingBag className="w-4 h-4" />} label="Sales Today"     value={formatCurrency(session.totalSales, sym)}    sub={`${todaySales.length} transactions`} accent="primary" />
            {isAdmin && (
              <StatTile icon={<TrendingUp className="w-4 h-4" />}  label="Today's Profit"  value={formatCurrency(todayProfit, sym)}           sub={todayRevenue > 0 ? `${Math.round((todayProfit / todayRevenue) * 100)}% margin` : undefined} accent="success" />
            )}
            <StatTile icon={<DollarSign className="w-4 h-4" />}  label="Expected Cash"   value={formatCurrency(expectedCash, sym)}          sub="Opening + Sales" accent="warning" />
          </div>
        )}

        {/* Open session form */}
        {!session && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
            <p className="text-foreground font-bold text-sm">Open Day Session</p>

            <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <p className="text-foreground text-sm font-semibold" suppressHydrationWarning>{todayStr}</p>
              <div className="ml-auto flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <p className="text-muted-foreground text-xs">{state.currentUser?.name}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Opening Cash ({sym}) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="number"
                  value={openingCash}
                  onChange={e => setOpeningCash(e.target.value)}
                  placeholder="e.g. 50000"
                  min="0"
                  className={`${inputCls} pl-10`}
                />
              </div>
              <p className="text-muted-foreground text-xs mt-1.5">Enter the cash in the drawer before sales start.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Notes (optional)</label>
              <textarea value={openNotes} onChange={e => setOpenNotes(e.target.value)}
                placeholder="Any notes for this session..." rows={2} className={`${inputCls} resize-none`} />
            </div>

            <button onClick={handleOpenSession}
              disabled={!openingCash || parseFloat(openingCash) < 0}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary rounded-xl text-primary-foreground font-semibold text-sm shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
              <Unlock className="w-4 h-4" />
              Open Day Session
            </button>
          </div>
        )}

        {/* Close session form */}
        {session && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
            <p className="text-foreground font-bold text-sm">Close Day Session</p>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Actual Closing Cash ({sym}) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="number" value={closingCash}
                  onChange={e => { setClosingCash(e.target.value); setConfirmClose(false); }}
                  placeholder="Count and enter cash in drawer" min="0"
                  className={`${inputCls} pl-10`} />
              </div>
            </div>

            {cashDiff !== null && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
                cashDiff === 0   ? 'bg-success/10 border-success/25 text-success'
                : cashDiff > 0  ? 'bg-info/10 border-info/25 text-info'
                                : 'bg-destructive/10 border-destructive/25 text-destructive'
              }`}>
                {cashDiff === 0
                  ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                  : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>
                  {cashDiff === 0
                    ? 'Cash is perfectly balanced'
                    : cashDiff > 0
                    ? `Overage: +${formatCurrency(cashDiff, sym)}`
                    : `Shortage: ${formatCurrency(cashDiff, sym)}`}
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Closing Notes (optional)</label>
              <textarea value={closeNotes} onChange={e => setCloseNotes(e.target.value)}
                placeholder="Notes about discrepancies, handover, etc." rows={2}
                className={`${inputCls} resize-none`} />
            </div>

            <div className="bg-secondary rounded-xl divide-y divide-border overflow-hidden">
              {[
                { label: 'Opening Cash',  value: formatCurrency(session.openingCash, sym) },
                { label: 'Total Sales',   value: formatCurrency(session.totalSales, sym) },
                { label: 'Expected Cash', value: formatCurrency(expectedCash, sym) },
                { label: 'Actual Cash',   value: closingCash ? formatCurrency(closingCashNum, sym) : '—' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                  <p className="text-muted-foreground text-xs">{row.label}</p>
                  <p className="text-foreground text-xs font-semibold">{row.value}</p>
                </div>
              ))}
            </div>

            {confirmClose && (
              <div className="flex items-start gap-2.5 bg-destructive/8 border border-destructive/25 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-destructive text-xs font-medium">
                  Are you sure? This will end today's sales and record the final cash balance. Tap again to confirm.
                </p>
              </div>
            )}

            <button onClick={handleCloseSession}
              disabled={!closingCash || closingCashNum < 0}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] ${
                confirmClose
                  ? 'bg-destructive text-destructive-foreground'
                  : 'bg-secondary border border-border text-foreground'
              }`}>
              <Lock className="w-4 h-4" />
              {confirmClose ? 'Confirm — Close Session' : 'Close Day Session'}
            </button>
          </div>
        )}

        {/* Past sessions */}
        {state.pastSessions.length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <p className="text-foreground font-bold text-sm px-4 pt-4 pb-3">Recent Sessions</p>
            {state.pastSessions.slice(0, 5).map((s, i) => {
              const diff = s.closingCash !== null ? s.closingCash - (s.openingCash + s.totalSales) : null;
              return (
                <div key={s.id} className={`flex items-center gap-3 px-4 py-3 ${i < Math.min(state.pastSessions.length, 5) - 1 ? 'border-b border-border' : ''}`}>
                  <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm font-semibold">{s.date}</p>
                    <p className="text-muted-foreground text-xs">{s.openedBy}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-foreground text-xs font-semibold">{formatCurrency(s.totalSales, sym)}</p>
                    {diff !== null && (
                      <p className={`text-xs font-medium ${diff === 0 ? 'text-success' : diff > 0 ? 'text-info' : 'text-destructive'}`}>
                        {diff === 0 ? 'Balanced' : diff > 0 ? `+${formatCurrency(diff, sym)}` : formatCurrency(diff, sym)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({ icon, label, value, sub, accent }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: 'primary' | 'success' | 'info' | 'warning';
}) {
  const colors: Record<string, string> = {
    primary: 'text-primary bg-primary/12',
    success: 'text-success bg-success/12',
    info:    'text-info bg-info/12',
    warning: 'text-warning bg-warning/12',
  };
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${colors[accent]}`}>
        {icon}
      </div>
      <p className="text-foreground font-bold text-sm leading-tight">{value}</p>
      {sub && <p className="text-muted-foreground text-xs mt-0.5">{sub}</p>}
      <p className="text-muted-foreground text-xs mt-1">{label}</p>
    </div>
  );
}
