'use client';

import { useState } from 'react';
import { usePOS } from '@/lib/pos-context';
import { Coupon, formatCurrency, generateId, Sale } from '@/lib/pos-store';
import { ShoppingCart, ChevronRight, X, Search, Check, Lock, Printer, ImagePlus } from 'lucide-react';

export function SalesLogScreen() {
  const { state, dispatch } = usePOS();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [search, setSearch] = useState('');

  const sym = state.settings.currencySymbol;

  const filtered = state.sales.filter(s => {
    if (!search) return true;
    return (
      s.receiptNo.toLowerCase().includes(search.toLowerCase()) ||
      s.date.includes(search) ||
      s.items.some(i => i.productName.toLowerCase().includes(search.toLowerCase()))
    );
  });
  // Group by date
  const grouped: Record<string, Sale[]> = {};
  filtered.forEach(sale => {
    if (!grouped[sale.date]) grouped[sale.date] = [];
    grouped[sale.date].push(sale);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = state.sales.filter(s => s.date === todayStr && s.status === 'completed');
  const todayTotal = todaySales.reduce((s, sale) => s + sale.total, 0);

  if (selectedSale) {
    return (
      <SaleDetailView
        sale={selectedSale}
        products={state.products}
        sym={sym}
        settings={state.settings}
        customers={state.customers}
        users={state.users}
        currentUser={state.currentUser}
        coupons={state.coupons}
        priceLockerPin={state.settings.priceLockerPassword}
        onSaveCoupon={(coupon) => dispatch({ type: 'SAVE_COUPON', coupon })}
        onSaveReceipt={(record) => dispatch({ type: 'SAVE_RECEIPT_TO_GALLERY', record })}
        onClose={() => setSelectedSale(null)}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Today summary */}
      <div className="px-4 pt-4 pb-3">
        <div className="bg-primary/10 border border-primary/20 rounded-2xl px-4 py-3 flex justify-between items-center">
          <div>
            <p className="text-muted-foreground text-xs">Today's Total</p>
            <p className="text-primary font-bold text-xl">{formatCurrency(todayTotal, sym)}</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-xs">Transactions</p>
            <p className="text-foreground font-bold text-xl">{todaySales.length}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search receipt, date, product..."
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Sales list grouped by date */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {sortedDates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingCart className="w-12 h-12 text-muted-foreground mb-3 opacity-40" />
            <p className="text-muted-foreground text-sm">No sales found</p>
          </div>
        ) : null}
        {sortedDates.length > 0 && (
          sortedDates.map(date => {
            const daySales = grouped[date];
            const dayTotal = daySales.reduce((s, sale) => s + sale.total, 0);
            const isToday = date === todayStr;
            return (
              <div key={date}>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {isToday ? 'TODAY' : formatDate(date)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(dayTotal, sym)}</p>
                </div>
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  {daySales.map((sale, i) => {
                    const customer = state.customers.find(c => c.id === sale.customerId);
                    return (
                      <button
                        key={sale.id}
                        onClick={() => setSelectedSale(sale)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-secondary transition-colors ${i < daySales.length - 1 ? 'border-b border-border' : ''}`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                          <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground text-sm font-medium">{sale.receiptNo}</p>
                          <p className="text-muted-foreground text-xs">
                            {sale.time} · {sale.items.length} items
                            {customer ? ` · ${customer.name}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-bold ${sale.status === 'voided' ? 'text-destructive line-through' : 'text-primary'}`}>
                            {formatCurrency(sale.total, sym)}
                          </p>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SaleDetailView({
  sale, products, sym, settings, customers, users, currentUser, coupons, priceLockerPin, onSaveCoupon, onSaveReceipt, onClose,
}: {
  sale: Sale;
  products: import('@/lib/pos-store').Product[];
  sym: string;
  settings: import('@/lib/pos-store').StoreSettings;
  customers: import('@/lib/pos-store').Customer[];
  users: import('@/lib/pos-store').User[];
  currentUser: import('@/lib/pos-store').User | null;
  coupons: Coupon[];
  priceLockerPin: string;
  onSaveCoupon: (coupon: Coupon) => void;
  onSaveReceipt: (record: import('@/lib/pos-store').ReceiptRecord) => void;
  onClose: () => void;
}) {
  const customer = customers.find(c => c.id === sale.customerId);
  const staff = users.find(u => u.id === sale.staffId);
  const isAdmin = currentUser?.role === 'admin';
  const [showProfitLock, setShowProfitLock] = useState(false);
  const [pricePin, setPricePin] = useState('');
  const [pinError, setPinError] = useState('');
  const [profitUnlocked, setProfitUnlocked] = useState(false);
  const [couponCode, setCouponCode] = useState(`SALE${sale.receiptNo.replace(/\D/g, '')}`);
  const [couponAmount, setCouponAmount] = useState('');
  const [couponSaved, setCouponSaved] = useState(false);

  const profit = sale.items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    const unitCost = product?.costPrice ?? 0;
    return sum + ((item.unitPrice - unitCost) * item.quantity) - item.discount;
  }, 0);
  const existingOrderCoupon = coupons.find(c => c.sourceSaleId === sale.id);

  function handleUnlockProfit() {
    if (pricePin === priceLockerPin) {
      setProfitUnlocked(true);
      setPinError('');
      setShowProfitLock(false);
      setPricePin('');
      return;
    }
    setPinError('Wrong PIN. Try again.');
    setPricePin('');
  }

  function handleCreateCoupon() {
    if (!currentUser || !couponCode.trim() || !couponAmount.trim()) return;
    const coupon: Coupon = {
      id: existingOrderCoupon?.id ?? generateId(),
      code: couponCode.trim().toUpperCase(),
      amount: parseFloat(couponAmount) || 0,
      active: true,
      used: existingOrderCoupon?.used ?? false,
      createdAt: existingOrderCoupon?.createdAt ?? new Date().toISOString(),
      createdBy: existingOrderCoupon?.createdBy ?? currentUser.id,
      sourceSaleId: sale.id,
    };
    onSaveCoupon(coupon);
    setCouponSaved(true);
    setTimeout(() => setCouponSaved(false), 1800);
  }

  function handleSaveReceipt() {
    onSaveReceipt({
      id: generateId(),
      saleId: sale.id,
      receiptNo: sale.receiptNo,
      savedAt: new Date().toISOString(),
      total: sale.total,
      itemCount: sale.items.reduce((sum, item) => sum + item.quantity, 0),
      customerName: customer?.name ?? null,
    });
  }

  function handlePrintReceipt() {
    if (typeof window === 'undefined') return;
    const printWindow = window.open('', '_blank', 'width=420,height=720');
    if (!printWindow) return;
    const receiptHtml = `
      <html>
        <head>
          <title>${sale.receiptNo}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            .paper { max-width: 360px; margin: 0 auto; border: 1px solid #ddd; padding: 12px; }
            .center { text-align: center; }
            .muted { color: #666; font-size: 12px; }
            .row { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; margin: 4px 0; }
            .divider { border-top: 1px dashed #bbb; margin: 12px 0; }
            .total { font-weight: 700; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="paper">
            <div class="center">
              <div style="font-weight:700;font-size:14px;line-height:1.2;">AKPOS</div>
            </div>
            <div class="divider"></div>
            <div class="center">
              <div style="font-weight:700;font-size:14px;line-height:1.2;">${settings.shopName}</div>
              <div class="muted">${settings.address}</div>
              <div class="muted">${settings.phone}</div>
            </div>
            <div class="divider"></div>
            <div class="row"><span>Receipt No.</span><span>${sale.receiptNo}</span></div>
            <div class="row"><span>Date</span><span>${sale.date} ${sale.time}</span></div>
            <div class="row"><span>Customer</span><span>${customer?.name ?? 'Walk-in'}</span></div>
            ${staff ? `<div class="row"><span>Staff</span><span>${staff.name}</span></div>` : ''}
            <div class="divider"></div>
            ${sale.items.map(item => `
              <div style="margin: 8px 0;">
                <div style="font-size:12px;font-weight:700;">${item.productName}${item.variantLabel ? ` (${item.variantLabel})` : ''}</div>
                <div class="row"><span class="muted">${item.quantity} x ${formatCurrency(item.unitPrice, sym)}</span><span>${formatCurrency(item.total, sym)}</span></div>
              </div>
            `).join('')}
            <div class="divider"></div>
            <div class="row"><span>Subtotal</span><span>${formatCurrency(sale.subtotal, sym)}</span></div>
            <div class="row total"><span>TOTAL</span><span>${formatCurrency(sale.total, sym)}</span></div>
            <div class="row"><span>Cash</span><span>${formatCurrency(sale.amountPaid, sym)}</span></div>
            <div class="row"><span>Change</span><span>${formatCurrency(sale.change, sym)}</span></div>
            ${settings.receiptFooter ? `<div class="divider"></div><div class="center muted">${settings.receiptFooter}</div>` : ''}
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <button onClick={onClose} className="p-2 rounded-xl bg-secondary"><X className="w-4 h-4 text-foreground" /></button>
        <h2 className="font-bold text-foreground text-lg">{sale.receiptNo}</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Info */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <InfoRow label="Date" value={`${sale.date} ${sale.time}`} />
          <InfoRow label="Customer" value={customer?.name ?? 'Walk-in'} />
          <InfoRow label="Payment" value="Cash" />
          <InfoRow label="Status" value={sale.status} highlight={sale.status === 'completed' ? 'success' : 'error'} />
        </div>
        {isAdmin && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs font-semibold">PROFIT & COUPON</p>
              {!profitUnlocked && (
                <button onClick={() => setShowProfitLock(true)} className="px-3 py-1.5 rounded-xl bg-secondary text-foreground text-xs font-semibold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> View Profit
                </button>
              )}
            </div>
            {profitUnlocked ? (
              <>
                <InfoRow label="Order Profit" value={formatCurrency(profit, sym)} highlight="success" bold />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Coupon Code</label>
                    <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Coupon Amount</label>
                    <input type="number" value={couponAmount} onChange={e => setCouponAmount(e.target.value)} placeholder="0" className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground" />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">One-time use only. Customer can use it on their next purchase.</p>
                  <button onClick={handleCreateCoupon} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shrink-0">
                    {existingOrderCoupon ? 'Update Coupon' : 'Create Coupon'}
                  </button>
                </div>
                {(existingOrderCoupon || couponSaved) && (
                  <div className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>{(existingOrderCoupon?.code || couponCode).toUpperCase()} is ready for one-time use.</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Unlock price details first to see order profit and create a coupon from this order.</p>
            )}
          </div>
        )}
        {/* Items */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-muted-foreground text-xs font-semibold">ITEMS</p>
          </div>
          {sale.items.map((item, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i < sale.items.length - 1 ? 'border-b border-border' : ''}`}>
              <div className="flex-1">
                <p className="text-foreground text-sm">{item.productName}</p>
                <p className="text-muted-foreground text-xs">{item.quantity} × {formatCurrency(item.unitPrice, sym)}</p>
              </div>
              <p className="text-foreground text-sm font-medium">{formatCurrency(item.total, sym)}</p>
            </div>
          ))}
        </div>
        {/* Totals */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <InfoRow label="Subtotal" value={formatCurrency(sale.subtotal, sym)} />
          {sale.discount > 0 && <InfoRow label="Discount" value={`-${formatCurrency(sale.discount, sym)}`} highlight="error" />}
          <InfoRow label="Total" value={formatCurrency(sale.total, sym)} highlight="success" bold />
          <InfoRow label="Cash Received" value={formatCurrency(sale.amountPaid, sym)} />
          <InfoRow label="Change" value={formatCurrency(sale.change, sym)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={handleSaveReceipt} className="py-3 rounded-2xl bg-secondary text-foreground text-sm font-semibold flex items-center justify-center gap-2">
            <ImagePlus className="w-4 h-4" />
            Save to Gallery
          </button>
          <button onClick={handlePrintReceipt} className="py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2">
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>
      {showProfitLock && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowProfitLock(false)}>
          <div className="w-full max-w-xs rounded-3xl bg-card border border-border p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <h3 className="text-foreground font-bold text-base">Unlock Profit</h3>
              <p className="text-muted-foreground text-xs mt-1">Enter the price locker PIN to reveal profit.</p>
            </div>
            <input
              type="password"
              value={pricePin}
              onChange={e => { setPricePin(e.target.value); setPinError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleUnlockProfit()}
              placeholder="PIN"
              maxLength={4}
              className="w-full rounded-xl border border-border px-4 py-3 text-sm text-foreground bg-secondary text-center tracking-widest outline-none"
            />
            {pinError && <p className="text-xs text-destructive text-center">{pinError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowProfitLock(false)} className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-semibold">Cancel</button>
              <button onClick={handleUnlockProfit} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Unlock</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, highlight, bold }: { label: string; value: string; highlight?: 'success' | 'error'; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className={`text-sm ${bold ? 'font-bold' : ''} ${highlight === 'success' ? 'text-primary' : highlight === 'error' ? 'text-destructive' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}
