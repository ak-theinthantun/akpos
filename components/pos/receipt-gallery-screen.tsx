'use client';

import { useState } from 'react';
import { usePOS } from '@/lib/pos-context';
import { formatCurrency, Sale, ReceiptRecord } from '@/lib/pos-store';
import {
  Receipt, Trash2, X, ChevronRight, ImageOff, Check,
} from 'lucide-react';

export function ReceiptGalleryScreen() {
  const { state, dispatch } = usePOS();
  const [selectedRecord, setSelectedRecord] = useState<ReceiptRecord | null>(null);

  const sym = state.settings.currencySymbol;
  const gallery = state.receiptGallery;

  // Find the full sale for a receipt record
  function getSale(saleId: string): Sale | undefined {
    return state.sales.find(s => s.id === saleId);
  }

  if (selectedRecord) {
    const sale = getSale(selectedRecord.saleId);
    if (!sale) {
      return (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-card">
            <button onClick={() => setSelectedRecord(null)} className="p-2 rounded-xl bg-secondary">
              <X className="w-4 h-4 text-foreground" />
            </button>
            <h2 className="font-bold text-foreground text-base">Receipt Not Found</h2>
          </div>
        </div>
      );
    }

    const customer = state.customers.find(c => c.id === sale.customerId);
    const staff = state.users.find(u => u.id === sale.staffId);

    return (
      <div className="flex flex-col flex-1 overflow-hidden bg-background">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-card">
          <button onClick={() => setSelectedRecord(null)} className="p-2 rounded-xl bg-secondary">
            <X className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex-1">
            <h2 className="font-bold text-foreground text-base">{sale.receiptNo}</h2>
            <p className="text-muted-foreground text-xs">{sale.date} · {sale.time}</p>
          </div>
          <button
            onClick={() => {
              dispatch({ type: 'DELETE_RECEIPT_FROM_GALLERY', id: selectedRecord.id });
              setSelectedRecord(null);
            }}
            className="p-2 rounded-xl bg-destructive/10"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Receipt paper */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="bg-secondary/50 px-3 py-3 text-center border-b border-border">
              <p className="text-foreground text-sm font-semibold leading-tight">AKPOS</p>
            </div>
            <div className="px-3 py-2.5 text-center border-b border-border bg-card">
              <p className="text-foreground text-sm font-semibold">{state.settings.shopName}</p>
              <p className="text-muted-foreground text-xs">{state.settings.address}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{state.settings.phone}</p>
            </div>

            {/* Meta rows */}
            <div className="px-3 pt-2.5 pb-2 space-y-1 border-b border-dashed border-border font-mono text-xs">
              <GRow label="Receipt No." value={sale.receiptNo} />
              <GRow label="Date" value={`${sale.date}  ${sale.time}`} />
              {customer && <GRow label="Customer" value={customer.name} />}
              {staff && <GRow label="Staff" value={staff.name} />}
              <GRow label="Saved At" value={new Date(selectedRecord.savedAt).toLocaleString()} />
            </div>

            {/* Items */}
            <div className="px-3 pt-2.5 pb-2 space-y-2 border-b border-dashed border-border">
              {sale.items.map((item, i) => (
                <div key={i} className="font-mono text-xs">
                  <p className="text-foreground font-semibold">{item.productName}</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{item.quantity} × {formatCurrency(item.unitPrice, sym)}</span>
                    <span className="text-foreground">{formatCurrency(item.total, sym)}</span>
                  </div>
                  {item.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="text-destructive">-{formatCurrency(item.discount, sym)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="px-3 pt-2.5 pb-2.5 space-y-1 font-mono text-xs">
              <GRow label="Subtotal" value={formatCurrency(sale.subtotal, sym)} />
              {sale.discount > 0 && (
                <GRow label="Discount" value={`-${formatCurrency(sale.discount, sym)}`} valueClass="text-destructive" />
              )}
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="text-foreground font-bold text-sm">TOTAL</span>
                <span className="text-primary font-bold text-sm">{formatCurrency(sale.total, sym)}</span>
              </div>
              <GRow label="Cash" value={formatCurrency(sale.amountPaid, sym)} />
              <GRow label="Change" value={formatCurrency(sale.change, sym)} valueClass="text-primary font-semibold" />
            </div>

            {state.settings.receiptFooter && (
              <div className="px-3 py-2.5 text-center border-t border-dashed border-border bg-secondary/30">
                <p className="text-muted-foreground text-xs">{state.settings.receiptFooter}</p>
              </div>
            )}
          </div>

          {/* Status badge */}
          <div className="mt-4 flex items-center justify-center gap-2 py-2.5 bg-primary/8 border border-primary/20 rounded-xl">
            <Check className="w-4 h-4 text-primary" />
            <span className="text-primary text-xs font-semibold">Saved to Receipt Gallery</span>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Gallery list
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-background">
      {/* Summary */}
      {gallery.length > 0 && (
        <div className="px-4 pt-4 pb-3">
          <div className="bg-primary/8 border border-primary/15 rounded-2xl px-4 py-3 flex justify-between items-center">
            <div>
              <p className="text-muted-foreground text-xs">Total Saved</p>
              <p className="text-primary font-bold text-lg">{gallery.length} receipts</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-xs">Combined Total</p>
              <p className="text-foreground font-bold">{formatCurrency(gallery.reduce((s, r) => s + r.total, 0), sym)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {gallery.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
              <ImageOff className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-foreground font-semibold text-sm">No Saved Receipts</p>
              <p className="text-muted-foreground text-xs mt-1">
                Complete a sale and tap "Save Receipt" to save it here
              </p>
            </div>
          </div>
        ) : (
          gallery.map((record) => {
            const sale = getSale(record.saleId);
            return (
              <button
                key={record.id}
                onClick={() => setSelectedRecord(record)}
                className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3.5 text-left active:scale-[0.99] transition-transform shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-semibold text-sm">{record.receiptNo}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-muted-foreground text-xs">
                      {record.itemCount} items
                    </p>
                    {record.customerName && (
                      <p className="text-muted-foreground text-xs">· {record.customerName}</p>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {new Date(record.savedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-primary font-bold text-sm">{formatCurrency(record.total, sym)}</p>
                    {sale && (
                      <span className={`text-xs font-medium ${sale.status === 'completed' ? 'text-success' : 'text-destructive'}`}>
                        {sale.status}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function GRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-foreground text-right ml-4 ${valueClass ?? ''}`}>{value}</span>
    </div>
  );
}
