'use client';

import { usePOS } from '@/lib/pos-context';
import { Screen } from '@/lib/pos-store';
import {
  ShoppingCart, Package, ReceiptText,
  BarChart2, Settings, Users, UserCircle, ChevronLeft,
  Receipt, Truck, CalendarClock, LogOut, Grid3X3, TicketPercent,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  screen: Screen;
  icon: React.ReactNode;
  label: string;
  adminOnly?: boolean;
  hideForStaff?: boolean;
}

const BOTTOM_NAV: NavItem[] = [
  { screen: 'pos', icon: <ShoppingCart className="w-5 h-5" />, label: 'Sale' },
  { screen: 'products', icon: <Package className="w-5 h-5" />, label: 'Products', hideForStaff: true },
  { screen: 'sales-log', icon: <ReceiptText className="w-5 h-5" />, label: 'Orders' },
  { screen: 'reports', icon: <BarChart2 className="w-5 h-5" />, label: 'Reports', adminOnly: true },
  { screen: 'settings', icon: <Grid3X3 className="w-5 h-5" />, label: 'More', hideForStaff: true },
];

const MORE_ITEMS: NavItem[] = [
  { screen: 'customers', icon: <UserCircle className="w-5 h-5" />, label: 'Customers', hideForStaff: true },
  { screen: 'suppliers', icon: <Truck className="w-5 h-5" />, label: 'Suppliers', adminOnly: true },
  { screen: 'users', icon: <Users className="w-5 h-5" />, label: 'Users', adminOnly: true },
  { screen: 'coupons', icon: <TicketPercent className="w-5 h-5" />, label: 'Coupons', adminOnly: true },
  { screen: 'day-session', icon: <CalendarClock className="w-5 h-5" />, label: 'Day Session', hideForStaff: true },
  { screen: 'settings', icon: <Settings className="w-5 h-5" />, label: 'Settings', hideForStaff: true },
];

// Screens that are "sub-screens" with back button instead of bottom nav
const SUB_SCREENS: Screen[] = ['receipt-gallery', 'day-session'];

function getBackScreen(screen: Screen): Screen {
  if (screen === 'receipt-gallery') return 'sales-log';
  if (screen === 'day-session') return 'pos';
  return 'pos';
}

