'use client';

/**
 * PriceLock — admin-only feature that hides prices behind a PIN prompt.
 * Only displayed to admin users. Prevents non-admin staff from viewing
 * cost, wholesale, and retail prices until they enter the correct PIN.
 */

import { useState, useRef, useEffect } from 'react';
import { Lock, LockOpen, Eye, EyeOff, X } from 'lucide-react';
import { Product, formatCurrency } from '@/lib/pos-store';

interface Props {
  priceLockerPin: string;
  price: number;
  sym: string;
  isAdmin: boolean;
  /** Full product object to show details and variants */
  product?: Product;
  /** Cost price (original price) */
  costPrice?: number;
  /** Retail price (sell price) */
  retailPrice?: number;
  /** Optional label prefix, e.g. "W" */
  label?: string;
  className?: string;
}

export function PriceLock({ priceLockerPin, price, sym, isAdmin, label = 'P', className = '', costPrice, retailPrice, product }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<{ typeId: string; optionId: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showModal) {
      setPin('');
      setError(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [showModal]);

  function handleReveal() {
    if (revealed) {
      setRevealed(false);
      return;
    }
    setShowModal(true);
  }

  function handleSubmit() {
    if (pin === priceLockerPin) {
      setRevealed(true);
      setPin('');
      setError(false);
      // Keep modal open to show product details
    } else {
      setError(true);
      setPin('');
    }
  }

  function formatPrice(n: number) {
    return formatCurrency(n, sym);
  }

  // Calculate variant adjustment
  function getVariantAdjustment(): number {
    if (!product || !selectedVariant) return 0;
    const option = product.variants
      .flatMap(vt => vt.options)
      .find(o => o.id === selectedVariant.optionId);
    return option?.priceAdjust ?? 0;
  }

  const variantAdj = getVariantAdjustment();
  const adjustedWholesale = price + variantAdj;
  const adjustedRetail = (retailPrice ?? 0) + variantAdj;
  const adjustedCost = (costPrice ?? 0) + variantAdj;

  // Admin-only visibility check - only show price lock to admins
  if (!isAdmin) {
    return null;
  }

  return (
    <>
      {/* Reveal toggle — div role="button" to avoid nested button errors */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleReveal}
        onKeyDown={e => e.key === 'Enter' && handleReveal()}
        className={`inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs font-semibold transition-all select-none cursor-pointer
          ${revealed
            ? 'bg-info/10 text-info border border-info/20'
            : 'bg-muted text-muted-foreground border border-border hover:border-primary/30 hover:text-foreground'
          } ${className}`}
      >
        {revealed ? (
          <>
            <LockOpen className="w-3 h-3 shrink-0" />
            <span>View Prices</span>
            <EyeOff className="w-3 h-3 shrink-0 opacity-60" />
          </>
        ) : (
          <>
            <Lock className="w-3 h-3 shrink-0" />
            <span>{label}: ••••••</span>
          </>
        )}
      </div>

      {/* PIN modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" />
          <div
            className="relative bg-card border border-border rounded-3xl shadow-2xl w-full max-w-xs p-6"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-secondary"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl bg-info/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-info" />
            </div>

            <h3 className="text-foreground font-bold text-base text-center mb-1">Price Details</h3>
            <p className="text-muted-foreground text-xs text-center mb-4">Enter PIN to view prices</p>

            {!revealed && (
              <>
                <input
                  ref={inputRef}
                  type="password"
                  value={pin}
                  onChange={e => { setPin(e.target.value); setError(false); }}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="PIN"
                  maxLength={4}
                  className={`w-full rounded-xl border px-4 py-3 text-sm text-foreground bg-secondary outline-none text-center tracking-widest
                    ${error ? 'border-destructive ring-1 ring-destructive/30' : 'border-border focus:border-primary focus:ring-1 focus:ring-primary/20'}`}
                />
                {error && (
                  <p className="text-destructive text-xs text-center mt-1.5 font-medium">Wrong PIN. Try again.</p>
                )}

                <button
                  onClick={handleSubmit}
                  className="mt-4 w-full bg-primary text-primary-foreground font-semibold text-sm rounded-xl py-3 active:opacity-80 transition-opacity flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Reveal Prices
                </button>
              </>
            )}

            {revealed && (
              <>
                {/* Product Details */}
                {product ? (
                  <div className="mb-4 space-y-3">
                    <div className="flex gap-3">
                      {product.image && (
                        <img src={product.image} alt={product.name} className="w-16 h-16 rounded-lg object-cover border border-border shrink-0" />
                      )}
                      <div className="flex-1">
                        <h4 className="text-foreground font-bold text-sm leading-tight mb-1">{product.name}</h4>
                        <p className="text-muted-foreground text-xs mb-1">SKU: {product.sku}</p>
                        {product.stock > 0 && (
                          <p className="text-success text-xs font-medium">{product.stock} in stock</p>
                        )}
                      </div>
                    </div>

                    {/* Variant Selection */}
                    {product.variants && product.variants.length > 0 && (
                      <div className="space-y-2">
                        {product.variants.map(varType => (
                          <div key={varType.id} className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground">{varType.name}</label>
                            <div className="flex gap-1.5 flex-wrap">
                              {varType.options.map(opt => (
                                <button
                                  key={opt.id}
                                  onClick={() => setSelectedVariant({ typeId: varType.id, optionId: opt.id })}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                    selectedVariant?.optionId === opt.id
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                                  }`}
                                >
                                  {opt.label}
                                  {opt.priceAdjust !== 0 && (
                                    <span className="text-xs ml-1 opacity-75">
                                      {formatCurrency(opt.priceAdjust, sym)}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-4 p-3 rounded-lg bg-secondary/50 border border-border">
                    <p className="text-muted-foreground text-xs text-center">Product details not available</p>
                  </div>
                )}

                {/* Prices with variant adjustments */}
                <div className="space-y-2.5 mb-4">
                  {costPrice !== undefined && costPrice > 0 && (
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 border border-border">
                      <span className="text-xs text-muted-foreground font-medium">Original Price (Cost)</span>
                      <span className="text-sm font-bold text-foreground">{formatPrice(adjustedCost)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-info/10 border border-info/20">
                    <span className="text-xs text-info font-medium">Wholesale Price</span>
                    <span className="text-sm font-bold text-info">{formatPrice(adjustedWholesale)}</span>
                  </div>
                  {retailPrice !== undefined && retailPrice > 0 && (
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 border border-border">
                      <span className="text-xs text-muted-foreground font-medium">Retail Price (Sell)</span>
                      <span className="text-sm font-bold text-foreground">{formatPrice(adjustedRetail)}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="w-full bg-secondary text-foreground font-semibold text-sm rounded-xl py-2.5 active:opacity-80 transition-opacity"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
// PriceLock component v3 - complete and ready for production
