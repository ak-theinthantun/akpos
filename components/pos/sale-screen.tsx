'use client';

import { usePOS } from '@/lib/pos-context';
import { PriceLock } from '@/components/pos/wholesale-lock';
import { cartKey, formatCurrency, generateId, getVariantLabel, Product, Sale, SaleItem } from '@/lib/pos-store';
import { Search, ShoppingCart, Plus, Minus, Trash2, X, Receipt, Layers3, CalendarClock, Lock } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

function getProductStock(product: Product) {
  return product.variants.length > 0
    ? product.variants.reduce((t, vt) => t + vt.options.reduce((s, o) => s + o.stock, 0), 0)
    : product.stock;
}

export function POSScreen() {
  const { state, dispatch } = usePOS();
  const isAdmin = state.currentUser?.role === 'admin';
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [gridCols, setGridCols] = useState(state.settings.posDefaultGridCols ?? 4);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [expandedCartKey, setExpandedCartKey] = useState<string | null>(null);
  const [amountReceived, setAmountReceived] = useState('');
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [variantSelections, setVariantSelections] = useState<Record<string, string>>({});
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCouponId, setAppliedCouponId] = useState<string | null>(null);
  const [couponError, setCouponError] = useState('');
  const amountReceivedRef = useRef<HTMLInputElement>(null);

  const sym = state.settings.currencySymbol;
  const priceLockerPin = state.settings.priceLockerPassword;
  const cart = state.cart || [];
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cart.reduce((s, i) => s + (i.unitPrice * i.quantity), 0);
  const appliedCoupon = appliedCouponId ? state.coupons.find(c => c.id === appliedCouponId) ?? null : null;
  const couponDiscount = appliedCoupon ? Math.min(appliedCoupon.amount, subtotal) : 0;
  const cartTotal = Math.max(0, subtotal - couponDiscount);
  const amountReceivedNumber = parseFloat(amountReceived) || 0;
  const change = Math.max(0, amountReceivedNumber - cartTotal);
  const remaining = Math.max(0, cartTotal - amountReceivedNumber);
  const daySession = state.daySession;
  const selectedCustomer = state.selectedCustomer;
  const isCreditSale = !!selectedCustomer && remaining > 0;
  const canCompleteSale = cart.length > 0 && (selectedCustomer ? amountReceivedNumber >= 0 : amountReceivedNumber >= cartTotal);
  const completedSaleSaved = completedSale ? state.receiptGallery.some(record => record.saleId === completedSale.id) : false;
  const selectedCustomerCredit = selectedCustomer
    ? state.sales.reduce((sum, sale) => {
        if (sale.customerId !== selectedCustomer.id || sale.paymentMethod !== 'debt' || sale.status !== 'completed') return sum;
        return sum + Math.max(0, sale.total - (sale.amountPaid ?? 0));
      }, 0)
    : 0;

  useEffect(() => {
    if (!showCart) return;
    setAmountReceived(String(cartTotal));
    setTimeout(() => {
      amountReceivedRef.current?.focus();
      amountReceivedRef.current?.select();
    }, 60);
  }, [showCart, cartTotal]);

  useEffect(() => {
    if (!appliedCoupon) return;
    if (appliedCoupon.used || !appliedCoupon.active) {
      setAppliedCouponId(null);
      setCouponCode('');
    }
  }, [appliedCoupon]);

  useEffect(() => {
    if (!appliedCoupon) return;
    if (subtotal < appliedCoupon.amount) {
      setAppliedCouponId(null);
      setCouponCode('');
      setCouponError('Coupon removed because cart total is less than coupon amount.');
    }
  }, [appliedCoupon, subtotal]);

  useEffect(() => {
    setGridCols(state.settings.posDefaultGridCols ?? 4);
  }, [state.settings.posDefaultGridCols]);

  const filteredProducts = useMemo(() => {
    return state.products.filter(p => {
      const matchCat = selectedCat === 'all' || p.categoryId === selectedCat;
      const matchSearch = search === '' || p.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch && p.active;
    });
  }, [state.products, selectedCat, search]);

  const handleProductClick = (product: Product) => {
    if (product.variants.length > 0) {
      setVariantProduct(product);
      setVariantSelections({});
    } else {
      dispatch({ type: 'ADD_TO_CART', product });
    }
  };

  const allVariantsSelected = variantProduct
    ? variantProduct.variants.every(vt => variantSelections[vt.id])
    : false;
  const selectedVariantAdjustment = variantProduct
    ? (variantProduct.variants[0]?.options.find(opt => opt.id === variantSelections[variantProduct.variants[0]?.id])?.priceAdjust ?? 0)
    : 0;
  const selectedVariantPrice = variantProduct
    ? variantProduct.price + selectedVariantAdjustment
    : 0;

  const handleAddVariant = () => {
    if (!variantProduct || !allVariantsSelected) return;
    const firstVt = variantProduct.variants[0];
    dispatch({
      type: 'ADD_TO_CART',
      product: variantProduct,
      variant: { typeId: firstVt.id, optionId: variantSelections[firstVt.id] },
    });
    setVariantProduct(null);
    setVariantSelections({});
  };

  const handleCompleteSale = () => {
    if (cart.length === 0) return;
    if (!selectedCustomer && amountReceivedNumber < cartTotal) return;
    const received = Math.max(0, parseFloat(amountReceived) || 0);
    const paymentMethod = isCreditSale ? 'debt' : 'cash';
    const items: SaleItem[] = cart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      variantLabel: getVariantLabel(item.product, item.selectedVariant) || null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      total: (item.unitPrice * item.quantity) - item.discount,
    }));
    const sale: Sale = {
      id: 'sale_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      sessionId: state.daySession?.id ?? null,
      items,
      subtotal,
      discount: couponDiscount,
      total: cartTotal,
      paymentMethod,
      amountPaid: received,
      change: !isCreditSale ? Math.max(0, received - cartTotal) : 0,
      customerId: selectedCustomer?.id ?? null,
      staffId: state.currentUser?.id ?? '',
      status: 'completed',
      receiptNo: 'R' + String(state.sales.length + 1).padStart(4, '0'),
      couponCode: appliedCoupon?.code ?? null,
      couponDiscount,
      paymentHistory: [],
    };
    dispatch({ type: 'COMPLETE_SALE', sale });
    if (appliedCoupon) {
      dispatch({ type: 'MARK_COUPON_USED', id: appliedCoupon.id });
    }
    setShowCart(false);
    setExpandedCartKey(null);
    setAmountReceived('');
    setCouponCode('');
    setAppliedCouponId(null);
    setCouponError('');
    setShowCouponForm(false);
    setCompletedSale(sale);
  };

  const handleApplyCoupon = () => {
    const normalizedCode = couponCode.trim().toUpperCase();
    if (!normalizedCode) return;
    const match = state.coupons.find(c => c.code.toUpperCase() === normalizedCode);
    if (!match) {
      setCouponError('Coupon code not found.');
      setAppliedCouponId(null);
      return;
    }
    if (!match.active || match.used) {
      setCouponError('This coupon is no longer available.');
      setAppliedCouponId(null);
      return;
    }
    if (subtotal < match.amount) {
      setCouponError('Cart total must be equal to or greater than coupon amount.');
      setAppliedCouponId(null);
      return;
    }
    setAppliedCouponId(match.id);
    setCouponCode(match.code);
    setCouponError('');
  };

  const handleRemoveCoupon = () => {
    setAppliedCouponId(null);
    setCouponCode('');
    setCouponError('');
  };

  const handleGridColsChange = (nextCols: number) => {
    setGridCols(nextCols);
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: { posDefaultGridCols: nextCols },
    });
  };

  const handleSaveReceiptToGallery = () => {
    if (!completedSale) return;
    const customer = state.customers.find(c => c.id === completedSale.customerId);
    const staff = state.users.find(u => u.id === completedSale.staffId);
    dispatch({
      type: 'SAVE_RECEIPT_TO_GALLERY',
      record: {
        id: generateId(),
        saleId: completedSale.id,
        receiptNo: completedSale.receiptNo,
        savedAt: new Date().toISOString(),
        total: completedSale.total,
        itemCount: completedSale.items.reduce((sum, item) => sum + item.quantity, 0),
        customerName: customer?.name ?? null,
      },
    });

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const svg = buildReceiptSvg({
        receiptNo: completedSale.receiptNo,
        dateTime: `${completedSale.date} ${completedSale.time}`,
        shopName: state.settings.shopName,
        address: state.settings.address,
        phone: state.settings.phone,
        customerName: customer?.name ?? null,
        staffName: staff?.name ?? null,
        items: completedSale.items.map(item => ({
          name: `${item.productName}${item.variantLabel ? ` (${item.variantLabel})` : ''}`,
          meta: `${item.quantity} x ${formatCurrency(item.unitPrice, sym)}`,
          total: formatCurrency(item.total, sym),
        })),
        subtotal: formatCurrency(completedSale.subtotal, sym),
        couponLine: completedSale.couponCode
          ? `Coupon (${completedSale.couponCode}) -${formatCurrency(completedSale.couponDiscount ?? 0, sym)}`
          : null,
        total: formatCurrency(completedSale.total, sym),
        cash: formatCurrency(completedSale.amountPaid, sym),
        change: formatCurrency(completedSale.change, sym),
        footer: state.settings.receiptFooter || null,
      });

      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${completedSale.receiptNo.toLowerCase()}-invoice.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handlePrintReceipt = () => {
    if (!completedSale || typeof window === 'undefined') return;
    const customer = state.customers.find(c => c.id === completedSale.customerId);
    const staff = state.users.find(u => u.id === completedSale.staffId);
    const printWindow = window.open('', '_blank', 'width=420,height=720');
    if (!printWindow) return;
    const receiptHtml = `
      <html>
        <head>
          <title>${completedSale.receiptNo}</title>
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
              <div style="font-weight:700;font-size:14px;line-height:1.2;">${state.settings.shopName}</div>
              <div class="muted">${state.settings.address}</div>
              <div class="muted">${state.settings.phone}</div>
            </div>
            <div class="divider"></div>
            <div class="row"><span>Receipt No.</span><span>${completedSale.receiptNo}</span></div>
            <div class="row"><span>Date</span><span>${completedSale.date} ${completedSale.time}</span></div>
            ${customer ? `<div class="row"><span>Customer</span><span>${customer.name}</span></div>` : ''}
            ${staff ? `<div class="row"><span>Staff</span><span>${staff.name}</span></div>` : ''}
            <div class="divider"></div>
            ${completedSale.items.map(item => `
              <div style="margin: 8px 0;">
                <div style="font-size:12px;font-weight:700;">${item.productName}${item.variantLabel ? ` (${item.variantLabel})` : ''}</div>
                <div class="row"><span class="muted">${item.quantity} x ${formatCurrency(item.unitPrice, sym)}</span><span>${formatCurrency(item.total, sym)}</span></div>
              </div>
            `).join('')}
            <div class="divider"></div>
            <div class="row"><span>Subtotal</span><span>${formatCurrency(completedSale.subtotal, sym)}</span></div>
            ${completedSale.couponCode ? `<div class="row"><span>Coupon (${completedSale.couponCode})</span><span>-${formatCurrency(completedSale.couponDiscount ?? 0, sym)}</span></div>` : ''}
            <div class="row total"><span>TOTAL</span><span>${formatCurrency(completedSale.total, sym)}</span></div>
            <div class="row"><span>Cash</span><span>${formatCurrency(completedSale.amountPaid, sym)}</span></div>
            <div class="row"><span>Change</span><span>${formatCurrency(completedSale.change, sym)}</span></div>
            ${state.settings.receiptFooter ? `<div class="divider"></div><div class="center muted">${state.settings.receiptFooter}</div>` : ''}
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {!daySession && (
        <div className="flex-1 flex items-center justify-center px-4 py-6">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-warning" />
            </div>
            <h2 className="text-foreground text-xl font-bold">Open Day First</h2>
            <p className="text-muted-foreground text-sm mt-2">
              Start a day session before using the Sale POS screen.
            </p>
            <button
              onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'day-session' })}
              className="mt-5 w-full rounded-2xl bg-primary text-primary-foreground py-3.5 font-semibold text-sm flex items-center justify-center gap-2"
            >
              <CalendarClock className="w-4 h-4" />
              Open Day Session
            </button>
          </div>
        </div>
      )}

      {daySession && (
        <div className="flex flex-1 min-h-0 flex-col">
      <div className="px-4 py-3 border-b border-border bg-card space-y-3">
        <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2.5">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground" />
          {search && (
            <button onClick={() => setSearch('')} className="text-xs font-semibold text-muted-foreground hover:text-foreground">Clear</button>
          )}
        </div>
        <div className="flex items-center gap-2 pb-1">
          <div className="flex-1 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              <button onClick={() => setSelectedCat('all')} className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${selectedCat === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>All Products</button>
              {state.categories.map(cat => (
                <button key={cat.id} onClick={() => setSelectedCat(cat.id)} className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${selectedCat === cat.id ? 'text-white shadow-sm' : 'bg-secondary text-muted-foreground'}`} style={selectedCat === cat.id ? { backgroundColor: cat.color } : {}}>{cat.name}</button>
              ))}
            </div>
          </div>
          <div className="shrink-0">
            <select
              value={gridCols}
              onChange={e => handleGridColsChange(Number(e.target.value))}
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Grid columns"
              title="Grid columns"
            >
              {Array.from({ length: 11 }, (_, i) => i + 2).map(cols => (
                <option key={cols} value={cols}>
                  {cols} cols
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
          {filteredProducts.map(product => {
            const cat = state.categories.find(c => c.id === product.categoryId);
            const totalStock = getProductStock(product);
            const outOfStock = totalStock === 0;
            const lowStock = totalStock > 0 && totalStock <= 10;
            const variantCount = product.variants.reduce((t, vt) => t + vt.options.length, 0);
            return (
              <button
                key={product.id}
                onClick={() => !outOfStock && handleProductClick(product)}
                disabled={outOfStock}
                className={`bg-card border rounded-md p-1 text-left transition-all relative overflow-hidden ${outOfStock ? 'border-border opacity-60 cursor-not-allowed' : 'border-border hover:border-primary/40 active:scale-[0.98]'}`}
              >
                <div className="relative aspect-square overflow-hidden rounded-sm mb-1">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: (cat?.color || '#888') + '15' }}>
                      <span className="text-2xl font-bold" style={{ color: cat?.color || '#888' }}>{product.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="absolute left-1 top-1 right-1 flex items-start justify-between gap-1">
                    <span className={`text-xs font-medium ${outOfStock ? 'bg-destructive text-white' : lowStock ? 'bg-warning text-black' : 'bg-card/95 text-foreground'}`}>
                      {outOfStock ? 'Out of stock' : lowStock ? `Low ${totalStock}` : `${totalStock} in stock`}
                    </span>
                    {product.variants.length > 0 && (
                      <span className="inline-flex items-center gap-1 bg-primary/10 text-xs font-medium text-primary">
                        <Layers3 className="w-3 h-3" />
                        {variantCount}
                      </span>
                    )}
                  </div>
                  <div className="absolute left-1 right-1 bottom-1">
                    <p className="line-clamp-2 bg-card/92 text-sm font-semibold leading-tight text-foreground">
                      {product.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1 px-0.5 pb-0.5">
                  <p className="text-xs font-medium text-primary">{formatCurrency(product.price, sym)}</p>
                  <p className="text-xs text-muted-foreground">{product.unitId ? state.units.find(unit => unit.id === product.unitId)?.abbreviation : ''}</p>
                </div>
                {outOfStock && <div className="absolute inset-0 bg-background/40 rounded-md" />}
              </button>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-secondary mx-auto mb-4 flex items-center justify-center">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-foreground font-bold text-lg">No products found</h3>
            <p className="text-muted-foreground text-sm mt-1">Try another search term or switch the category filter.</p>
          </div>
        )}
      </div>

      {!showCart && cart.length > 0 && (
        <div className="px-4 pb-4">
          <button onClick={() => setShowCart(true)} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3.5 font-bold text-sm flex items-center justify-between gap-3 shadow-lg shadow-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-foreground/15 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p>Review Cart</p>
                <p className="text-primary-foreground/80 text-xs font-semibold">{cartCount} item{cartCount === 1 ? '' : 's'} ready</p>
              </div>
            </div>
            <span className="text-base">{formatCurrency(cartTotal, sym)}</span>
          </button>
        </div>
      )}

      {showCart && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowCart(false)}>
          <div className="absolute inset-0 bg-card flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="border-b border-border px-4 py-4 md:px-6 md:py-5 flex items-center justify-between bg-card">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground font-semibold">Sale Voucher</p>
                <h2 className="text-foreground font-bold text-xl">Cart Review</h2>
                <p className="text-muted-foreground text-sm">{cartCount} item{cartCount === 1 ? '' : 's'} in this sale</p>
              </div>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <div className="relative group">
                    <button
                      onClick={() => {
                        dispatch({ type: 'CLEAR_CART' });
                        setShowCart(false);
                        setExpandedCartKey(null);
                        setCouponCode('');
                        setAppliedCouponId(null);
                        setCouponError('');
                        setShowCouponForm(false);
                      }}
                      className="w-9 h-9 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive flex items-center justify-center"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                    <div className="pointer-events-none absolute right-0 top-full z-10 mt-1 hidden whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background shadow-sm group-hover:block">
                      Clear all
                    </div>
                  </div>
                )}
                <div className="relative group">
                  <button onClick={() => setShowCart(false)} className="w-9 h-9 rounded-xl border border-primary/20 bg-primary/10 text-primary flex items-center justify-center">
                    <ShoppingCart className="w-4.5 h-4.5" />
                  </button>
                  <div className="pointer-events-none absolute right-0 top-full z-10 mt-1 hidden whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background shadow-sm group-hover:block">
                    Back to sale
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 md:grid md:grid-cols-[1.45fr_0.95fr]">
              <div className="min-h-0 border-b border-border md:border-b-0 md:border-r bg-background">
                <div className="px-4 py-3 md:px-6 md:py-4 flex items-center gap-2 border-b border-border bg-background/90">
                  <div className="rounded-xl bg-secondary px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Items</p>
                    <p className="text-sm font-bold text-foreground">{cartCount}</p>
                  </div>
                  <div className="rounded-xl bg-secondary px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Subtotal</p>
                    <p className="text-sm font-bold text-foreground">{formatCurrency(subtotal, sym)}</p>
                  </div>
                  <div className="rounded-xl bg-primary/10 px-3 py-2 border border-primary/15">
                    <p className="text-[11px] uppercase tracking-wide text-primary/80 font-semibold">Due</p>
                    <p className="text-sm font-bold text-primary">{formatCurrency(cartTotal, sym)}</p>
                  </div>
                </div>

                <div className="h-full overflow-y-auto px-4 py-3 md:px-6 space-y-2">
                  {cart.map(item => {
                    const key = cartKey(item.product.id, item.selectedVariant);
                    const total = (item.unitPrice * item.quantity) - item.discount;
                    const variantLabel = getVariantLabel(item.product, item.selectedVariant);
                    const primaryVariantType = item.product.variants[0];
                    const showVariantEditor = expandedCartKey === key && !!primaryVariantType;
                    return (
                      <div key={key} className="rounded-lg overflow-hidden border border-slate-300/80 bg-slate-50/70 dark:border-border dark:bg-card">
                        <div className="flex items-center gap-3 px-3 py-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-left w-full">
                              <p className="text-foreground text-sm font-semibold leading-tight line-clamp-1">{item.product.name}</p>
                              {variantLabel && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-xs border border-border bg-background px-1.5 py-0.5 rounded-sm font-medium text-foreground">{variantLabel}</span>
                                  {primaryVariantType && (
                                    <div className="relative group">
                                      <button
                                        onClick={() => setExpandedCartKey(showVariantEditor ? null : key)}
                                        className="text-xs text-primary hover:text-primary/80 underline"
                                      >
                                        change
                                      </button>
                                      <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background shadow-sm group-hover:block">
                                        Change variant
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              {!variantLabel && primaryVariantType && (
                                <div className="mt-0.5">
                                  <div className="relative inline-block group">
                                    <button
                                      onClick={() => setExpandedCartKey(showVariantEditor ? null : key)}
                                      className="text-xs text-primary hover:text-primary/80 underline"
                                    >
                                      choose variant
                                    </button>
                                    <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background shadow-sm group-hover:block">
                                      Choose variant
                                    </div>
                                  </div>
                                </div>
                              )}
                              <p className="text-muted-foreground text-xs mt-1">{formatCurrency(item.unitPrice, sym)} each</p>
                              {isAdmin && (
                                <div className="mt-2 flex items-center gap-2 flex-wrap">
                                  <PriceLock
                                    priceLockerPin={priceLockerPin}
                                    price={item.product.wholesalePrice}
                                    sym={sym}
                                    isAdmin={isAdmin}
                                    product={item.product}
                                    costPrice={item.product.costPrice}
                                    retailPrice={item.product.price}
                                    label="View"
                                    className="px-2 py-1 shrink-0"
                                  />
                                  <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">Custom price</span>
                                  <input
                                    type="number"
                                    value={priceDrafts[key] ?? String(item.unitPrice)}
                                    onChange={e => setPriceDrafts(current => ({ ...current, [key]: e.target.value }))}
                                    onBlur={() => {
                                      const nextPrice = parseFloat(priceDrafts[key] ?? String(item.unitPrice));
                                      if (!Number.isNaN(nextPrice) && nextPrice >= 0) {
                                        dispatch({ type: 'UPDATE_CART_PRICE', cartKey: key, price: nextPrice });
                                      } else {
                                        setPriceDrafts(current => ({ ...current, [key]: String(item.unitPrice) }));
                                      }
                                    }}
                                    className="h-8 w-24 rounded-md border border-border bg-background px-2.5 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="relative group">
                              <button onClick={() => dispatch({ type: 'UPDATE_CART_QTY', cartKey: key, quantity: item.quantity - 1 })} className="w-8 h-8 rounded-lg border border-border bg-secondary/80 flex items-center justify-center"><Minus className="w-3.5 h-3.5 text-foreground" /></button>
                              <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background shadow-sm group-hover:block">
                                Decrease qty
                              </div>
                            </div>
                            <span className="text-foreground font-bold text-base w-7 text-center">{item.quantity}</span>
                            <div className="relative group">
                              <button onClick={() => dispatch({ type: 'UPDATE_CART_QTY', cartKey: key, quantity: item.quantity + 1 })} className="w-8 h-8 rounded-lg border border-primary/30 bg-primary text-primary-foreground flex items-center justify-center"><Plus className="w-3.5 h-3.5 text-primary-foreground" /></button>
                              <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background shadow-sm group-hover:block">
                                Increase qty
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <p className="text-foreground font-bold text-sm w-24 text-right">{formatCurrency(total, sym)}</p>
                            <div className="relative group">
                              <button onClick={() => dispatch({ type: 'REMOVE_FROM_CART', cartKey: key })} className="p-2 rounded-lg border border-destructive/20 bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                              <div className="pointer-events-none absolute right-0 top-full z-10 mt-1 hidden whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background shadow-sm group-hover:block">
                                Remove item
                              </div>
                            </div>
                          </div>
                        </div>

                        {showVariantEditor && primaryVariantType && (
                          <div className="border-t border-slate-300/80 bg-white/80 px-3 py-3 dark:border-border dark:bg-background">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Change Variant</p>
                            <div className="mb-2">
                              <p className="text-xs text-muted-foreground mb-1.5">{primaryVariantType.name}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {primaryVariantType.options.map(opt => {
                                  const isSelected = item.selectedVariant?.optionId === opt.id;
                                  return (
                                    <button
                                      key={opt.id}
                                      onClick={() => {
                                        dispatch({
                                          type: 'UPDATE_CART_VARIANT',
                                          cartKey: key,
                                          variant: { typeId: primaryVariantType.id, optionId: opt.id },
                                        });
                                        setExpandedCartKey(null);
                                      }}
                                      disabled={opt.stock === 0}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                                        isSelected
                                          ? 'bg-primary/10 border-primary text-primary'
                                          : 'bg-card border-border text-foreground'
                                      } ${opt.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                      {opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            <button
                              onClick={() => setExpandedCartKey(null)}
                              className="text-xs text-muted-foreground hover:text-foreground mt-1"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {cart.length === 0 && (
                    <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center bg-card">
                      <div className="w-14 h-14 rounded-2xl bg-secondary mx-auto mb-4 flex items-center justify-center">
                        <ShoppingCart className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-foreground font-bold text-lg">Your cart is empty</h3>
                      <p className="text-muted-foreground text-sm mt-1">Tap products to start a new sale.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="min-h-0 bg-card">
                <div className="h-full flex flex-col px-4 py-4 md:px-6 md:py-5">
                  <div className="rounded-3xl bg-secondary/50 border border-border p-4 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-foreground font-semibold">{formatCurrency(subtotal, sym)}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-primary">Coupon ({appliedCoupon.code})</span>
                          <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            className="rounded-lg bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive"
                          >
                            Remove
                          </button>
                        </div>
                        <span className="text-primary font-semibold">-{formatCurrency(couponDiscount, sym)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-3 border-t border-border">
                      <span className="text-foreground font-bold text-base">Total Due</span>
                      <span className="text-primary font-bold text-3xl">{formatCurrency(cartTotal, sym)}</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground block">Customer</label>
                      <select
                        value={selectedCustomer?.id ?? ''}
                        onChange={e => {
                          const nextCustomer = state.customers.find(customer => customer.id === e.target.value) ?? null;
                          dispatch({ type: 'SET_CUSTOMER', customer: nextCustomer });
                        }}
                        className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm font-medium"
                      >
                        <option value="">Walk-in customer</option>
                        {state.customers.filter(customer => customer.active).map(customer => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name} {customer.phone ? `• ${customer.phone}` : ''}
                          </option>
                        ))}
                      </select>
                      {selectedCustomer && (
                        <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-xs">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-foreground font-semibold">{selectedCustomer.name}</p>
                              <p className="text-muted-foreground mt-0.5">
                                {selectedCustomer.phone || 'No phone'} {selectedCustomer.type ? `• ${selectedCustomer.type}` : ''}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-muted-foreground">Current credit</p>
                              <p className={`font-semibold ${selectedCustomerCredit > 0 ? 'text-warning' : 'text-success'}`}>
                                {formatCurrency(selectedCustomerCredit, sym)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {!showCouponForm ? (
                        <button
                          type="button"
                          onClick={() => setShowCouponForm(true)}
                          className="text-xs font-semibold text-primary underline underline-offset-2"
                        >
                          Add Coupon Code
                        </button>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-foreground block">Coupon Code</label>
                            <button
                              type="button"
                              onClick={() => {
                                setShowCouponForm(false);
                                setCouponCode('');
                                setCouponError('');
                              }}
                              className="text-xs font-medium text-muted-foreground"
                            >
                              Hide
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={couponCode}
                              onChange={e => {
                                setCouponCode(e.target.value.toUpperCase());
                                setCouponError('');
                              }}
                              placeholder="Enter one-time code"
                              className="flex-1 px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm font-semibold uppercase"
                            />
                            <button onClick={handleApplyCoupon} className="px-4 rounded-2xl bg-secondary text-foreground text-sm font-semibold">
                              Apply
                            </button>
                          </div>
                        </>
                      )}
                      {couponError && (
                        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                          {couponError}
                        </div>
                      )}
                    </div>

                    <>
                      <label className="text-xs font-semibold text-foreground block">Amount Received</label>
                      <input ref={amountReceivedRef} type="number" min="0" value={amountReceived} onChange={e => setAmountReceived(e.target.value)} placeholder={cartTotal.toString()} className="w-full px-4 py-4 rounded-2xl border border-border bg-background text-foreground text-xl font-semibold text-center" />

                      {amountReceived !== '' && (
                        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold border ${
                          selectedCustomer && amountReceivedNumber < cartTotal
                            ? 'bg-warning/10 text-warning border-warning/20'
                            : amountReceivedNumber < cartTotal
                              ? 'bg-destructive/10 text-destructive border-destructive/20'
                              : change > 0
                                ? 'bg-success/10 text-success border-success/20'
                                : 'bg-primary/10 text-primary border-primary/20'
                        }`}>
                          {selectedCustomer && amountReceivedNumber < cartTotal
                            ? `Credit due: ${formatCurrency(remaining, sym)}`
                            : amountReceivedNumber < cartTotal
                              ? `Remaining: ${formatCurrency(remaining, sym)}`
                              : change > 0
                                ? `Change: ${formatCurrency(change, sym)}`
                                : 'Exact amount received'}
                        </div>
                      )}
                    </>
                  </div>

                  <div className="mt-auto pt-4">
                    <button onClick={handleCompleteSale} disabled={!canCompleteSale} className="w-full py-4 rounded-2xl border border-primary/30 bg-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(34,197,94,0.22)] hover:brightness-105">
                      <Receipt className="w-5 h-5" />
                      {isCreditSale ? 'Save Credit Sale' : 'Complete Sale'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {variantProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setVariantProduct(null)}>
          <div className="bg-card rounded-t-3xl w-full max-w-md p-4 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground text-lg">{variantProduct.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">Choose options before adding to cart.</p>
              </div>
              <button onClick={() => setVariantProduct(null)} className="text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {variantProduct.variants.map(vt => (
                <div key={vt.id} className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">{vt.name}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {vt.options.map(opt => {
                      const isSelected = variantSelections[vt.id] === opt.id;
                      return (
                        <button key={opt.id} onClick={() => setVariantSelections(prev => ({ ...prev, [vt.id]: opt.id }))} disabled={opt.stock === 0} className={`p-3 rounded-2xl text-xs font-medium transition-all border text-left ${isSelected ? 'bg-primary text-primary-foreground border-primary' : opt.stock === 0 ? 'bg-secondary text-muted-foreground opacity-50 cursor-not-allowed border-transparent' : 'bg-secondary text-foreground border-transparent hover:border-primary/30'}`}>
                          <div className="line-clamp-1 font-semibold">{opt.label}</div>
                          <div className="text-[11px] opacity-75 mt-1">{opt.stock} left</div>
                          {opt.priceAdjust !== 0 && <div className="text-[11px] opacity-80 mt-1">{formatCurrency(opt.priceAdjust, sym)}</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl bg-secondary/50 border border-border px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Base price</span>
                <span className="text-sm font-bold text-foreground">{formatCurrency(variantProduct.price, sym)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Price to add</span>
                <span className="text-base font-bold text-primary">{formatCurrency(selectedVariantPrice, sym)}</span>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setVariantProduct(null)} className="flex-1 py-3 bg-secondary text-foreground rounded-2xl font-semibold text-sm">Cancel</button>
              <button onClick={handleAddVariant} disabled={!allVariantsSelected} className="flex-1 py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-sm disabled:opacity-50">
                Add to Cart {allVariantsSelected ? `- ${formatCurrency(selectedVariantPrice, sym)}` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
      {completedSale && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => setCompletedSale(null)}>
          <div className="w-full max-w-md rounded-3xl bg-card border border-border overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-card">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Invoice</p>
                <h3 className="text-foreground font-bold text-lg">{completedSale.receiptNo}</h3>
              </div>
              <button onClick={() => setCompletedSale(null)} className="w-9 h-9 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                <X className="w-4 h-4 text-destructive" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4 bg-background">
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-3 py-3 text-center border-b border-border bg-secondary/30">
                  <p className="text-foreground text-sm font-semibold leading-tight">AKPOS</p>
                </div>

                <div className="px-3 py-2.5 text-center border-b border-border bg-card">
                  <p className="text-foreground text-sm font-semibold">{state.settings.shopName}</p>
                  <p className="text-muted-foreground text-xs">{state.settings.address}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{state.settings.phone}</p>
                </div>

                <div className="px-3 py-2.5 space-y-1 border-b border-dashed border-border text-xs">
                  <InvoiceRow label="Receipt No." value={completedSale.receiptNo} />
                  <InvoiceRow label="Date" value={`${completedSale.date} ${completedSale.time}`} />
                  {state.currentUser && <InvoiceRow label="Staff" value={state.currentUser.name} />}
                </div>

                <div className="px-3 py-2.5 space-y-1.5 border-b border-dashed border-border">
                  {completedSale.items.map((item, index) => (
                    <div key={`${item.productId}-${index}`} className="text-xs">
                      <p className="font-semibold text-foreground">
                        {item.productName}{item.variantLabel ? ` (${item.variantLabel})` : ''}
                      </p>
                      <div className="flex items-center justify-between gap-3 mt-0.5">
                        <p className="text-muted-foreground">{item.quantity} x {formatCurrency(item.unitPrice, sym)}</p>
                        <p className="text-foreground">{formatCurrency(item.total, sym)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-3 py-2.5 space-y-1 text-xs">
                  <InvoiceRow label="Subtotal" value={formatCurrency(completedSale.subtotal, sym)} />
                  {completedSale.couponCode && (
                    <InvoiceRow label={`Coupon (${completedSale.couponCode})`} value={`-${formatCurrency(completedSale.couponDiscount ?? 0, sym)}`} valueClass="text-primary font-semibold" />
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-foreground font-bold">TOTAL</span>
                    <span className="text-primary font-bold">{formatCurrency(completedSale.total, sym)}</span>
                  </div>
                  <InvoiceRow label="Cash" value={formatCurrency(completedSale.amountPaid, sym)} />
                  <InvoiceRow label="Change" value={formatCurrency(completedSale.change, sym)} valueClass="text-primary font-semibold" />
                </div>

                {state.settings.receiptFooter && (
                  <div className="px-3 py-2.5 text-center border-t border-dashed border-border bg-secondary/20">
                    <p className="text-muted-foreground text-xs">{state.settings.receiptFooter}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 border-t border-border bg-card">
              <button
                onClick={handleSaveReceiptToGallery}
                disabled={completedSaleSaved}
                className="py-3 rounded-2xl bg-secondary text-foreground text-sm font-semibold disabled:opacity-60"
              >
                {completedSaleSaved ? 'Saved to Gallery' : 'Save Image to Gallery'}
              </button>
              <button
                onClick={handlePrintReceipt}
                className="py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
}

function InvoiceRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-right text-foreground ${valueClass ?? ''}`}>{value}</span>
    </div>
  );
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function buildReceiptSvg({
  receiptNo,
  dateTime,
  shopName,
  address,
  phone,
  customerName,
  staffName,
  items,
  subtotal,
  couponLine,
  total,
  cash,
  change,
  footer,
}: {
  receiptNo: string;
  dateTime: string;
  shopName: string;
  address: string;
  phone: string;
  customerName: string | null;
  staffName: string | null;
  items: Array<{ name: string; meta: string; total: string }>;
  subtotal: string;
  couponLine: string | null;
  total: string;
  cash: string;
  change: string;
  footer: string | null;
}) {
  const itemStartY = 190;
  const itemGap = 42;
  const totalsStartY = itemStartY + items.length * itemGap + 14;
  const height = Math.max(520, totalsStartY + 150 + (footer ? 30 : 0));

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="${height}" viewBox="0 0 720 ${height}">
      <rect width="720" height="${height}" fill="#f5f5f5"/>
      <rect x="70" y="30" width="580" height="${height - 60}" rx="18" fill="#ffffff" stroke="#d6d3d1" stroke-width="2"/>
      <text x="360" y="78" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#111111">AKPOS</text>
      <line x1="110" y1="96" x2="610" y2="96" stroke="#bbbbbb" stroke-dasharray="8 6" stroke-width="2"/>
      <text x="360" y="128" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#111111">${escapeXml(shopName)}</text>
      <text x="360" y="154" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#666666">${escapeXml(address)}</text>
      <text x="360" y="176" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#666666">${escapeXml(phone)}</text>

      <text x="120" y="210" font-family="Arial, sans-serif" font-size="16" fill="#666666">Receipt No.</text>
      <text x="600" y="210" text-anchor="end" font-family="Arial, sans-serif" font-size="16" fill="#111111">${escapeXml(receiptNo)}</text>
      <text x="120" y="234" font-family="Arial, sans-serif" font-size="16" fill="#666666">Date</text>
      <text x="600" y="234" text-anchor="end" font-family="Arial, sans-serif" font-size="16" fill="#111111">${escapeXml(dateTime)}</text>
      ${customerName ? `<text x="120" y="258" font-family="Arial, sans-serif" font-size="16" fill="#666666">Customer</text>
      <text x="600" y="258" text-anchor="end" font-family="Arial, sans-serif" font-size="16" fill="#111111">${escapeXml(customerName)}</text>` : ''}
      ${staffName ? `<text x="120" y="${customerName ? 282 : 258}" font-family="Arial, sans-serif" font-size="16" fill="#666666">Staff</text>
      <text x="600" y="${customerName ? 282 : 258}" text-anchor="end" font-family="Arial, sans-serif" font-size="16" fill="#111111">${escapeXml(staffName)}</text>` : ''}

      <line x1="110" y1="${customerName || staffName ? 300 : 276}" x2="610" y2="${customerName || staffName ? 300 : 276}" stroke="#bbbbbb" stroke-dasharray="8 6" stroke-width="2"/>
      ${items.map((item, index) => {
        const y = itemStartY + index * itemGap + 128;
        return `
          <text x="120" y="${y}" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#111111">${escapeXml(item.name)}</text>
          <text x="120" y="${y + 20}" font-family="Arial, sans-serif" font-size="14" fill="#666666">${escapeXml(item.meta)}</text>
          <text x="600" y="${y + 20}" text-anchor="end" font-family="Arial, sans-serif" font-size="14" fill="#111111">${escapeXml(item.total)}</text>
        `;
      }).join('')}

      <line x1="110" y1="${totalsStartY + 108}" x2="610" y2="${totalsStartY + 108}" stroke="#bbbbbb" stroke-dasharray="8 6" stroke-width="2"/>
      <text x="120" y="${totalsStartY + 138}" font-family="Arial, sans-serif" font-size="16" fill="#666666">Subtotal</text>
      <text x="600" y="${totalsStartY + 138}" text-anchor="end" font-family="Arial, sans-serif" font-size="16" fill="#111111">${escapeXml(subtotal)}</text>
      ${couponLine ? `<text x="120" y="${totalsStartY + 164}" font-family="Arial, sans-serif" font-size="16" fill="#666666">${escapeXml(couponLine.split(' ')[0].includes('Coupon') ? couponLine.replace(/ -.*$/, '') : couponLine)}</text>
      <text x="600" y="${totalsStartY + 164}" text-anchor="end" font-family="Arial, sans-serif" font-size="16" fill="#166534">${escapeXml(couponLine.match(/-.*$/)?.[0] ?? '')}</text>` : ''}
      <text x="120" y="${totalsStartY + (couponLine ? 198 : 172)}" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#111111">TOTAL</text>
      <text x="600" y="${totalsStartY + (couponLine ? 198 : 172)}" text-anchor="end" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#166534">${escapeXml(total)}</text>
      <text x="120" y="${totalsStartY + (couponLine ? 226 : 200)}" font-family="Arial, sans-serif" font-size="16" fill="#666666">Cash</text>
      <text x="600" y="${totalsStartY + (couponLine ? 226 : 200)}" text-anchor="end" font-family="Arial, sans-serif" font-size="16" fill="#111111">${escapeXml(cash)}</text>
      <text x="120" y="${totalsStartY + (couponLine ? 252 : 226)}" font-family="Arial, sans-serif" font-size="16" fill="#666666">Change</text>
      <text x="600" y="${totalsStartY + (couponLine ? 252 : 226)}" text-anchor="end" font-family="Arial, sans-serif" font-size="16" fill="#166534">${escapeXml(change)}</text>
      ${footer ? `<line x1="110" y1="${totalsStartY + (couponLine ? 278 : 252)}" x2="610" y2="${totalsStartY + (couponLine ? 278 : 252)}" stroke="#bbbbbb" stroke-dasharray="8 6" stroke-width="2"/>
      <text x="360" y="${totalsStartY + (couponLine ? 308 : 282)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" fill="#666666">${escapeXml(footer)}</text>` : ''}
    </svg>
  `.trim();
}
