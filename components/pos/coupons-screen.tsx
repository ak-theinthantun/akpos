'use client';

import { useState } from 'react';
import { usePOS } from '@/lib/pos-context';
import { formatCurrency, generateId, Product, Sale } from '@/lib/pos-store';
import { Check, Lock, Search, TicketPercent } from 'lucide-react';

export function CouponsScreen() {
  const { state, dispatch } = usePOS();
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponAmount, setCouponAmount] = useState('');
  const [pricePin, setPricePin] = useState('');
  const [profitUnlocked, setProfitUnlocked] = useState(false);
  const [pinError, setPinError] = useState('');
  const [saveNote, setSaveNote] = useState('');
  const isAdmin = state.currentUser?.role === 'admin';

  const selectedSale = selectedSaleId ? state.sales.find(sale => sale.id === selectedSaleId) ?? null : null;
  const existingLinkedCoupon = selectedSaleId ? state.coupons.find(coupon => coupon.sourceSaleId === selectedSaleId) ?? null : null;
  const orderProfit = selectedSale ? getSaleProfit(selectedSale, state.products) : 0;

  const filteredCoupons = state.coupons.filter(coupon => {
    if (!search) return true;
    const linkedSale = coupon.sourceSaleId ? state.sales.find(s => s.id === coupon.sourceSaleId) : null;
    const formattedCreatedAt = formatCouponDate(coupon.createdAt).toLowerCase();
    return (
      coupon.code.toLowerCase().includes(search.toLowerCase()) ||
      formattedCreatedAt.includes(search.toLowerCase()) ||
      linkedSale?.receiptNo.toLowerCase().includes(search.toLowerCase())
    );
  });

  const salesForCoupon = [...state.sales]
    .filter(sale => sale.status === 'completed')
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));

  function handleSelectSale(nextSaleId: string) {
    const nextSale = state.sales.find(sale => sale.id === nextSaleId) ?? null;
    const linkedCoupon = nextSaleId ? state.coupons.find(coupon => coupon.sourceSaleId === nextSaleId) ?? null : null;
    setSelectedSaleId(nextSaleId);
    setProfitUnlocked(false);
    setPricePin('');
    setPinError('');
    setCouponCode(linkedCoupon?.code ?? buildCouponCode(nextSale));
    setCouponAmount(linkedCoupon ? String(linkedCoupon.amount) : '');
    setSaveNote('');
  }

  function handleUnlockProfit() {
    if (pricePin === state.settings.priceLockerPassword) {
      setProfitUnlocked(true);
      setPinError('');
      setPricePin('');
      return;
    }
    setPinError('Wrong PIN. Try again.');
    setPricePin('');
  }

  function handleSaveCoupon() {
    if (!isAdmin || !selectedSale || !couponCode.trim() || !couponAmount.trim()) return;
    const amount = Number(couponAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (!profitUnlocked) {
      setSaveNote('Unlock profit first before saving this coupon.');
      return;
    }
    if (amount > orderProfit) {
      setSaveNote('Coupon amount cannot be more than the unlocked order profit.');
      return;
    }
    dispatch({
      type: 'SAVE_COUPON',
      coupon: {
        id: existingLinkedCoupon?.id ?? generateId(),
        code: couponCode.trim().toUpperCase(),
        amount,
        active: true,
        used: existingLinkedCoupon?.used ?? false,
        createdAt: existingLinkedCoupon?.createdAt ?? new Date().toISOString(),
        createdBy: existingLinkedCoupon?.createdBy ?? state.currentUser!.id,
        sourceSaleId: selectedSale.id,
      },
    });
    setSaveNote('Coupon saved for next-time one-time use.');
  }

  function closeCreateModal() {
    setShowCreateModal(false);
    setPricePin('');
    setPinError('');
    setSaveNote('');
    setProfitUnlocked(false);
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search coupon, created date, order..."
              className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Create Coupon
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filteredCoupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <TicketPercent className="w-12 h-12 text-muted-foreground mb-3 opacity-40" />
            <p className="text-muted-foreground text-sm">No coupons found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCoupons.map(coupon => {
              const linkedSale = coupon.sourceSaleId ? state.sales.find(s => s.id === coupon.sourceSaleId) : null;
              return (
                <div
                  key={coupon.id}
                  className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/[0.05] via-card to-card"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
                  <div className="absolute right-24 top-0 bottom-0 border-r border-dashed border-border/80" />
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 rounded-xl border border-primary/20 bg-primary/10 flex items-center justify-center shrink-0">
                      <TicketPercent className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div className="min-w-0 w-40 shrink-0">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-semibold">Coupon Code</p>
                      <p className="text-foreground text-sm font-bold tracking-[0.12em] truncate">{coupon.code}</p>
                    </div>
                    <div className="min-w-0 w-32 shrink-0">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-semibold">Value</p>
                      <p className="text-foreground text-sm font-semibold">
                        {formatCurrency(coupon.amount, state.settings.currencySymbol)}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-semibold">Order Reference</p>
                      <p className="text-foreground text-sm truncate">{linkedSale?.receiptNo ?? 'Manual coupon'}</p>
                    </div>
                    <div className="min-w-0 w-28 shrink-0">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-semibold">Created</p>
                      <p className="text-foreground text-sm">
                        {formatCouponDate(coupon.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 w-20 flex justify-end">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${coupon.used ? 'border border-border bg-background text-muted-foreground' : 'border border-success/20 bg-success/10 text-success'}`}>
                        {coupon.used && <Check className="w-3 h-3" />}
                        {coupon.used ? 'Used' : 'Ready'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isAdmin && showCreateModal ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-foreground">Create Coupon</p>
                <p className="text-sm text-muted-foreground">Select an order, unlock profit, then save a one-time coupon.</p>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-xl bg-secondary px-3 py-2 text-sm font-semibold text-foreground"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Order No</label>
                <select
                  value={selectedSaleId}
                  onChange={e => handleSelectSale(e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select order</option>
                  {salesForCoupon.map(sale => (
                    <option key={sale.id} value={sale.id}>
                      {sale.receiptNo} - {sale.date} {sale.time}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Price Locker PIN</label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    value={pricePin}
                    onChange={e => setPricePin(e.target.value)}
                    placeholder="Enter PIN"
                    className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={handleUnlockProfit}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground"
                  >
                    <Lock className="h-4 w-4" />
                    Unlock
                  </button>
                </div>
                {pinError ? <p className="mt-1 text-xs font-medium text-destructive">{pinError}</p> : null}
              </div>
            </div>

            {selectedSale ? (
              <div className="mt-3 rounded-2xl border border-border bg-background px-3.5 py-3">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-semibold">Order No</p>
                    <p className="font-semibold text-foreground">{selectedSale.receiptNo}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-semibold">Date</p>
                    <p className="font-semibold text-foreground">{formatDateTimeLabel(selectedSale)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-semibold">Total</p>
                    <p className="font-semibold text-foreground">{formatCurrency(selectedSale.total, state.settings.currencySymbol)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-semibold">Profit</p>
                    <p className={`font-semibold ${profitUnlocked ? 'text-success' : 'text-muted-foreground'}`}>
                      {profitUnlocked ? formatCurrency(orderProfit, state.settings.currencySymbol) : 'Locked'}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Coupon Code</label>
                <input
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="SAVE500"
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Coupon Amount</label>
                <input
                  type="number"
                  min="0"
                  max={profitUnlocked && orderProfit > 0 ? orderProfit : undefined}
                  value={couponAmount}
                  onChange={e => setCouponAmount(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {profitUnlocked ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Max allowed: {formatCurrency(orderProfit, state.settings.currencySymbol)}
                  </p>
                ) : null}
              </div>
            </div>

            {saveNote ? (
              <div className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${saveNote.includes('cannot') || saveNote.includes('Unlock')
                ? 'border border-destructive/20 bg-destructive/10 text-destructive'
                : 'border border-success/20 bg-success/10 text-success'}`}>
                {saveNote}
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">One-time use only. Customer can use it on the next purchase.</p>
              <button
                type="button"
                onClick={handleSaveCoupon}
                disabled={!selectedSale || !profitUnlocked || !couponCode.trim() || !couponAmount.trim()}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {existingLinkedCoupon ? 'Update Coupon' : 'Save Coupon'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildCouponCode(sale: Sale | null): string {
  if (!sale) return '';
  return `SALE${sale.receiptNo.replace(/\D/g, '')}`;
}

function formatCouponDate(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTimeLabel(sale: Sale): string {
  return `${formatCouponDate(`${sale.date}T00:00:00`)} ${sale.time}`;
}

function getSaleProfit(sale: Sale, products: Product[]): number {
  return sale.items.reduce((sum, item) => {
    const product = products.find(candidate => candidate.id === item.productId);
    const unitCost = product?.costPrice ?? 0;
    return sum + ((item.unitPrice - unitCost) * item.quantity) - item.discount;
  }, 0);
}
