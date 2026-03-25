'use client';

import { useState, useMemo, useEffect } from 'react';
import { usePOS } from '@/lib/pos-context';
import { PriceLock } from '@/components/pos/wholesale-lock';
import {
  formatCurrency, generateId, Supplier, SupplierVoucher, VoucherItem,
  Product, OperationalCost,
} from '@/lib/pos-store';
import {
  Search, Plus, Edit2, Trash2, X, Check, Truck, Phone,
  FileText, Receipt, ChevronRight, Package, ChevronDown, DollarSign,
  Tag, Layers, ShoppingBag, Zap, Camera,
} from 'lucide-react';
import { FormField, FormScreen, SaveButton, EmptyState, inputCls, selectCls } from './products-screen';

type Tab = 'suppliers' | 'vouchers';
type SupplierView = 'list' | 'supplier-products'; // sub-view for managing supplier products

export function SuppliersScreen() {
  const { state, dispatch } = usePOS();
  const [tab, setTab] = useState<Tab>('suppliers');
  const [search, setSearch] = useState('');
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editVoucher, setEditVoucher] = useState<SupplierVoucher | null>(null);
  const [showVoucherForm, setShowVoucherForm] = useState(false);
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);
  const [expandedVoucher, setExpandedVoucher] = useState<string | null>(null);
  // Product CRUD within supplier — manage products assigned to each supplier
  const sym = state.settings.currencySymbol;
  const priceLockerPin = state.settings.priceLockerPassword;
  const [managingProductsFor, setManagingProductsFor] = useState<Supplier | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const isAdmin = state.currentUser?.role === 'admin';

  // Filter suppliers by search term for display
  const filteredSuppliers = state.suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.contact.includes(search)
  );

  const filteredVouchers = state.supplierVouchers.filter(v => {
    if (!search) return true;
    const supplier = state.suppliers.find(s => s.id === v.supplierId);
    return v.voucherNo.toLowerCase().includes(search.toLowerCase()) ||
      supplier?.name.toLowerCase().includes(search.toLowerCase());
  });

  // ── Product form for a specific supplier ────────────────────────────────
  if (showProductForm && managingProductsFor) {
    return (
      <SupplierProductForm
        product={editProduct}
        supplierId={managingProductsFor.id}
        supplierName={managingProductsFor.name}
        categories={state.categories}
        units={state.units}
        sym={sym}
        onSave={(p) => { dispatch({ type: 'SAVE_PRODUCT', product: p }); setShowProductForm(false); setEditProduct(null); }}
        onClose={() => { setShowProductForm(false); setEditProduct(null); }}
      />
    );
  }

  // ── Supplier form ────────────────────────────────────────────────────────
  if (showSupplierForm) {
    return <SupplierForm supplier={editSupplier}
      onSave={(s) => { dispatch({ type: 'SAVE_SUPPLIER', supplier: s }); setShowSupplierForm(false); }}
      onClose={() => setShowSupplierForm(false)} />;
  }

  // ── Voucher form ─────────────────────────────────────────────────────────
  if (showVoucherForm) {
    return <VoucherForm voucher={editVoucher} suppliers={state.suppliers} products={state.products} sym={sym} supplierVouchers={state.supplierVouchers}
      onCreateSupplier={(supplier) => dispatch({ type: 'SAVE_SUPPLIER', supplier })}
      onCreateProduct={(product) => dispatch({ type: 'SAVE_PRODUCT', product })}
      onSave={(v) => { dispatch({ type: 'SAVE_VOUCHER', voucher: v }); setShowVoucherForm(false); }}
      onClose={() => setShowVoucherForm(false)} />;
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Tabs */}
      <div className="flex gap-1.5 px-4 pt-3 pb-3">
        {(['suppliers', 'vouchers'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
              tab === t ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary text-muted-foreground'
            }`}>
            {t === 'vouchers' ? `Purchase Vouchers (${state.supplierVouchers.length})` : `Suppliers (${state.suppliers.length})`}
          </button>
        ))}
      </div>

      {/* Search + Add */}
      <div className="flex gap-2 px-4 pb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={tab === 'suppliers' ? 'Search suppliers...' : 'Search vouchers...'}
            className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        {isAdmin && (
          <button
            onClick={() => tab === 'suppliers'
              ? (setEditSupplier(null), setShowSupplierForm(true))
              : (setEditVoucher(null), setShowVoucherForm(true))
            }
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-primary rounded-xl text-primary-foreground text-sm font-semibold shrink-0 shadow-sm">
            <Plus className="w-4 h-4" /> Add
          </button>
        )}
      </div>

      {/* ── Suppliers tab ──────────────────────────────────────────────── */}
      {tab === 'suppliers' && (
        <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
          {filteredSuppliers.length === 0 ? (
            <EmptyState icon={<Truck className="w-10 h-10" />} label="No suppliers found" />
          ) : (
            filteredSuppliers.map(supplier => {
              const voucherCount = state.supplierVouchers.filter(v => v.supplierId === supplier.id).length;
              const totalPurchased = state.supplierVouchers
                .filter(v => v.supplierId === supplier.id)
                .reduce((s, v) => s + v.grandTotal, 0);
              const linkedProducts = state.products.filter(p => p.supplierId === supplier.id);
              const isExpanded = expandedSupplier === supplier.id;
              return (
                <div key={supplier.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                  {/* Header */}
                  <div
                    role="button" tabIndex={0}
                    onClick={() => setExpandedSupplier(isExpanded ? null : supplier.id)}
                    onKeyDown={e => e.key === 'Enter' && setExpandedSupplier(isExpanded ? null : supplier.id)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left cursor-pointer select-none"
                  >
                    <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Truck className="w-5 h-5 text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-semibold text-sm">{supplier.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <p className="text-muted-foreground text-xs">{supplier.contact || '—'}</p>
                      </div>
                      {supplier.notes && <p className="text-muted-foreground text-xs mt-0.5 truncate">{supplier.notes}</p>}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-md">{linkedProducts.length} products</span>
                        <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-md">{voucherCount} vouchers</span>
                        {totalPurchased > 0 && (
                          <span className="text-xs text-foreground font-semibold">{formatCurrency(totalPurchased, sym)} total</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isAdmin && (
                        <button
                          onClick={e => { e.stopPropagation(); setEditSupplier(supplier); setShowSupplierForm(true); }}
                          className="p-1.5 rounded-lg bg-secondary"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      )}
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded: linked products with CRUD */}
                  {isExpanded && (
                    <div className="border-t border-border bg-secondary/30 px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                          Products ({linkedProducts.length})
                        </p>
                        {isAdmin && (
                          <button
                            onClick={() => { setManagingProductsFor(supplier); setEditProduct(null); setShowProductForm(true); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-primary rounded-lg text-primary-foreground text-xs font-semibold"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Product
                          </button>
                        )}
                      </div>
                      {linkedProducts.length === 0 ? (
                        <p className="text-muted-foreground text-xs italic py-2">No products linked to this supplier yet.</p>
                      ) : (
                        linkedProducts.map(p => {
                          const totalStock = p.variants.length > 0
                            ? p.variants.flatMap(vt => vt.options).reduce((s, o) => s + o.stock, 0)
                            : p.stock;
                          return (
                            <div key={p.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5">
                              {p.image ? (
                                <img src={p.image} alt={p.name} className="w-9 h-9 rounded-lg object-cover shrink-0 border border-border" />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                  <Package className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-foreground text-sm font-semibold leading-tight truncate">{p.name}</p>
                                <p className="text-muted-foreground text-xs">{p.sku || 'No SKU'}</p>
                              </div>
                              <div className="text-right shrink-0 mr-1">
                                <p className="text-primary text-sm font-bold">{formatCurrency(p.price, sym)}</p>
                                {p.wholesalePrice > 0 && (
                                  <div className="mt-0.5">
                                    <PriceLock priceLockerPin={priceLockerPin} price={p.wholesalePrice} sym={sym} isAdmin={isAdmin} product={p} costPrice={p.costPrice} retailPrice={p.price} />
                                  </div>
                                )}
                                <p className={`text-xs font-medium ${totalStock <= 10 ? 'text-warning' : 'text-muted-foreground'}`}>
                                  {totalStock} stock
                                </p>
                              </div>
                              {isAdmin && (
                                <div className="flex flex-col gap-1 shrink-0">
                                  <button
                                    onClick={() => { setManagingProductsFor(supplier); setEditProduct(p); setShowProductForm(true); }}
                                    className="p-1.5 rounded-lg bg-secondary"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Delete "${p.name}"?`)) dispatch({ type: 'DELETE_PRODUCT', id: p.id });
                                    }}
                                    className="p-1.5 rounded-lg bg-destructive/10"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Vouchers tab ──────────────────────────────────────────────── */}
      {tab === 'vouchers' && (
        <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
          {filteredVouchers.length === 0 ? (
            <EmptyState icon={<Receipt className="w-10 h-10" />} label="No purchase vouchers" />
          ) : (
            filteredVouchers.map(voucher => {
              const supplier = state.suppliers.find(s => s.id === voucher.supplierId);
              const isExpanded = expandedVoucher === voucher.id;
              const opTotal = (voucher.operationalCosts ?? []).reduce((s, c) => s + c.amount, 0);
              const paidAmount = voucher.paidAmount ?? 0;
              const voucherGrandTotal = voucher.grandTotal ?? voucher.totalAmount;
              const balanceDue = voucher.balanceDue ?? Math.max(0, voucherGrandTotal - paidAmount);
              const paymentStatus = voucher.paymentStatus ?? (balanceDue === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid');
              return (
                <div key={voucher.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedVoucher(isExpanded ? null : voucher.id)}
                    onKeyDown={e => e.key === 'Enter' && setExpandedVoucher(isExpanded ? null : voucher.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer select-none"
                  >
                    <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
                      <Receipt className="w-5 h-5 text-info" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-foreground font-semibold text-sm">{voucher.voucherNo}</p>
                        <span className="text-xs bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-md">{voucher.date}</span>
                      </div>
                      <p className="text-muted-foreground text-xs mt-0.5">{supplier?.name ?? 'Unknown'} · {voucher.items.length} items</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        Paid: {formatCurrency(paidAmount, sym)} / {formatCurrency(voucherGrandTotal, sym)}
                      </p>
                      {opTotal > 0 && (
                        <p className="text-xs text-warning mt-0.5">+{formatCurrency(opTotal, sym)} operational</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-foreground font-bold text-sm">{formatCurrency(voucherGrandTotal, sym)}</p>
                      <span className={`inline-flex px-2 py-1 rounded-full text-[11px] font-semibold mt-1 ${
                        paymentStatus === 'paid'
                          ? 'bg-success/15 text-success'
                          : paymentStatus === 'partial'
                            ? 'bg-warning/15 text-warning'
                            : 'bg-secondary text-muted-foreground'
                      }`}>
                        {paymentStatus === 'paid' ? 'Paid' : paymentStatus === 'partial' ? 'Partial' : 'Unpaid'}
                      </span>
                      <ChevronRight className={`w-4 h-4 text-muted-foreground ml-auto mt-0.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border bg-secondary/30 px-4 py-3 space-y-2">
                      {voucher.notes && (
                        <p className="text-muted-foreground text-xs italic">{voucher.notes}</p>
                      )}
                      {voucher.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
                            <Package className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground text-xs font-medium">{item.productName}</p>
                            <p className="text-muted-foreground text-xs">{item.quantity} × {formatCurrency(item.unitCost, sym)}</p>
                          </div>
                          <p className="text-foreground text-xs font-semibold shrink-0">{formatCurrency(item.total, sym)}</p>
                        </div>
                      ))}
                      {/* Product subtotal */}
                      <div className="flex justify-between items-center pt-1.5 border-t border-border/60">
                        <p className="text-muted-foreground text-xs">Products Subtotal</p>
                        <p className="text-foreground text-xs font-semibold">{formatCurrency(voucher.totalAmount, sym)}</p>
                      </div>
                      {/* Operational costs */}
                      {(voucher.operationalCosts ?? []).length > 0 && (
                        <>
                          {voucher.operationalCosts.map((oc, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <Zap className="w-3 h-3 text-warning shrink-0" />
                              <p className="text-muted-foreground text-xs flex-1">{oc.label}</p>
                              <p className="text-warning text-xs font-semibold">{formatCurrency(oc.amount, sym)}</p>
                            </div>
                          ))}
                        </>
                      )}
                      {/* Grand total */}
                      <div className="flex justify-between items-center pt-1.5 border-t border-border">
                        <p className="text-foreground text-sm font-bold">Grand Total</p>
                        <p className="text-primary font-bold text-sm">{formatCurrency(voucherGrandTotal, sym)}</p>
                      </div>
                      <div className="rounded-xl bg-card border border-border px-3 py-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-muted-foreground">Payment Summary</p>
                          <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${
                            paymentStatus === 'paid'
                              ? 'bg-success/15 text-success'
                              : paymentStatus === 'partial'
                                ? 'bg-warning/15 text-warning'
                                : 'bg-secondary text-muted-foreground'
                          }`}>
                            {paymentStatus === 'paid' ? 'Fully Paid' : paymentStatus === 'partial' ? 'Partially Paid' : 'Unpaid'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg bg-secondary/60 px-3 py-2">
                            <p className="text-muted-foreground">Paid</p>
                            <p className="text-foreground font-semibold mt-1">{formatCurrency(paidAmount, sym)}</p>
                          </div>
                          <div className="rounded-lg bg-secondary/60 px-3 py-2">
                            <p className="text-muted-foreground">Balance</p>
                            <p className={`font-semibold mt-1 ${balanceDue > 0 ? 'text-warning' : 'text-success'}`}>
                              {formatCurrency(balanceDue, sym)}
                            </p>
                          </div>
                        </div>
                        {(voucher.paymentHistory ?? []).length > 0 ? (
                          <div className="space-y-2 pt-1">
                            <p className="text-xs font-semibold text-muted-foreground">Payment Records</p>
                            {(voucher.paymentHistory ?? []).map(record => (
                              <div key={record.id} className="flex items-start justify-between gap-3 rounded-lg bg-secondary/40 px-3 py-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-foreground">{record.date}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {record.remark || 'No remark'}
                                  </p>
                                </div>
                                <p className="shrink-0 text-xs font-semibold text-success">
                                  {formatCurrency(record.amount, sym)}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No payment records yet.</p>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => { setEditVoucher(voucher); setShowVoucherForm(true); }}
                            className="flex items-center gap-1.5 text-xs text-foreground bg-secondary px-3 py-1.5 rounded-lg"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => { if (confirm('Delete this voucher?')) dispatch({ type: 'DELETE_VOUCHER', id: voucher.id }); }}
                            className="flex items-center gap-1.5 text-xs text-destructive hover:underline"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Supplier Product Form — add/edit a product linked to a supplier
// ---------------------------------------------------------------------------
function SupplierProductForm({
  product, supplierId, supplierName, categories, units, sym, onSave, onClose,
}: {
  product: Product | null;
  supplierId: string;
  supplierName: string;
  categories: { id: string; name: string; color: string }[];
  units: { id: string; name: string; abbreviation: string }[];
  sym: string;
  onSave: (p: Product) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [price, setPrice] = useState(String(product?.price ?? ''));
  const [wholesalePrice, setWholesalePrice] = useState(String(product?.wholesalePrice ?? ''));
  const [costPrice, setCostPrice] = useState(String(product?.costPrice ?? ''));
  const [stock, setStock] = useState(String(product?.stock ?? '0'));
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? '');
  const [unitId, setUnitId] = useState(product?.unitId ?? units[0]?.id ?? '');
  const [active, setActive] = useState(product?.active ?? true);

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      id: product?.id ?? generateId(),
      name: name.trim(),
      sku: sku.trim(),
      price: parseFloat(price) || 0,
      wholesalePrice: parseFloat(wholesalePrice) || 0,
      costPrice: parseFloat(costPrice) || 0,
      stock: parseInt(stock) || 0,
      categoryId,
      unitId,
      supplierId,
      image: product?.image ?? '',
      active,
      variants: product?.variants ?? [],
    });
  }

  return (
    <FormScreen title={`${product ? 'Edit' : 'New'} Product — ${supplierName}`} onClose={onClose}>
      <FormField label="Product Name *">
        <div className="relative">
          <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Coca Cola 330ml" className={`${inputCls} pl-9`} autoFocus />
        </div>
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="SKU / Barcode">
          <input type="text" value={sku} onChange={e => setSku(e.target.value)} placeholder="e.g. BEV001" className={inputCls} />
        </FormField>
        <FormField label="Category">
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={selectCls}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FormField>
      </div>

      {/* Price section */}
      <div className="bg-secondary/50 border border-border rounded-2xl p-3 space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" /> Pricing
        </p>
        <div className="grid grid-cols-3 gap-2">
          <FormField label={`Retail Price (${sym})`}>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)}
              placeholder="0" className={inputCls} min={0} />
          </FormField>
          <FormField label={`Wholesale (${sym})`}>
            <input type="number" value={wholesalePrice} onChange={e => setWholesalePrice(e.target.value)}
              placeholder="0" className={inputCls} min={0} />
          </FormField>
          <FormField label={`Cost (${sym})`}>
            <input type="number" value={costPrice} onChange={e => setCostPrice(e.target.value)}
              placeholder="0" className={inputCls} min={0} />
          </FormField>
        </div>
        {/* Margin display */}
        {parseFloat(price) > 0 && parseFloat(costPrice) > 0 && (
          <p className="text-xs text-muted-foreground">
            Retail margin: <span className="text-success font-semibold">
              {(((parseFloat(price) - parseFloat(costPrice)) / parseFloat(price)) * 100).toFixed(1)}%
            </span>
            {parseFloat(wholesalePrice) > 0 && (
              <> · Wholesale margin: <span className="text-info font-semibold">
                {(((parseFloat(wholesalePrice) - parseFloat(costPrice)) / parseFloat(wholesalePrice)) * 100).toFixed(1)}%
              </span></>
            )}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Stock Qty">
          <input type="number" value={stock} onChange={e => setStock(e.target.value)} placeholder="0" className={inputCls} min={0} />
        </FormField>
        <FormField label="Unit">
          <select value={unitId} onChange={e => setUnitId(e.target.value)} className={selectCls}>
            {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
          </select>
        </FormField>
      </div>

      <div className="flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-3">
        <div>
          <p className="text-foreground text-sm font-medium">Active Product</p>
          <p className="text-muted-foreground text-xs">Available for sale on POS</p>
        </div>
        <button onClick={() => setActive(!active)}
          className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${active ? 'bg-primary' : 'bg-muted'}`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${active ? 'left-6' : 'left-0.5'}`} />
        </button>
      </div>
      <SaveButton onClick={handleSave} label={product ? 'Update Product' : 'Add Product'} />
    </FormScreen>
  );
}

// ---------------------------------------------------------------------------
// Supplier Form
// ---------------------------------------------------------------------------
function SupplierForm({ supplier, onSave, onClose }: { supplier: Supplier | null; onSave: (s: Supplier) => void; onClose: () => void }) {
  const [name, setName] = useState(supplier?.name ?? '');
  const [contact, setContact] = useState(supplier?.contact ?? '');
  const [notes, setNotes] = useState(supplier?.notes ?? '');
  const [active, setActive] = useState(supplier?.active ?? true);

  function handleSave() {
    if (!name.trim()) return;
    onSave({ id: supplier?.id ?? generateId(), name: name.trim(), contact: contact.trim(), notes: notes.trim(), active });
  }

  return (
    <FormScreen title={supplier ? 'Edit Supplier' : 'New Supplier'} onClose={onClose}>
      <FormField label="Supplier Name *">
        <div className="relative">
          <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. ABC Trading Co."
            className={`${inputCls} pl-9`} autoFocus />
        </div>
      </FormField>
      <FormField label="Contact / Phone">
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={contact} onChange={e => setContact(e.target.value)} placeholder="09-xxx-xxxx"
            className={`${inputCls} pl-9`} />
        </div>
      </FormField>
      <FormField label="Notes">
        <div className="relative">
          <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." rows={3}
            className={`${inputCls} pl-9 resize-none`} />
        </div>
      </FormField>
      <div className="flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-3">
        <div>
          <p className="text-foreground text-sm font-medium">Active Supplier</p>
          <p className="text-muted-foreground text-xs">Available for purchase orders</p>
        </div>
        <button onClick={() => setActive(!active)}
          className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${active ? 'bg-primary' : 'bg-muted'}`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${active ? 'left-6' : 'left-0.5'}`} />
        </button>
      </div>
      <SaveButton onClick={handleSave} label="Save Supplier" />
    </FormScreen>
  );
}

// ---------------------------------------------------------------------------
// Voucher Form — with operational costs section
// ---------------------------------------------------------------------------
function VoucherForm({
  voucher, suppliers, products, sym, supplierVouchers, onCreateSupplier, onCreateProduct, onSave, onClose,
}: {
  voucher: SupplierVoucher | null;
  suppliers: Supplier[];
  products: { id: string; name: string; costPrice: number; supplierId: string }[];
  sym: string;
  supplierVouchers: SupplierVoucher[];
  onCreateSupplier: (supplier: Supplier) => void;
  onCreateProduct: (product: Product) => void;
  onSave: (v: SupplierVoucher) => void;
  onClose: () => void;
}) {
  const [supplierId, setSupplierId] = useState(voucher?.supplierId ?? suppliers[0]?.id ?? '');
  const [localSuppliers, setLocalSuppliers] = useState<Supplier[]>([]);
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const allSuppliers = useMemo(() => [...suppliers, ...localSuppliers], [suppliers, localSuppliers]);
  const supplierProducts = useMemo(
    () => products.filter(p => !supplierId || p.supplierId === supplierId),
    [products, supplierId]
  );
  const selectedSupplier = allSuppliers.find(s => s.id === supplierId);
  const canSelectAnyProduct = Boolean(selectedSupplier) && supplierProducts.length === 0;
  const availableProducts = canSelectAnyProduct ? products : supplierProducts;
  const filteredSupplierOptions = useMemo(
    () => allSuppliers.filter(s =>
      s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
      s.contact.toLowerCase().includes(supplierSearch.toLowerCase())
    ),
    [allSuppliers, supplierSearch]
  );
  const [voucherNo, setVoucherNo] = useState(voucher?.voucherNo ?? `PV-${Date.now().toString().slice(-4)}`);
  const [date, setDate] = useState(voucher?.date ?? new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(voucher?.notes ?? '');
  const [voucherImage, setVoucherImage] = useState(voucher?.image ?? '');
  const [items, setItems] = useState<VoucherItem[]>(
    voucher?.items ?? [{ productId: '', productName: '', quantity: 1, unitCost: 0, total: 0 }]
  );
  const [opCosts, setOpCosts] = useState<OperationalCost[]>(
    voucher?.operationalCosts ?? []
  );
  const [showOpCostSuggestions, setShowOpCostSuggestions] = useState(false);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [createProductName, setCreateProductName] = useState('');
  const [createProductCost, setCreateProductCost] = useState('');
  const [createProductPrice, setCreateProductPrice] = useState('');
  const [createProductSupplierId, setCreateProductSupplierId] = useState(voucher?.supplierId ?? suppliers[0]?.id ?? '');
  const [saveCreatedProduct, setSaveCreatedProduct] = useState(true);
  const [newProductName, setNewProductName] = useState('');
  const [newProductCost, setNewProductCost] = useState('');
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierContact, setNewSupplierContact] = useState('');
  const [newSupplierNotes, setNewSupplierNotes] = useState('');
  const [saveNewSupplier, setSaveNewSupplier] = useState(true);
  const [paidAmount, setPaidAmount] = useState(voucher?.paidAmount ?? 0);
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'partial' | 'paid'>(voucher?.paymentStatus ?? 'unpaid');

  useEffect(() => {
    setItems(currentItems => currentItems.map(item => {
      const matchedProduct = products.find(p => p.id === item.productId);
      if (!matchedProduct) return item;
      const allowAnyProductSelection = products.every(p => p.supplierId !== supplierId);
      if (allowAnyProductSelection) return item;
      if (!supplierId || matchedProduct.supplierId === supplierId) return item;
      return {
        ...item,
        productId: '',
        productName: '',
        unitCost: 0,
        total: 0,
      };
    }));
  }, [supplierId, products]);

  // Extract unique historical operational costs from past vouchers
  const historicalOpCosts = useMemo(() => {
    const costMap = new Map<string, number>();
    supplierVouchers.forEach(v => {
      (v.operationalCosts ?? []).forEach(oc => {
        if (oc.label.trim()) {
          costMap.set(oc.label.toLowerCase(), oc.amount);
        }
      });
    });
    return Array.from(costMap, ([label, amount]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      amount,
    })).sort((a, b) => b.amount - a.amount).slice(0, 8); // Top 8 most used
  }, [supplierVouchers]); // Historical operational costs from past vouchers - force rebuild v2

  function addItem() {
    setItems([...items, { productId: '', productName: '', quantity: 1, unitCost: 0, total: 0 }]);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    // Upload voucher receipt/document image
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setVoucherImage(evt.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function addNewProduct() {
    if (!newProductName.trim() || !newProductCost.trim()) return;
    const newItem = {
      productId: `new-${Date.now()}`,
      productName: newProductName.trim(),
      quantity: 1,
      unitCost: parseFloat(newProductCost),
      total: parseFloat(newProductCost),
    };
    setItems([...items, newItem]);
    setNewProductName('');
    setNewProductCost('');
    setShowNewProductModal(false);
  }

  function createVoucherProduct() {
    if (!createProductName.trim() || !createProductCost.trim()) return;
    const costPrice = parseFloat(createProductCost) || 0;
    const retailPrice = parseFloat(createProductPrice) || costPrice;
    const productId = saveCreatedProduct ? generateId() : `new-${Date.now()}`;
    const linkedSupplierId = createProductSupplierId || supplierId;

    if (saveCreatedProduct) {
      onCreateProduct({
        id: productId,
        name: createProductName.trim(),
        sku: '',
        price: retailPrice,
        wholesalePrice: 0,
        costPrice,
        stock: 0,
        categoryId: 'c1',
        unitId: 'un1',
        supplierId: linkedSupplierId,
        image: '',
        active: true,
        variants: [],
      });
    }

    setItems(current => ([
      ...current,
      {
        productId,
        productName: createProductName.trim(),
        quantity: 1,
        unitCost: costPrice,
        total: costPrice,
      },
    ]));
    setCreateProductName('');
    setCreateProductCost('');
    setCreateProductPrice('');
    setCreateProductSupplierId(supplierId);
    setSaveCreatedProduct(true);
    setShowCreateProductModal(false);
  }

  function addNewSupplier() {
    if (!newSupplierName.trim()) return;
    const supplier: Supplier = {
      id: generateId(),
      name: newSupplierName.trim(),
      contact: newSupplierContact.trim(),
      notes: newSupplierNotes.trim(),
      active: true,
    };
    if (saveNewSupplier) {
      onCreateSupplier(supplier);
    } else {
      setLocalSuppliers(current => [supplier, ...current]);
    }
    setSupplierId(supplier.id);
    setShowSupplierPicker(false);
    setSupplierSearch('');
    setNewSupplierName('');
    setNewSupplierContact('');
    setNewSupplierNotes('');
    setSaveNewSupplier(true);
    setShowNewSupplierModal(false);
  }

  function updateItem(idx: number, field: keyof VoucherItem, value: string | number) {
    setItems(items.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === 'productId') {
        const prod = products.find(p => p.id === value);
        updated.productName = prod?.name ?? '';
        updated.unitCost = prod?.costPrice ?? 0;
      }
      updated.total = updated.quantity * updated.unitCost;
      return updated;
    }));
  }

  function removeItem(idx: number) {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  }

  function addOpCost() {
    setOpCosts([...opCosts, { id: generateId(), label: '', amount: 0 }]);
  }

  function addOpCostFromHistory(label: string, amount: number) {
    setOpCosts([...opCosts, { id: generateId(), label, amount }]);
    setShowOpCostSuggestions(false);
  }

  function updateOpCost(idx: number, field: 'label' | 'amount', value: string | number) {
    setOpCosts(opCosts.map((oc, i) => i === idx ? { ...oc, [field]: value } : oc));
  }

  function removeOpCost(idx: number) {
    setOpCosts(opCosts.filter((_, i) => i !== idx));
  }

  const productsTotal = items.reduce((s, i) => s + i.total, 0);
  const opTotal = opCosts.reduce((s, c) => s + (c.amount || 0), 0);
  const grandTotal = productsTotal + opTotal;
  const balanceDue = grandTotal - paidAmount;

  function handleSave() {
    if (!supplierId || items.every(i => !i.productId)) return;
    const validItems = items.filter(i => i.productId);
    const validOpCosts = opCosts.filter(c => c.label.trim());
    
    // Determine payment status
    let finalPaymentStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
    if (paidAmount >= grandTotal) {
      finalPaymentStatus = 'paid';
    } else if (paidAmount > 0) {
      finalPaymentStatus = 'partial';
    }

    onSave({
      id: voucher?.id ?? generateId(),
      supplierId, voucherNo, date, notes,
      image: voucherImage,
      items: validItems.map(i => ({ ...i, total: i.quantity * i.unitCost })),
      operationalCosts: validOpCosts,
      totalAmount: validItems.reduce((s, i) => s + i.quantity * i.unitCost, 0),
      grandTotal,
      paidAmount,
      balanceDue,
      paymentStatus: finalPaymentStatus,
      paymentHistory: voucher?.paymentHistory ?? [],
      createdAt: voucher?.createdAt ?? new Date().toISOString(),
    });
  }

  return (
    <FormScreen title={voucher ? 'Edit Voucher' : 'New Purchase Voucher'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Supplier *">
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowSupplierPicker(true)}
              className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-3 text-left"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {selectedSupplier?.name || 'Select supplier'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedSupplier?.contact || 'Search and choose supplier'}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => setShowNewSupplierModal(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Custom Supplier
            </button>
          </div>
        </FormField>
        <FormField label="Voucher No.">
          <input type="text" value={voucherNo} onChange={e => setVoucherNo(e.target.value)} className={inputCls} />
        </FormField>
      </div>
      <FormField label="Purchase Date">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
      </FormField>

      {/* Items */}
      <FormField label="Product Items">
        <div className="mb-2 rounded-xl bg-secondary/50 border border-border px-3 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-foreground">
                {selectedSupplier ? `Supplier: ${selectedSupplier.name}` : 'Choose a supplier first'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {canSelectAnyProduct
                  ? 'No linked products yet, so you can choose from all existing products.'
                  : 'Only products linked to this supplier are shown here.'}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-card border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground">
              {canSelectAnyProduct ? `${products.length} available` : `${supplierProducts.length} linked`}
            </span>
          </div>
        </div>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="bg-secondary rounded-xl p-3 space-y-3 border border-border/50">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted-foreground">Item {idx + 1}</p>
                {item.productId.startsWith('new-') ? (
                  <span className="rounded-full bg-info/10 px-2 py-1 text-[11px] font-semibold text-info">
                    Custom item
                  </span>
                ) : item.productId ? (
                  <span className="rounded-full bg-success/10 px-2 py-1 text-[11px] font-semibold text-success">
                    Linked product
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <select value={item.productId} onChange={e => updateItem(idx, 'productId', e.target.value)}
                  disabled={!selectedSupplier || availableProducts.length === 0}
                  className={`${selectCls} flex-1 ${(!selectedSupplier || availableProducts.length === 0) ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  <option value="">
                    {!selectedSupplier
                      ? 'Choose supplier first'
                      : canSelectAnyProduct
                        ? 'Select product'
                        : availableProducts.length === 0
                          ? 'No linked products available'
                          : 'Select linked product'}
                  </option>
                  {availableProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {formatCurrency(p.costPrice, sym)}
                    </option>
                  ))}
                </select>
                {items.length > 1 && (
                  <button onClick={() => removeItem(idx)} className="p-1.5 rounded-lg bg-destructive/10 shrink-0">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                )}
              </div>
              {!item.productId && selectedSupplier && availableProducts.length === 0 && (
                <div className="rounded-lg bg-card border border-border px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">
                    No linked products for this supplier yet. Use <span className="font-semibold text-foreground">Create Item</span> or <span className="font-semibold text-foreground">Add Custom Item</span> below.
                  </p>
                </div>
              )}
              {item.productId && (
                <div className="rounded-lg bg-card border border-border px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.productId.startsWith('new-') ? 'Custom purchase item' : `Last cost: ${formatCurrency(item.unitCost, sym)}`}
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-foreground">{formatCurrency(item.quantity * item.unitCost, sym)}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Qty</p>
                  <input type="number" value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                    min={1} className={inputCls} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Unit Cost ({sym})</p>
                  <input type="number" value={item.unitCost || ''}
                    onChange={e => updateItem(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                    className={inputCls} />
                </div>
              </div>
              {item.productId && (
                <p className="text-xs text-muted-foreground">
                  Subtotal: <span className="text-foreground font-semibold">{formatCurrency(item.quantity * item.unitCost, sym)}</span>
                </p>
              )}
            </div>
          ))}
          <button onClick={addItem}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm hover:border-primary/40 hover:text-primary transition-colors">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </FormField>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setCreateProductSupplierId(supplierId);
            setShowCreateProductModal(true);
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary/10 border border-primary/30 rounded-xl text-primary text-sm font-semibold hover:bg-primary/15 transition-colors">
          <Plus className="w-4 h-4" /> Create Item
        </button>
        <button onClick={() => setShowNewProductModal(true)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-info/10 border border-info/30 rounded-xl text-info text-sm font-semibold hover:bg-info/15 transition-colors">
          <Plus className="w-4 h-4" /> Add Custom Item
        </button>
      </div>

      {/* Voucher Image Upload */}
      <FormField label="Voucher Receipt/Document Image">
        <div className="space-y-2">
          {voucherImage ? (
            <div className="relative rounded-xl overflow-hidden border-2 border-border bg-secondary">
              <img src={voucherImage} alt="Voucher" className="w-full h-40 object-cover" />
              <button onClick={() => setVoucherImage('')}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-destructive/20 hover:bg-destructive/30 transition-colors">
                <X className="w-4 h-4 text-destructive" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
              <Camera className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Click to upload image</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          )}
        </div>
      </FormField>

      {showCreateProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-5 max-w-sm w-full space-y-4">
            <h3 className="text-foreground font-bold">Create Item</h3>
            <input
              type="text"
              value={createProductName}
              onChange={e => setCreateProductName(e.target.value)}
              placeholder="Product name"
              className={inputCls}
            />
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Linked Supplier</p>
              <select
                value={createProductSupplierId}
                onChange={e => setCreateProductSupplierId(e.target.value)}
                className={selectCls}
              >
                {allSuppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={createProductCost}
                onChange={e => setCreateProductCost(e.target.value)}
                placeholder="Cost price"
                className={inputCls}
              />
              <input
                type="number"
                value={createProductPrice}
                onChange={e => setCreateProductPrice(e.target.value)}
                placeholder="Retail price"
                className={inputCls}
              />
            </div>
            <button
              type="button"
              onClick={() => setSaveCreatedProduct(current => !current)}
              className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 transition-colors ${
                saveCreatedProduct ? 'border-primary/40 bg-primary/5' : 'border-border bg-secondary/30'
              }`}
            >
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Save to products</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {saveCreatedProduct ? 'This item will be added to the product list.' : 'Use only for this voucher.'}
                </p>
              </div>
              <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                saveCreatedProduct ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'
              }`}>
                {saveCreatedProduct && <Check className="w-3.5 h-3.5" />}
              </span>
            </button>
            <div className="flex gap-2 pt-2">
              <button
                onClick={createVoucherProduct}
                className="flex-1 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl active:opacity-80 transition-opacity"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateProductModal(false)}
                className="flex-1 py-2.5 bg-secondary text-foreground font-semibold rounded-xl active:opacity-80 transition-opacity"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Product Modal */}
      {showNewProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-5 max-w-sm w-full space-y-4">
            <h3 className="text-foreground font-bold">Add Custom Item</h3>
            <input type="text" value={newProductName} onChange={e => setNewProductName(e.target.value)}
              placeholder="Item name" className={inputCls} />
            <input type="number" value={newProductCost} onChange={e => setNewProductCost(e.target.value)}
              placeholder="Unit cost" className={inputCls} />
            <div className="flex gap-2 pt-2">
              <button onClick={addNewProduct}
                className="flex-1 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl active:opacity-80 transition-opacity">
                Add
              </button>
              <button onClick={() => setShowNewProductModal(false)}
                className="flex-1 py-2.5 bg-secondary text-foreground font-semibold rounded-xl active:opacity-80 transition-opacity">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showNewSupplierModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-5 max-w-sm w-full space-y-4">
            <h3 className="text-foreground font-bold">Add Custom Supplier</h3>
            <input
              type="text"
              value={newSupplierName}
              onChange={e => setNewSupplierName(e.target.value)}
              placeholder="Supplier name"
              className={inputCls}
            />
            <input
              type="text"
              value={newSupplierContact}
              onChange={e => setNewSupplierContact(e.target.value)}
              placeholder="Phone or contact"
              className={inputCls}
            />
            <textarea
              value={newSupplierNotes}
              onChange={e => setNewSupplierNotes(e.target.value)}
              rows={3}
              placeholder="Optional note"
              className={`${inputCls} resize-none`}
            />
            <button
              type="button"
              onClick={() => setSaveNewSupplier(current => !current)}
              className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 transition-colors ${
                saveNewSupplier ? 'border-primary/40 bg-primary/5' : 'border-border bg-secondary/30'
              }`}
            >
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Save to suppliers</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {saveNewSupplier ? 'This supplier will be available in the main supplier list.' : 'Use only for this voucher.'}
                </p>
              </div>
              <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                saveNewSupplier ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'
              }`}>
                {saveNewSupplier && <Check className="w-3.5 h-3.5" />}
              </span>
            </button>
            <div className="flex gap-2 pt-2">
              <button
                onClick={addNewSupplier}
                className="flex-1 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl active:opacity-80 transition-opacity"
              >
                Add Supplier
              </button>
              <button
                onClick={() => setShowNewSupplierModal(false)}
                className="flex-1 py-2.5 bg-secondary text-foreground font-semibold rounded-xl active:opacity-80 transition-opacity"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showSupplierPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSupplierPicker(false)}>
          <div className="bg-card rounded-2xl p-5 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-foreground font-bold">Select Supplier</h3>
              <button onClick={() => setShowSupplierPicker(false)} className="p-1.5 rounded-lg bg-secondary">
                <X className="w-4 h-4 text-foreground" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={supplierSearch}
                onChange={e => setSupplierSearch(e.target.value)}
                placeholder="Search supplier name or contact"
                className={`${inputCls} pl-10`}
                autoFocus
              />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {filteredSupplierOptions.map(supplier => (
                <button
                  key={supplier.id}
                  type="button"
                  onClick={() => {
                    setSupplierId(supplier.id);
                    setShowSupplierPicker(false);
                    setSupplierSearch('');
                  }}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                    supplier.id === supplierId ? 'border-primary bg-primary/5' : 'border-border bg-background'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{supplier.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{supplier.contact || 'No contact'}</p>
                    </div>
                    {supplier.id === supplierId && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary text-primary-foreground shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </button>
              ))}
              {filteredSupplierOptions.length === 0 && (
                <div className="rounded-xl border border-border bg-background px-3 py-6 text-center">
                  <p className="text-sm text-muted-foreground">No suppliers found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="bg-warning/5 border border-warning/20 rounded-2xl p-3 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-bold text-warning uppercase tracking-wide flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Operational Costs
          </p>
          <div className="relative">
            <button onClick={() => setShowOpCostSuggestions(!showOpCostSuggestions)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-warning/15 text-warning rounded-lg text-xs font-semibold hover:bg-warning/25 transition-all">
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
            
            {/* Suggestions dropdown */}
            {showOpCostSuggestions && historicalOpCosts.length > 0 && (
              <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 min-w-64">
                <p className="text-xs font-semibold text-muted-foreground px-3 py-2 border-b border-border">Recent Costs</p>
                <div className="max-h-48 overflow-y-auto">
                  {historicalOpCosts.map((cost, idx) => (
                    <button
                      key={idx}
                      onClick={() => addOpCostFromHistory(cost.label, cost.amount)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary transition-colors text-xs"
                    >
                      <span className="text-foreground font-medium">{cost.label}</span>
                      <span className="text-muted-foreground">{formatCurrency(cost.amount, sym)}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { addOpCost(); setShowOpCostSuggestions(false); }}
                  className="w-full px-3 py-2 border-t border-border text-xs text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Create New Cost...
                </button>
              </div>
            )}
          </div>
        </div>
        {opCosts.length === 0 ? (
          <p className="text-muted-foreground text-xs italic py-2">No operational costs yet. Add transportation, electricity, loading fees, etc.</p>
        ) : (
          <div className="space-y-2">
            {opCosts.map((oc, idx) => (
              <div key={oc.id} className="flex items-center gap-2 bg-card/50 rounded-lg px-2.5 py-2">
                <input
                  type="text"
                  value={oc.label}
                  onChange={e => updateOpCost(idx, 'label', e.target.value)}
                  placeholder="Cost type (e.g., Transportation)"
                  className={`${inputCls} flex-1 text-xs`}
                />
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-xs">{sym}</span>
                  <input
                    type="number"
                    value={oc.amount || ''}
                    onChange={e => updateOpCost(idx, 'amount', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className={`${inputCls} w-24 text-xs`}
                  />
                </div>
                <button onClick={() => removeOpCost(idx)} className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-all shrink-0">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
        {opTotal > 0 && (
          <div className="flex justify-between items-center pt-2 border-t border-warning/10">
            <p className="text-xs font-semibold text-warning">Subtotal</p>
            <p className="text-xs font-bold text-warning">{formatCurrency(opTotal, sym)}</p>
          </div>
        )}
      </div>

      <FormField label="Notes">
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional notes..."
          className={`${inputCls} resize-none`} />
      </FormField>

      {/* Totals */}
      <div className="bg-card border border-border rounded-2xl px-4 py-3 space-y-2">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground text-sm">Products Subtotal</p>
          <p className="text-foreground font-semibold text-sm">{formatCurrency(productsTotal, sym)}</p>
        </div>
        {opTotal > 0 && (
          <div className="flex justify-between items-center">
            <p className="text-warning text-sm">Operational Costs</p>
            <p className="text-warning font-semibold text-sm">+{formatCurrency(opTotal, sym)}</p>
          </div>
        )}
        <div className="flex justify-between items-center pt-1.5 border-t border-border">
          <p className="text-foreground font-bold">Grand Total</p>
          <p className="text-primary font-bold text-lg">{formatCurrency(grandTotal, sym)}</p>
        </div>
      </div>

      {/* Payment & Balance Section */}
      <div className="space-y-3">
        <FormField label="Amount Paid">
          <input type="number" value={paidAmount || ''} onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)}
            placeholder="0" min={0} max={grandTotal} className={inputCls} />
        </FormField>

        {/* Balance Display */}
        <div className="bg-card border border-border rounded-2xl px-4 py-3 space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground text-sm">Amount Paid</p>
            <p className="text-foreground font-semibold text-sm">{formatCurrency(paidAmount, sym)}</p>
          </div>
          <div className={`flex justify-between items-center pt-1.5 border-t ${balanceDue > 0 ? 'border-warning/30' : 'border-success/30'}`}>
            <p className={`font-bold ${balanceDue > 0 ? 'text-warning' : 'text-success'}`}>Balance Due</p>
            <p className={`font-bold text-lg ${balanceDue > 0 ? 'text-warning' : 'text-success'}`}>{formatCurrency(balanceDue, sym)}</p>
          </div>

          {/* Payment Status Badge */}
          <div className="flex items-center gap-2 pt-2 mt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">Status:</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              paymentStatus === 'paid' ? 'bg-success/15 text-success' :
              paymentStatus === 'partial' ? 'bg-warning/15 text-warning' :
              'bg-secondary text-muted-foreground'
            }`}>
              {paymentStatus === 'paid' ? 'Fully Paid' : paymentStatus === 'partial' ? 'Partially Paid' : 'Unpaid'}
            </span>
          </div>
        </div>
      </div>

      <SaveButton onClick={handleSave} label={voucher ? 'Update Voucher' : 'Save Voucher & Update Stock'} />
    </FormScreen>
  );
}
