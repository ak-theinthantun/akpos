'use client';

import { usePOS } from '@/lib/pos-context';
import { formatCurrency, generateId, Sale, SupplierVoucher } from '@/lib/pos-store';
import { TrendingUp, DollarSign, ShoppingBag, Package, ChevronDown, ChevronUp, Wallet, Search } from 'lucide-react';
import { useState, useMemo } from 'react';

type ReportTab = 'overview' | 'daily' | 'payment' | 'stock';
type Period = 'daily' | 'monthly' | 'yearly';
type StockTab = 'empty' | 'low' | 'healthy';
type PaymentTab = 'credit' | 'outstanding';

export function ReportsScreen() {
  const { state, dispatch } = usePOS();
  const sym = state.settings.currencySymbol;
  const [tab, setTab] = useState<ReportTab>('overview');
  const [period, setPeriod] = useState<Period>('daily');
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [stockTab, setStockTab] = useState<StockTab>('healthy');
  const [paymentTab, setPaymentTab] = useState<PaymentTab>('credit');
  const [payingVoucher, setPayingVoucher] = useState<SupplierVoucher | null>(null);
  const [payingDebtSale, setPayingDebtSale] = useState<Sale | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentRemark, setPaymentRemark] = useState('');
  const [creditSearch, setCreditSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');

  const completedSales = state.sales.filter(s => s.status === 'completed');
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const periodSales = completedSales.filter(sale => {
    const saleDate = new Date(sale.date);
    if (period === 'daily') return sale.date === todayStr;
    if (period === 'monthly') return saleDate.getFullYear() === currentYear && saleDate.getMonth() === currentMonth;
    return saleDate.getFullYear() === currentYear;
  });

  const todaySales = completedSales.filter(s => s.date === todayStr);

  function calcProfit(sale: typeof completedSales[0]) {
    let cost = 0;
    sale.items.forEach(item => {
      const product = state.products.find(p => p.id === item.productId);
      cost += (product?.costPrice ?? 0) * item.quantity;
    });
    return sale.total - cost;
  }

  const totalRevenue = completedSales.reduce((s, sale) => s + sale.total, 0);
  const totalProfit = completedSales.reduce((s, sale) => s + calcProfit(sale), 0);
  const profitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;
  const periodRevenue = periodSales.reduce((s, sale) => s + sale.total, 0);
  const periodProfit = periodSales.reduce((s, sale) => s + calcProfit(sale), 0);
  const todayRevenue = todaySales.reduce((s, sale) => s + sale.total, 0);
  const todayProfit = todaySales.reduce((s, sale) => s + calcProfit(sale), 0);

  const last7 = useMemo(() => {
    const days: { day: string; revenue: number; profit: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const daySales = completedSales.filter(s => s.date === dateStr);
      days.push({ 
        day: d.toLocaleDateString('en', { weekday: 'short' }), 
        revenue: daySales.reduce((s, sale) => s + sale.total, 0),
        profit: daySales.reduce((s, sale) => s + calcProfit(sale), 0)
      });
    }
    return days;
  }, [completedSales, state.products]);

  const dailyMapByPeriod = useMemo(() => {
    const map: Record<string, { date: string; revenue: number; profit: number; count: number; sales: typeof completedSales }> = {};
    periodSales.forEach(sale => {
      if (!map[sale.date]) map[sale.date] = { date: sale.date, revenue: 0, profit: 0, count: 0, sales: [] };
      map[sale.date].revenue += sale.total;
      map[sale.date].profit += calcProfit(sale);
      map[sale.date].count += 1;
      map[sale.date].sales.push(sale);
    });
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [periodSales, state.products]);

  const supplierBalances = useMemo(() => {
    const balances = new Map<string, { id: string; name: string; grandTotal: number; paidAmount: number; balanceDue: number }>();
    (state.supplierVouchers || []).forEach(voucher => {
      const supplier = state.suppliers.find(s => s.id === voucher.supplierId);
      if (supplier) {
        const key = voucher.supplierId;
        const current = balances.get(key) || { id: key, name: supplier.name, grandTotal: 0, paidAmount: 0, balanceDue: 0 };
        current.grandTotal += voucher.grandTotal || 0;
        current.paidAmount += voucher.paidAmount || 0;
        current.balanceDue = current.grandTotal - current.paidAmount;
        balances.set(key, current);
      }
    });
    return Array.from(balances.values()).sort((a, b) => b.balanceDue - a.balanceDue);
  }, [state.supplierVouchers, state.suppliers]);

  const totalOutstandingBalance = supplierBalances.reduce((sum, b) => sum + b.balanceDue, 0);
  const unpaidVouchers = useMemo(
    () => [...state.supplierVouchers]
      .map(voucher => {
        const grandTotal = voucher.grandTotal ?? voucher.totalAmount ?? 0;
        const paidAmount = voucher.paidAmount ?? 0;
        const balanceDue = voucher.balanceDue ?? Math.max(0, grandTotal - paidAmount);
        const paymentStatus = voucher.paymentStatus ?? (balanceDue === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid');
        return { ...voucher, grandTotal, paidAmount, balanceDue, paymentStatus };
      })
      .filter(v => v.balanceDue > 0)
      .sort((a, b) => b.balanceDue - a.balanceDue),
    [state.supplierVouchers]
  );
  const creditSales = useMemo(
    () => completedSales
      .map(sale => {
        const amountPaid = sale.amountPaid ?? 0;
        const balanceDue = Math.max(0, sale.total - amountPaid);
        return {
          ...sale,
          amountPaid,
          balanceDue,
          paymentStatus: balanceDue === 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid',
          paymentHistory: sale.paymentHistory ?? [],
        };
      })
      .filter(sale => sale.paymentMethod === 'debt' && sale.customerId && sale.balanceDue > 0)
      .sort((a, b) => b.balanceDue - a.balanceDue),
    [completedSales]
  );
  const totalCreditBalance = creditSales.reduce((sum, sale) => sum + sale.balanceDue, 0);
  const filteredCreditSales = creditSales.filter(sale => {
    const customer = state.customers.find(c => c.id === sale.customerId);
    const haystack = `${customer?.name ?? ''} ${customer?.phone ?? ''} ${sale.receiptNo}`.toLowerCase();
    return haystack.includes(creditSearch.toLowerCase());
  });
  const filteredUnpaidVouchers = unpaidVouchers.filter(voucher => {
    const supplier = state.suppliers.find(s => s.id === voucher.supplierId);
    const haystack = `${supplier?.name ?? ''} ${supplier?.contact ?? ''} ${voucher.voucherNo}`.toLowerCase();
    return haystack.includes(supplierSearch.toLowerCase());
  });

  const productMap: Record<string, { name: string; qty: number; revenue: number; profit: number }> = {};
  completedSales.forEach(sale => {
    sale.items.forEach(item => {
      const product = state.products.find(p => p.id === item.productId);
      if (!productMap[item.productId]) {
        productMap[item.productId] = { name: item.productName, qty: 0, revenue: 0, profit: 0 };
      }
      productMap[item.productId].qty += item.quantity;
      productMap[item.productId].revenue += item.total;
      productMap[item.productId].profit += (item.unitPrice - (product?.costPrice ?? 0)) * item.quantity - item.discount;
    });
  });
  const bestSellers = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 8);
  const maxQty = bestSellers[0]?.qty || 1;

  // Stock calculations
  const getTotalStock = (product: typeof state.products[0]) => {
    if (product.variants.length === 0) return product.stock;
    return product.variants.reduce((total, vt) => total + vt.options.reduce((sum, opt) => sum + opt.stock, 0), 0);
  };
  
  const productsWithTotalStock = state.products.map(p => ({ ...p, totalStock: getTotalStock(p) }));
  const lowStockProducts = productsWithTotalStock.filter(p => p.totalStock > 0 && p.totalStock <= 10).sort((a, b) => a.totalStock - b.totalStock);
  const emptyStockProducts = productsWithTotalStock.filter(p => p.totalStock === 0);
  const healthyStockProducts = productsWithTotalStock.filter(p => p.totalStock > 10);

  function handleMakePayment() {
    if (!payingVoucher) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    const nextPaidAmount = Math.min(payingVoucher.paidAmount + amount, payingVoucher.grandTotal);
    const nextBalanceDue = Math.max(0, payingVoucher.grandTotal - nextPaidAmount);
    const nextStatus = nextBalanceDue === 0 ? 'paid' : nextPaidAmount > 0 ? 'partial' : 'unpaid';

    const updatedVoucher: SupplierVoucher = {
      ...payingVoucher,
      paidAmount: nextPaidAmount,
      balanceDue: nextBalanceDue,
      paymentStatus: nextStatus,
      paymentHistory: [
        {
          id: generateId(),
          date: new Date().toISOString().split('T')[0],
          amount,
          remark: paymentRemark.trim(),
          createdAt: new Date().toISOString(),
        },
        ...(payingVoucher.paymentHistory ?? []),
      ],
    };

    dispatch({ type: 'SAVE_VOUCHER', voucher: updatedVoucher });
    setPayingVoucher(null);
    setPaymentAmount('');
    setPaymentRemark('');
  }

  function handleMakeCreditPayment() {
    if (!payingDebtSale) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    const nextPaidAmount = Math.min((payingDebtSale.amountPaid ?? 0) + amount, payingDebtSale.total);
    const updatedSale: Sale = {
      ...payingDebtSale,
      amountPaid: nextPaidAmount,
      change: 0,
      paymentHistory: [
        {
          id: generateId(),
          date: new Date().toISOString().split('T')[0],
          amount,
          remark: paymentRemark.trim(),
          createdAt: new Date().toISOString(),
        },
        ...(payingDebtSale.paymentHistory ?? []),
      ],
    };

    dispatch({ type: 'SAVE_SALE', sale: updatedSale });
    setPayingDebtSale(null);
    setPaymentAmount('');
    setPaymentRemark('');
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex gap-1.5 px-4 pt-4 pb-3 shrink-0 border-b border-border overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {(['overview', 'daily', 'payment', 'stock'] as ReportTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              tab === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}>
            {t === 'daily' ? 'Daily Log' : t === 'payment' ? 'Payment' : t === 'stock' ? 'Stock' : 'Overview'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="px-4 pt-4 pb-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-muted-foreground text-xs">Today Revenue</span>
                </div>
                <p className="text-foreground font-bold text-xl">{formatCurrency(todayRevenue, sym)}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-success" />
                  </div>
                  <span className="text-muted-foreground text-xs">Today Profit</span>
                </div>
                <p className="text-foreground font-bold text-xl">{formatCurrency(todayProfit, sym)}</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-muted-foreground text-xs mb-3">Last 7 Days Revenue</p>
              <div className="flex items-end justify-between gap-1 h-24">
                {last7.map((d, i) => {
                  const maxRev = Math.max(...last7.map(x => x.revenue), 1);
                  const h = (d.revenue / maxRev) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-primary/20 rounded-t-sm relative" style={{ height: `${Math.max(h, 4)}%` }}>
                        <div className="absolute inset-0 bg-primary rounded-t-sm" style={{ height: '100%' }} />
                      </div>
                      <span className="text-muted-foreground text-xs">{d.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-muted-foreground text-xs">Best Sellers</p>
                <span className="text-muted-foreground text-xs">{bestSellers.length} products</span>
              </div>
              <div className="space-y-2">
                {bestSellers.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs w-4">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-foreground text-sm font-medium line-clamp-1">{p.name}</p>
                      <div className="h-1.5 bg-secondary rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(p.qty / maxQty) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-foreground font-semibold text-sm">{p.qty}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-muted-foreground text-xs mb-1">Total Revenue</p>
                <p className="text-foreground font-bold text-lg">{formatCurrency(totalRevenue, sym)}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-muted-foreground text-xs mb-1">Profit Margin</p>
                <p className="text-foreground font-bold text-lg">{profitMargin}%</p>
              </div>
            </div>
          </div>
        )}

        {/* DAILY LOG TAB */}
        {tab === 'daily' && (
          <div className="px-4 pt-4 pb-6">
            <div className="flex gap-2 mb-4">
              {(['daily', 'monthly', 'yearly'] as Period[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    period === p ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}>{p}</button>
              ))}
            </div>

            <div className="bg-card border border-border rounded-2xl p-4 mb-4">
              <p className="text-muted-foreground text-xs mb-2 uppercase tracking-wide">
                {period === 'daily' ? new Date(todayStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                  : period === 'monthly' ? new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                  : `Year ${currentYear}`}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-foreground font-bold text-xl">{formatCurrency(periodRevenue, sym)}</p>
                  <p className="text-muted-foreground text-xs">Revenue</p>
                </div>
                <div>
                  <p className="text-success font-bold text-xl">{formatCurrency(periodProfit, sym)}</p>
                  <p className="text-muted-foreground text-xs">Profit</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {dailyMapByPeriod.map(day => (
                <div key={day.date} className="bg-card border border-border rounded-xl overflow-hidden">
                  <button onClick={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
                    className="w-full flex items-center justify-between p-3 text-left">
                    <div>
                      <p className="text-foreground font-semibold text-sm">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                      <p className="text-muted-foreground text-xs">{day.count} sales</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-foreground font-bold text-sm">{formatCurrency(day.revenue, sym)}</p>
                        <p className="text-success text-xs">{formatCurrency(day.profit, sym)} profit</p>
                      </div>
                      {expandedDay === day.date ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>
                  {expandedDay === day.date && (
                    <div className="border-t border-border px-3 py-2 space-y-2 bg-secondary/30">
                      {day.sales.map(sale => (
                        <div key={sale.id} className="flex items-center justify-between py-1.5">
                          <div>
                            <p className="text-foreground text-sm">{sale.time}</p>
                            <p className="text-muted-foreground text-xs">{sale.items.length} items</p>
                          </div>
                          <p className="text-foreground font-semibold text-sm">{formatCurrency(sale.total, sym)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {dailyMapByPeriod.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <ShoppingBag className="w-10 h-10 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-sm">No sales in this period</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PAYMENT TAB */}
        {tab === 'payment' && (
          <div className="px-4 pt-4 pb-6">
            <div className="flex gap-2 mb-4 rounded-2xl border border-border bg-card p-1.5">
              <button onClick={() => setPaymentTab('credit')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-colors ${
                  paymentTab === 'credit' ? 'bg-background text-foreground border border-border shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}>Credit ({filteredCreditSales.length})</button>
              <button onClick={() => setPaymentTab('outstanding')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-colors ${
                  paymentTab === 'outstanding' ? 'bg-background text-foreground border border-border shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}>Outstanding ({filteredUnpaidVouchers.length})</button>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5 text-warning" />
                <span className="text-muted-foreground text-sm">
                  {paymentTab === 'credit' ? 'Customer Credit' : 'Outstanding Supplier Balance'}
                </span>
              </div>
              <p className="text-foreground font-bold text-2xl">
                {formatCurrency(paymentTab === 'credit' ? totalCreditBalance : totalOutstandingBalance, sym)}
              </p>
            </div>

            {paymentTab === 'credit' && (
              <>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={creditSearch}
                    onChange={e => setCreditSearch(e.target.value)}
                    placeholder="Search customer..."
                    className="w-full rounded-2xl border border-border bg-card pl-9 pr-4 py-3 text-sm text-foreground"
                  />
                </div>
                {filteredCreditSales.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Wallet className="w-10 h-10 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-sm">No customer credit found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredCreditSales.map(sale => {
                      const customer = state.customers.find(c => c.id === sale.customerId);
                      return (
                        <div key={sale.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-foreground font-semibold text-sm">{sale.receiptNo}</p>
                              <p className="text-muted-foreground text-xs mt-0.5">{customer?.name ?? 'Unknown Customer'} • {sale.date}</p>
                              <p className="text-muted-foreground text-xs mt-1">Paid: {formatCurrency(sale.amountPaid, sym)} / {formatCurrency(sale.total, sym)}</p>
                            </div>
                            <div className="text-right">
                              <span className={`inline-flex px-2 py-1 rounded-full text-[11px] font-semibold mb-1 ${
                                sale.paymentStatus === 'partial' ? 'bg-warning/15 text-warning' : 'bg-secondary text-muted-foreground'
                              }`}>
                                {sale.paymentStatus === 'partial' ? 'Partial' : 'Unpaid'}
                              </span>
                              <p className="text-[11px] text-muted-foreground font-medium">Balance</p>
                              <p className="font-bold text-sm text-warning">{formatCurrency(sale.balanceDue, sym)}</p>
                            </div>
                          </div>

                          {(sale.paymentHistory ?? []).length > 0 && (
                            <div className="rounded-xl bg-secondary/50 border border-border px-3 py-2.5 space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground">Recent Payments</p>
                              {(sale.paymentHistory ?? []).slice(0, 3).map(record => (
                                <div key={record.id} className="flex items-start justify-between gap-2 text-xs">
                                  <div>
                                    <p className="text-foreground font-medium">{record.date}</p>
                                    <p className="text-muted-foreground">{record.remark || 'No remark'}</p>
                                  </div>
                                  <p className="text-success font-semibold">{formatCurrency(record.amount, sym)}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          <button
                            onClick={() => {
                              setPayingDebtSale(sale as Sale);
                              setPaymentAmount(String(sale.balanceDue));
                              setPaymentRemark('');
                            }}
                            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
                          >
                            Receive Payment
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {paymentTab === 'outstanding' && (
              <>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={supplierSearch}
                    onChange={e => setSupplierSearch(e.target.value)}
                    placeholder="Search supplier..."
                    className="w-full rounded-2xl border border-border bg-card pl-9 pr-4 py-3 text-sm text-foreground"
                  />
                </div>
                {filteredUnpaidVouchers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Wallet className="w-10 h-10 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-sm">No outstanding balances</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredUnpaidVouchers.map(voucher => {
                  const supplier = state.suppliers.find(s => s.id === voucher.supplierId);
                  return (
                    <div key={voucher.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-foreground font-semibold text-sm">{voucher.voucherNo}</p>
                          <p className="text-muted-foreground text-xs mt-0.5">{supplier?.name ?? 'Unknown Supplier'} • {voucher.date}</p>
                          <p className="text-muted-foreground text-xs mt-1">Paid: {formatCurrency(voucher.paidAmount, sym)} / {formatCurrency(voucher.grandTotal, sym)}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex px-2 py-1 rounded-full text-[11px] font-semibold mb-1 ${
                            voucher.paymentStatus === 'paid'
                              ? 'bg-success/15 text-success'
                              : voucher.paymentStatus === 'partial'
                                ? 'bg-warning/15 text-warning'
                                : 'bg-secondary text-muted-foreground'
                          }`}>
                            {voucher.paymentStatus === 'paid' ? 'Paid' : voucher.paymentStatus === 'partial' ? 'Partial' : 'Unpaid'}
                          </span>
                          <p className="text-[11px] text-muted-foreground font-medium">Balance</p>
                          <p className="font-bold text-sm text-warning">{formatCurrency(voucher.balanceDue, sym)}</p>
                        </div>
                      </div>

                      {(voucher.paymentHistory ?? []).length > 0 && (
                        <div className="rounded-xl bg-secondary/50 border border-border px-3 py-2.5 space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground">Recent Payments</p>
                          {(voucher.paymentHistory ?? []).slice(0, 3).map(record => (
                            <div key={record.id} className="flex items-start justify-between gap-2 text-xs">
                              <div>
                                <p className="text-foreground font-medium">{record.date}</p>
                                <p className="text-muted-foreground">{record.remark || 'No remark'}</p>
                              </div>
                              <p className="text-success font-semibold">{formatCurrency(record.amount, sym)}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setPayingVoucher(voucher);
                          setPaymentAmount(String(voucher.balanceDue));
                          setPaymentRemark('');
                        }}
                        className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
                      >
                        Make Payment
                      </button>
                    </div>
                  );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* STOCK TAB */}
        {tab === 'stock' && (
          <div className="px-4 pt-4 pb-6">
            <div className="flex gap-2 mb-4 rounded-2xl border border-border bg-card p-1.5">
              <button onClick={() => setStockTab('empty')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-colors ${
                  stockTab === 'empty'
                    ? 'bg-background text-foreground border border-border shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}>Empty ({emptyStockProducts.length})</button>
              <button onClick={() => setStockTab('low')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-colors ${
                  stockTab === 'low'
                    ? 'bg-background text-foreground border border-border shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}>Low ({lowStockProducts.length})</button>
              <button onClick={() => setStockTab('healthy')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-colors ${
                  stockTab === 'healthy'
                    ? 'bg-background text-foreground border border-border shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}>Healthy ({healthyStockProducts.length})</button>
            </div>

            <div className="space-y-2">
              {stockTab === 'empty' && emptyStockProducts.map(product => {
                const cat = state.categories.find(c => c.id === product.categoryId);
                return (
                  <div key={product.id} className="bg-card border border-destructive/20 rounded-2xl p-3.5 flex items-center gap-3">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-14 h-14 object-cover rounded-xl shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: (cat?.color || '#22c55e') + '20' }}>
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-semibold text-sm line-clamp-1">{product.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {cat && <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: cat.color + '25', color: cat.color }}>{cat.name}</span>}
                        <span className="text-xs text-muted-foreground">{formatCurrency(product.price, sym)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 min-w-20">
                      <p className="text-[11px] text-muted-foreground font-medium">Available</p>
                      <div className="bg-destructive/20 text-destructive px-2.5 py-1 rounded-lg text-xs font-bold mt-1">0 units</div>
                    </div>
                  </div>
                );
              })}

              {stockTab === 'low' && lowStockProducts.map(product => {
                const cat = state.categories.find(c => c.id === product.categoryId);
                return (
                  <div key={product.id} className="bg-card border border-warning/20 rounded-2xl p-3.5 flex items-center gap-3">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-14 h-14 object-cover rounded-xl shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: (cat?.color || '#22c55e') + '20' }}>
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-semibold text-sm line-clamp-1">{product.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {cat && <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: cat.color + '25', color: cat.color }}>{cat.name}</span>}
                        <span className="text-xs text-muted-foreground">{formatCurrency(product.price, sym)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 min-w-20">
                      <p className="text-[11px] text-muted-foreground font-medium">Available</p>
                      <div className="bg-warning/20 text-warning px-2.5 py-1 rounded-lg text-xs font-bold mt-1">{product.totalStock} units</div>
                    </div>
                  </div>
                );
              })}

              {stockTab === 'healthy' && healthyStockProducts.map(product => {
                const cat = state.categories.find(c => c.id === product.categoryId);
                return (
                  <div key={product.id} className="bg-card border border-success/20 rounded-2xl p-3.5 flex items-center gap-3">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-14 h-14 object-cover rounded-xl shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: (cat?.color || '#22c55e') + '20' }}>
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-semibold text-sm line-clamp-1">{product.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {cat && <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: cat.color + '25', color: cat.color }}>{cat.name}</span>}
                        <span className="text-xs text-muted-foreground">{formatCurrency(product.price, sym)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 min-w-20">
                      <p className="text-[11px] text-muted-foreground font-medium">Available</p>
                      <div className="bg-success/20 text-success px-2.5 py-1 rounded-lg text-xs font-bold mt-1">{product.totalStock} units</div>
                    </div>
                  </div>
                );
              })}

              {stockTab === 'empty' && emptyStockProducts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">No empty stock products</div>
              )}
              {stockTab === 'low' && lowStockProducts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">No low stock products</div>
              )}
              {stockTab === 'healthy' && healthyStockProducts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">No healthy stock products</div>
              )}
            </div>
          </div>
        )}
      </div>

      {payingVoucher && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPayingVoucher(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border shadow-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-foreground font-bold text-lg">Make Payment</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {payingVoucher.voucherNo} • Balance {formatCurrency(payingVoucher.balanceDue, sym)}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Amount</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm"
                  placeholder="Enter payment amount"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Remark</label>
                <textarea
                  value={paymentRemark}
                  onChange={e => setPaymentRemark(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm resize-none"
                  rows={3}
                  placeholder="Optional remark for this payment"
                />
              </div>
              <p className="text-xs text-muted-foreground">Payment date will be saved as today.</p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setPayingVoucher(null)} className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-semibold">
                Cancel
              </button>
              <button onClick={handleMakePayment} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
                Save Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {payingDebtSale && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPayingDebtSale(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border shadow-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-foreground font-bold text-lg">Receive Payment</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {payingDebtSale.receiptNo} • Balance {formatCurrency(Math.max(0, payingDebtSale.total - (payingDebtSale.amountPaid ?? 0)), sym)}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Amount</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm"
                  placeholder="Enter payment amount"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Remark</label>
                <textarea
                  value={paymentRemark}
                  onChange={e => setPaymentRemark(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm resize-none"
                  rows={3}
                  placeholder="Optional remark for this payment"
                />
              </div>
              <p className="text-xs text-muted-foreground">Payment date will be saved as today.</p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setPayingDebtSale(null)} className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-semibold">
                Cancel
              </button>
              <button onClick={handleMakeCreditPayment} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
                Save Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
