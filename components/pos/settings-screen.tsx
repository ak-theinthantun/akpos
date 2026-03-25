'use client';

import { useState } from 'react';
import { usePOS } from '@/lib/pos-context';
import {
  Users, UserCircle, Truck, BarChart2, LogOut,
  ChevronRight, Store, Phone, MapPin,
  Receipt, Check, Lock, TicketPercent,
} from 'lucide-react';

export function SettingsScreen() {
  const { state, dispatch } = usePOS();
  const [editing, setEditing] = useState(false);
  const [shopName, setShopName] = useState(state.settings.shopName);
  const [address, setAddress] = useState(state.settings.address);
  const [phone, setPhone] = useState(state.settings.phone);
  const [footer, setFooter] = useState(state.settings.receiptFooter);
  const [posDefaultGridCols, setPosDefaultGridCols] = useState(state.settings.posDefaultGridCols ?? 4);
  const [priceLockerPin, setPriceLockerPin] = useState(state.settings.priceLockerPassword);
  const [saved, setSaved] = useState(false);

  const isAdmin = state.currentUser?.role === 'admin';

  function handleSave() {
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: {
        shopName,
        address,
        phone,
        receiptFooter: footer,
        posDefaultGridCols,
        priceLockerPassword: priceLockerPin,
      },
    });
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  }

  const inputCls = 'w-full px-3.5 py-2.5 bg-secondary border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all';

  return (
    <div className="flex flex-col flex-1 overflow-y-auto pb-6">
      {/* User info card */}
      <div className="px-4 pt-4 mb-4">
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-primary font-bold text-lg">
              {state.currentUser?.name[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-foreground font-bold text-sm">{state.currentUser?.name}</p>
            <p className="text-muted-foreground text-xs">@{state.currentUser?.username}</p>
            <span className="inline-flex mt-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold capitalize">
              {state.currentUser?.role}
            </span>
          </div>
          <button
            onClick={() => dispatch({ type: 'LOGOUT' })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-destructive/8 border border-destructive/20 text-destructive text-xs font-semibold active:scale-[0.97] transition-all"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </div>

      {/* Navigation links (admin only) */}
      {isAdmin && (
        <div className="px-4 mb-4">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-2 px-1">Management</p>
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs divide-y divide-border">
            {[
              { label: 'Users', icon: <Users className="w-4 h-4" />, screen: 'users', color: 'text-chart-4', bg: 'bg-chart-4/10' },
              { label: 'Customers', icon: <UserCircle className="w-4 h-4" />, screen: 'customers', color: 'text-info', bg: 'bg-info/10' },
              { label: 'Suppliers', icon: <Truck className="w-4 h-4" />, screen: 'suppliers', color: 'text-warning', bg: 'bg-warning/10' },
              { label: 'Coupons', icon: <TicketPercent className="w-4 h-4" />, screen: 'coupons', color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Reports', icon: <BarChart2 className="w-4 h-4" />, screen: 'reports', color: 'text-primary', bg: 'bg-primary/10' },
            ].map(item => (
              <button
                key={item.screen}
                onClick={() => dispatch({ type: 'SET_SCREEN', screen: item.screen as any })}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-secondary transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.bg}`}>
                  <span className={item.color}>{item.icon}</span>
                </div>
                <span className="flex-1 text-foreground text-sm font-medium">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Staff links */}
      {!isAdmin && (
        <div className="px-4 mb-4">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
            <button
              onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'customers' })}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                <UserCircle className="w-4 h-4 text-info" />
              </div>
              <span className="flex-1 text-foreground text-sm font-medium">Customers</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Shop settings */}
      {isAdmin && (
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Shop Settings</p>
            {editing ? (
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground font-medium px-2 py-1 rounded-lg bg-secondary">Cancel</button>
                <button onClick={handleSave} className="text-xs text-primary-foreground font-semibold px-3 py-1 rounded-lg bg-primary flex items-center gap-1">
                  <Check className="w-3 h-3" /> Save
                </button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)} className="text-xs text-primary font-semibold px-2 py-1 rounded-lg bg-primary/10">
                Edit
              </button>
            )}
          </div>

          {saved && (
            <div className="mb-3 flex items-center gap-2 px-3.5 py-2.5 bg-primary/8 border border-primary/20 rounded-xl">
              <Check className="w-4 h-4 text-primary" />
              <span className="text-primary text-xs font-semibold">Settings saved!</span>
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
            {editing ? (
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">Shop Name</label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="text" value={shopName} onChange={e => setShopName(e.target.value)} className={`${inputCls} pl-9`} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)} className={`${inputCls} pl-9`} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className={`${inputCls} pl-9`} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">Receipt Footer</label>
                  <div className="relative">
                    <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="text" value={footer} onChange={e => setFooter(e.target.value)} className={`${inputCls} pl-9`} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">Default POS Columns</label>
                  <select
                    value={posDefaultGridCols}
                    onChange={e => setPosDefaultGridCols(Number(e.target.value))}
                    className={inputCls}
                  >
                    {Array.from({ length: 11 }, (_, i) => i + 2).map(cols => (
                      <option key={cols} value={cols}>
                        {cols} columns
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">Price Locker PIN</label>
                  <p className="text-xs text-muted-foreground mb-2">4-digit PIN for admins to reveal prices</p>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                      type="text" 
                      value={priceLockerPin} 
                      onChange={e => setPriceLockerPin(e.target.value.slice(0, 4))} 
                      placeholder="0000"
                      maxLength={4}
                      className={`${inputCls} pl-9 font-mono tracking-widest text-center`} 
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {[
                  { icon: <Store className="w-4 h-4" />, label: 'Shop Name', value: state.settings.shopName },
                  { icon: <MapPin className="w-4 h-4" />, label: 'Address', value: state.settings.address },
                  { icon: <Phone className="w-4 h-4" />, label: 'Phone', value: state.settings.phone },
                  { icon: <Receipt className="w-4 h-4" />, label: 'Receipt Footer', value: state.settings.receiptFooter },
                  { icon: <Receipt className="w-4 h-4" />, label: 'Default POS Columns', value: String(state.settings.posDefaultGridCols ?? 4) },
                  { icon: <Lock className="w-4 h-4" />, label: 'Price Locker PIN', value: '••••' },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3 px-4 py-3">
                    <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-muted-foreground">{icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-muted-foreground text-xs">{label}</p>
                      <p className="text-foreground text-sm font-medium mt-0.5">{value || '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* App info */}
      <div className="px-4">
        <div className="bg-secondary/50 rounded-2xl px-4 py-3 text-center space-y-1">
          <p className="text-muted-foreground text-xs font-semibold">ShopPOS v1.0</p>
          <p className="text-muted-foreground text-xs">Web preview · Export as Expo React Native for APK</p>
          <p className="text-muted-foreground text-xs">Data: localStorage (preview) · expo-sqlite (native APK)</p>
        </div>
      </div>
    </div>
  );
}