const MORE_SCREENS: Screen[] = ['reports', 'customers', 'suppliers', 'users', 'coupons', 'day-session', 'settings'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { state, dispatch } = usePOS();
  const [showMore, setShowMore] = useState(false);
  const activeScreen = state.activeScreen;
  const isAdmin = state.currentUser?.role === 'admin';
  const isStaff = state.currentUser?.role === 'staff';
  const isSubScreen = SUB_SCREENS.includes(activeScreen);
  const isMoreScreen = MORE_SCREENS.includes(activeScreen) && !isSubScreen;
  const posTextScale = Math.max(-3, Math.min(3, state.settings.posTextScale ?? 0));
  const contentZoomLevel = 1 + (posTextScale * 0.04);

  const navigate = (screen: Screen) => {
    dispatch({ type: 'SET_SCREEN', screen });
    setShowMore(false);
  };

  const setPosTextScale = (nextScale: number) => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: { posTextScale: Math.max(-3, Math.min(3, nextScale)) },
    });
  };

  // Which bottom nav item is active
  const activeBottomNav = isMoreScreen ? 'settings' : (activeScreen as Screen);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">

      {/* ── Top Header ────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 h-14 shrink-0 bg-card border-b border-border">
        {/* Left: back button for sub-screens, or shop name */}
        {isSubScreen ? (
          <button
            onClick={() => navigate(getBackScreen(activeScreen))}
            className="flex items-center gap-1.5 -ml-1 px-2 py-2 rounded-xl active:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
            <span className="text-foreground text-sm font-medium">Back</span>
          </button>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <ShoppingCart className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="text-foreground font-bold text-sm leading-tight max-w-[120px] truncate">
              AKPOS
            </span>
          </div>
        )}

        {/* Right: contextual actions */}
        <div className="flex items-center gap-1">
          {!isSubScreen && (
            <div className="mr-1 flex items-center gap-0.5 rounded-xl border border-border bg-background p-0.5">
              <button
                type="button"
                onClick={() => setPosTextScale(posTextScale - 1)}
                disabled={posTextScale <= -3}
                className="rounded-lg px-2 py-1.5 text-xs font-semibold text-foreground disabled:opacity-40"
                title="Decrease text size"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setPosTextScale(0)}
                className={`rounded-lg px-2 py-1.5 text-xs font-semibold ${posTextScale === 0 ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}
                title="Default text size"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setPosTextScale(posTextScale + 1)}
                disabled={posTextScale >= 3}
                className="rounded-lg px-2 py-1.5 text-xs font-semibold text-foreground disabled:opacity-40"
                title="Increase text size"
              >
                A+
              </button>
            </div>
          )}
          {/* Day session pill */}
          {!isSubScreen && !isStaff && (
            <button
              onClick={() => navigate('day-session')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                state.daySession
                  ? 'bg-primary/10 text-primary border-primary/25'
                  : 'bg-secondary text-muted-foreground border-border'
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{state.daySession ? 'Day Open' : 'Open Day'}</span>
            </button>
          )}
          {activeScreen === 'sales-log' && (
            <button onClick={() => navigate('receipt-gallery')} className="p-2 rounded-xl hover:bg-secondary transition-colors">
              <Receipt className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          {/* User avatar + logout */}
          <button
            onClick={() => dispatch({ type: 'LOGOUT' })}
            title={`${state.currentUser?.name} — Logout`}
            className="flex items-center px-2 py-1.5 rounded-xl hover:bg-secondary transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden" style={{ zoom: contentZoomLevel }}>
          {children}
        </div>
      </main>

      {/* ── "More" overlay sheet ──────────────────────────────────────── */}
      {showMore && (
        <div
          className="absolute inset-0 z-40 bg-foreground/20 backdrop-blur-xs"
          onClick={() => setShowMore(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-3xl p-4 pb-8 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-foreground font-bold text-base">More</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-secondary rounded-full px-3 py-1.5">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-primary text-xs font-bold">{state.currentUser?.name?.[0]}</span>
                  </div>
                  <span className="text-foreground text-xs font-semibold">{state.currentUser?.name}</span>
                  <span className="text-muted-foreground text-xs capitalize">({state.currentUser?.role})</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {MORE_ITEMS.filter(i => (!i.adminOnly || isAdmin) && !(i.hideForStaff && isStaff)).map(item => (
                <button
                  key={item.screen}
                  onClick={() => navigate(item.screen)}
                  className={`flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all active:scale-[0.97] ${
                    activeScreen === item.screen
                      ? 'bg-primary/10 border-primary/25 text-primary'
                      : 'bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-border/80'
                  }`}
                >
                  {item.icon}
                  <span className="text-xs font-semibold">{item.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => { dispatch({ type: 'LOGOUT' }); setShowMore(false); }}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-semibold active:scale-[0.98] transition-all"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom Navigation ─────────────────────────────────────────── */}
      <nav className="shrink-0 border-t border-border bg-card" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex">
          {BOTTOM_NAV.filter(item => (!item.adminOnly || isAdmin) && !(item.hideForStaff && isStaff)).map(item => {
            const isActive = item.screen === 'settings'
              ? (isMoreScreen || showMore)
              : activeScreen === item.screen || (item.screen === 'sales-log' && activeScreen === 'receipt-gallery');
            return (
              <button
                key={item.screen}
                onClick={() => item.screen === 'settings' ? setShowMore(!showMore) : navigate(item.screen)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 relative transition-all active:scale-[0.92] ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
                <span className={`transition-transform ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
                <span className="text-xs font-semibold">{item.label}</span>
                {item.screen === 'settings' && MORE_ITEMS.filter(i => !i.adminOnly || isAdmin).some(i => i.screen === activeScreen) && (
                  <span className="absolute top-1.5 right-4 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
