'use client';

import { useState, useRef } from 'react';
import { usePOS } from '@/lib/pos-context';
import {
  formatCurrency, generateId, Product, Category, Unit,
  VariantType, VariantOption,
} from '@/lib/pos-store';
import {
  Search, Plus, Edit2, Trash2, X, Check, Tag, Package, Ruler,
  ChevronDown, ChevronUp, Image as ImageIcon, Layers, DollarSign, Truck, AlertCircle,
} from 'lucide-react';
import { PriceLock } from '@/components/pos/wholesale-lock';

type Tab = 'products' | 'categories' | 'units';

// Exported for use in suppliers-screen
export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export const inputCls = 'w-full px-3.5 py-2.5 bg-secondary border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all';
export const selectCls = 'w-full px-3.5 py-2.5 bg-secondary border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 appearance-none transition-all';

export function ProductsScreen() {
  const { state, dispatch } = usePOS();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('products');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');

  const [showProductForm, setShowProductForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);

  const isAdmin = state.currentUser?.role === 'admin';
  const sym = state.settings.currencySymbol;
  const priceLockerPin = state.settings.priceLockerPassword;

  const filteredProducts = state.products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.categoryId === categoryFilter;
    const matchesStock =
      stockFilter === 'all' ? true
      : stockFilter === 'in-stock' ? p.stock > 10
      : stockFilter === 'low-stock' ? p.stock > 0 && p.stock <= 10
      : p.stock === 0;

    return matchesSearch && matchesCategory && matchesStock;
  });

  if (showCatForm) {
    return <CategoryForm category={editCategory}
      onSave={(cat) => { dispatch({ type: 'SAVE_CATEGORY', category: cat }); setShowCatForm(false); }}
      onClose={() => setShowCatForm(false)} />;
  }
  if (showUnitForm) {
    return <UnitForm unit={editUnit}
      onSave={(unit) => { dispatch({ type: 'SAVE_UNIT', unit }); setShowUnitForm(false); }}
      onClose={() => setShowUnitForm(false)} />;
  }
  if (showProductForm) {
    return <ProductForm product={editProduct} categories={state.categories} units={state.units}
      suppliers={state.suppliers} sym={sym} isAdmin={isAdmin}
      onSave={(product) => { dispatch({ type: 'SAVE_PRODUCT', product }); setShowProductForm(false); }}
      onClose={() => setShowProductForm(false)}
      onAddUnit={() => { setEditUnit(null); setShowUnitForm(true); }} />;
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Tab bar */}
      <div className="flex gap-1.5 px-4 pt-4 pb-3">
        {(['products', 'categories', 'units'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
              tab === t ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary text-muted-foreground'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Products tab */}
      {tab === 'products' && (
        <>
          <div className="flex gap-2 px-4 pb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            {isAdmin && (
              <button onClick={() => { setEditProduct(null); setShowProductForm(true); }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-primary rounded-xl text-primary-foreground text-sm font-semibold shrink-0 shadow-sm">
                <Plus className="w-4 h-4" /> Add
              </button>
            )}
          </div>
          <div className="flex gap-2 px-4 pb-3">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className={`${selectCls} flex-1`}
            >
              <option value="all">All Categories</option>
              {state.categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <select
              value={stockFilter}
              onChange={e => setStockFilter(e.target.value as 'all' | 'in-stock' | 'low-stock' | 'out-of-stock')}
              className={`${selectCls} flex-1`}
            >
              <option value="all">All Stock</option>
              <option value="in-stock">In Stock</option>
              <option value="low-stock">Low Stock</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
            {filteredProducts.length === 0 ? (
              <EmptyState icon={<Package className="w-10 h-10" />} label="No products found" />
            ) : (
              filteredProducts.map(product => (
                <ProductRow key={product.id} product={product} categories={state.categories} units={state.units} sym={sym} isAdmin={isAdmin} priceLockerPin={priceLockerPin}
                  onEdit={() => { setEditProduct(product); setShowProductForm(true); }}
                  onDelete={() => setProductToDelete(product)} />
              ))
            )}
          </div>
        </>
      )}

      {/* Categories tab */}
      {tab === 'categories' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between px-4 pb-3">
            <p className="text-muted-foreground text-xs">{state.categories.length} categories</p>
            {isAdmin && (
              <button onClick={() => { setEditCategory(null); setShowCatForm(true); }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-primary rounded-xl text-primary-foreground text-xs font-semibold shadow-sm">
                <Plus className="w-3.5 h-3.5" /> Add Category
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
            {state.categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 shadow-xs">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: cat.color + '22' }}>
                  <Tag className="w-4 h-4" style={{ color: cat.color }} />
                </div>
                <p className="flex-1 text-foreground font-semibold text-sm">{cat.name}</p>
                <p className="text-muted-foreground text-xs">{state.products.filter(p => p.categoryId === cat.id).length} products</p>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button onClick={() => { setEditCategory(cat); setShowCatForm(true); }} className="p-1.5 rounded-lg bg-secondary">
                      <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => dispatch({ type: 'DELETE_CATEGORY', id: cat.id })} className="p-1.5 rounded-lg bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Units tab */}
      {tab === 'units' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between px-4 pb-3">
            <p className="text-muted-foreground text-xs">{state.units.length} units</p>
            {isAdmin && (
              <button onClick={() => { setEditUnit(null); setShowUnitForm(true); }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-primary rounded-xl text-primary-foreground text-xs font-semibold shadow-sm">
                <Plus className="w-3.5 h-3.5" /> Add Unit
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
            {state.units.length === 0 ? (
              <EmptyState icon={<Ruler className="w-10 h-10" />} label="No units yet" />
            ) : (
              state.units.map(unit => (
                <div key={unit.id} className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 shadow-xs">
                  <div className="w-9 h-9 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
                    <Ruler className="w-4 h-4 text-info" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-semibold text-sm">{unit.name}</p>
                    <p className="text-muted-foreground text-xs">{unit.abbreviation}{unit.allowDecimal ? ' · decimal' : ''}</p>
                  </div>
                  <p className="text-muted-foreground text-xs">{state.products.filter(p => p.unitId === unit.id).length} products</p>
                  {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setEditUnit(unit); setShowUnitForm(true); }} className="p-1.5 rounded-lg bg-secondary">
                        <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => dispatch({ type: 'DELETE_UNIT', id: unit.id })} className="p-1.5 rounded-lg bg-destructive/10">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setProductToDelete(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border shadow-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="space-y-1">
              <h3 className="text-foreground font-bold text-lg">Delete Product?</h3>
              <p className="text-sm text-muted-foreground">
                This will permanently remove <span className="font-semibold text-foreground">{productToDelete.name}</span>.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  dispatch({ type: 'DELETE_PRODUCT', id: productToDelete.id });
                  setProductToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product Row (reusable card)
// ---------------------------------------------------------------------------
function ProductRow({ product, categories, units, sym, isAdmin, priceLockerPin, onEdit, onDelete }: {
  product: Product;
  categories: { id: string; name: string; color: string }[];
  units: { id: string; abbreviation: string }[];
  sym: string;
  isAdmin: boolean;
  priceLockerPin: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cat = categories.find(c => c.id === product.categoryId);
  const unit = units.find(u => u.id === product.unitId);
  const hasVariants = product.variants.length > 0;
  const margin = product.costPrice > 0
    ? Math.round(((product.price - product.costPrice) / product.price) * 100)
    : null;
  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 shadow-xs">
      {product.image ? (
        <img src={product.image} alt={product.name} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-border" />
      ) : (
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: (cat?.color ?? '#22c55e') + '22' }}>
          <Package className="w-5 h-5" style={{ color: cat?.color ?? '#22c55e' }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-foreground font-semibold text-sm leading-tight">{product.name}</p>
          {hasVariants && (
            <span className="text-xs px-1.5 py-0.5 rounded-md bg-info/10 text-info font-medium">
              <Layers className="w-3 h-3 inline mr-0.5" />{product.variants.length} var
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {cat && (
            <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ backgroundColor: cat.color + '1a', color: cat.color }}>
              {cat.name}
            </span>
          )}
          {unit && <span className="text-muted-foreground text-xs">{unit.abbreviation}</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-primary font-bold text-sm">{formatCurrency(product.price, sym)}</p>
        {product.wholesalePrice > 0 && (
          <div className="mt-0.5">
            <PriceLock priceLockerPin={priceLockerPin} price={product.wholesalePrice} sym={sym} isAdmin={isAdmin} product={product} costPrice={product.costPrice} retailPrice={product.price} />
          </div>
        )}
        {isAdmin && margin !== null && (
          <p className="text-xs text-success font-medium">{margin}% margin</p>
        )}
        <p className={`text-xs font-medium mt-0.5 ${product.stock <= 10 ? 'text-warning' : 'text-muted-foreground'}`}>
          {product.stock <= 10 ? `Low: ${product.stock}` : `${product.stock} in stock`}
        </p>
      </div>
      {isAdmin && (
        <div className="flex gap-1 ml-1 shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg bg-secondary">
            <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg bg-destructive/10">
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category Form
// ---------------------------------------------------------------------------
const CATEGORY_COLORS = ['#22c55e', '#f59e0b', '#3b82f6', '#a855f7', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

function CategoryForm({ category, onSave, onClose }: { category: Category | null; onSave: (c: Category) => void; onClose: () => void }) {
  const [name, setName] = useState(category?.name ?? '');
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0]);
  function handleSave() {
    if (!name.trim()) return;
    onSave({ id: category?.id ?? generateId(), name: name.trim(), color });
  }
  return (
    <FormScreen title={category ? 'Edit Category' : 'New Category'} onClose={onClose}>
      <FormField label="Category Name">
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Beverages" className={inputCls} autoFocus />
      </FormField>
      <FormField label="Color">
        <div className="flex flex-wrap gap-2.5">
          {CATEGORY_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-9 h-9 rounded-xl transition-all active:scale-90 ${color === c ? 'ring-2 ring-offset-2 ring-offset-background scale-110' : ''}`}
              style={{ backgroundColor: c, outlineColor: c }} />
          ))}
        </div>
      </FormField>
      <SaveButton onClick={handleSave} label="Save Category" />
    </FormScreen>
  );
}

// ---------------------------------------------------------------------------
// Unit Form
// ---------------------------------------------------------------------------
function UnitForm({ unit, onSave, onClose }: { unit: Unit | null; onSave: (u: Unit) => void; onClose: () => void }) {
  const [name, setName] = useState(unit?.name ?? '');
  const [abbreviation, setAbbreviation] = useState(unit?.abbreviation ?? '');
  const [allowDecimal, setAllowDecimal] = useState(unit?.allowDecimal ?? false);
  function handleSave() {
    if (!name.trim() || !abbreviation.trim()) return;
    onSave({ id: unit?.id ?? generateId(), name: name.trim(), abbreviation: abbreviation.trim(), allowDecimal });
  }
  return (
    <FormScreen title={unit ? 'Edit Unit' : 'New Unit'} onClose={onClose}>
      <FormField label="Unit Name *">
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kilogram" className={inputCls} autoFocus />
      </FormField>
      <FormField label="Abbreviation *">
        <input type="text" value={abbreviation} onChange={e => setAbbreviation(e.target.value)} placeholder="e.g. kg" className={inputCls} />
      </FormField>
      <FormField label="Allow Decimal Quantities">
        <button onClick={() => setAllowDecimal(!allowDecimal)}
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all ${allowDecimal ? 'bg-primary/10 border-primary/30' : 'bg-secondary border-border'}`}>
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${allowDecimal ? 'bg-primary border-primary' : 'border-border'}`}>
            {allowDecimal && <Check className="w-3 h-3 text-primary-foreground" />}
          </div>
          <span className={`text-sm font-medium ${allowDecimal ? 'text-primary' : 'text-muted-foreground'}`}>
            {allowDecimal ? 'Yes — e.g. 1.5 kg' : 'No — whole numbers only'}
          </span>
        </button>
      </FormField>
      <SaveButton onClick={handleSave} label="Save Unit" />
    </FormScreen>
  );
}

// ---------------------------------------------------------------------------
// Product Form
// ---------------------------------------------------------------------------
function ProductForm({
  product, categories, units, suppliers, sym, isAdmin, onSave, onClose, onAddUnit,
}: {
  product: Product | null;
  categories: Category[];
  units: Unit[];
  suppliers: { id: string; name: string }[];
  sym: string;
  isAdmin: boolean;
  onSave: (p: Product) => void;
  onClose: () => void;
  onAddUnit: () => void;
}) {
  const [name, setName] = useState(product?.name ?? '');
  const [price, setPrice] = useState(String(product?.price ?? ''));
  const [wholesalePrice, setWholesalePrice] = useState(String(product?.wholesalePrice ?? ''));
  const [costPrice, setCostPrice] = useState(String(product?.costPrice ?? ''));
  const [stock, setStock] = useState(String(product?.stock ?? ''));
  const [sku, setSku] = useState(product?.sku ?? '');
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? '');
  const [unitId, setUnitId] = useState(product?.unitId ?? units[0]?.id ?? '');
  const [supplierId, setSupplierId] = useState(product?.supplierId ?? '');
  const [image, setImage] = useState(product?.image ?? '');
  const [variants, setVariants] = useState<VariantType[]>(product?.variants ?? []);
  const [showVariants, setShowVariants] = useState((product?.variants ?? []).length > 0);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target?.result as string ?? '');
    reader.readAsDataURL(file);
  }

  function addVariantType() {
    const newType: VariantType = {
      id: generateId(),
      name: 'Type',
      options: [{ id: generateId(), label: 'Option 1', priceAdjust: 0, stock: 0 }],
    };
    setVariants([...variants, newType]);
  }

  function updateVariantTypeName(typeId: string, name: string) {
    setVariants(variants.map(vt => vt.id === typeId ? { ...vt, name } : vt));
  }

  function removeVariantType(typeId: string) {
    setVariants(variants.filter(vt => vt.id !== typeId));
  }

  function addOption(typeId: string) {
    setVariants(variants.map(vt => vt.id === typeId
      ? { ...vt, options: [...vt.options, { id: generateId(), label: '', priceAdjust: 0, stock: 0 }] }
      : vt
    ));
  }

  function updateOption(typeId: string, optId: string, field: keyof VariantOption, value: string | number) {
    setVariants(variants.map(vt => vt.id === typeId
      ? { ...vt, options: vt.options.map(o => o.id === optId ? { ...o, [field]: value } : o) }
      : vt
    ));
  }

  function removeOption(typeId: string, optId: string) {
    setVariants(variants.map(vt => vt.id === typeId
      ? { ...vt, options: vt.options.filter(o => o.id !== optId) }
      : vt
    ));
  }

  function handleSave() {
    if (!name.trim() || !price || !supplierId) return;
    onSave({
      id: product?.id ?? generateId(),
      name: name.trim(),
      price: parseFloat(price) || 0,
      wholesalePrice: parseFloat(wholesalePrice) || 0,
      costPrice: parseFloat(costPrice) || 0,
      stock: parseInt(stock) || 0,
      sku: sku.trim(),
      categoryId,
      unitId,
      supplierId,
      image,
      active: product?.active ?? true,
      variants,
    });
  }

  const margin = parseFloat(price) > 0 && parseFloat(costPrice) > 0
    ? Math.round(((parseFloat(price) - parseFloat(costPrice)) / parseFloat(price)) * 100)
    : null;

  return (
    <FormScreen title={product ? 'Edit Product' : 'New Product'} onClose={onClose}>
      {/* Photo */}
      <FormField label="Product Photo">
        <div className="flex items-center gap-3">
          <div
            className="w-20 h-20 rounded-2xl border-2 border-dashed border-border bg-secondary flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {image ? (
              <img src={image} alt="product" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                <span className="text-xs text-muted-foreground/60">Tap to add</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs font-medium text-foreground hover:border-primary/30 transition-colors">
              Choose Photo
            </button>
            {image && (
              <button type="button" onClick={() => setImage('')}
                className="px-3 py-1.5 bg-destructive/10 border border-destructive/20 rounded-lg text-xs font-medium text-destructive">
                Remove
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </div>
      </FormField>

      <FormField label="Product Name *">
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Coca Cola 330ml" className={inputCls} autoFocus />
      </FormField>

      {/* Price row */}
      <div className="grid grid-cols-3 gap-3">
        <FormField label={`Retail Price (${sym}) *`}>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" className={inputCls} />
        </FormField>
        <FormField label={`Wholesale (${sym})`}>
          <input type="number" value={wholesalePrice} onChange={e => setWholesalePrice(e.target.value)} placeholder="0" className={inputCls} />
        </FormField>
        <FormField label={`Cost (${sym})`}>
          <input type="number" value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="0" className={inputCls} />
        </FormField>
      </div>
      {isAdmin && margin !== null && (
        <div className="flex items-center gap-2 bg-success/10 border border-success/20 rounded-xl px-3 py-2 -mt-1">
          <DollarSign className="w-3.5 h-3.5 text-success" />
          <p className="text-success text-xs font-medium">Profit margin: {margin}% · Profit per unit: {formatCurrency(parseFloat(price) - parseFloat(costPrice), sym)}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Stock Qty">
          <input type="number" value={stock} onChange={e => setStock(e.target.value)} placeholder="0" className={inputCls} />
        </FormField>
        <FormField label="SKU / Barcode">
          <input type="text" value={sku} onChange={e => setSku(e.target.value)} placeholder="e.g. BEV001" className={inputCls} />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Category">
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={selectCls}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FormField>
        <FormField label="Unit of Measure">
          <div className="flex gap-2">
            <select value={unitId} onChange={e => setUnitId(e.target.value)} className={`${selectCls} flex-1`}>
              {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
            </select>
            <button type="button" onClick={onAddUnit}
              className="flex items-center gap-1 px-2.5 py-2 bg-secondary border border-border rounded-xl text-muted-foreground text-xs hover:bg-primary/10 hover:text-primary transition-colors shrink-0">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </FormField>
      </div>

      <FormField label="Supplier *">
        {suppliers.length === 0 ? (
          <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-xl px-3 py-3">
            <AlertCircle className="w-4 h-4 text-warning shrink-0" />
            <p className="text-warning text-xs font-medium">No suppliers yet. Go to Suppliers screen to add one first.</p>
          </div>
        ) : (
          <div className="relative">
            <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <select
              value={supplierId}
              onChange={e => setSupplierId(e.target.value)}
              className={`${selectCls} pl-9 ${!supplierId ? 'border-destructive/40 ring-1 ring-destructive/20' : ''}`}
            >
              <option value="">— Select a supplier (required) —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        {!supplierId && suppliers.length > 0 && (
          <p className="text-destructive text-xs mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Supplier is required
          </p>
        )}
      </FormField>

      {/* Variants */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowVariants(!showVariants)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-info" />
            Product Variants
            {variants.length > 0 && (
              <span className="bg-info/15 text-info text-xs font-semibold px-2 py-0.5 rounded-full">{variants.length}</span>
            )}
          </div>
          {showVariants ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showVariants && (
          <div className="border-t border-border px-4 py-3 space-y-4">
            <p className="text-muted-foreground text-xs">Add variant types like Color, Size, or Flavor. Each type can have multiple options.</p>
            {variants.map(vt => (
              <div key={vt.id} className="bg-secondary rounded-xl p-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={vt.name}
                    onChange={e => updateVariantTypeName(vt.id, e.target.value)}
                    placeholder="e.g. Color, Size, Flavor"
                    className="flex-1 px-2.5 py-1.5 bg-card border border-border rounded-lg text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button onClick={() => removeVariantType(vt.id)} className="p-1.5 rounded-lg bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
                {/* Options */}
                <div className="space-y-2">
                  {vt.options.map(opt => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt.label}
                        onChange={e => updateOption(vt.id, opt.id, 'label', e.target.value)}
                        placeholder="Option name"
                        className="flex-1 px-2.5 py-1.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">{'+' + sym}</span>
                        <input
                          type="number"
                          value={opt.priceAdjust || ''}
                          onChange={e => updateOption(vt.id, opt.id, 'priceAdjust', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-20 pl-8 pr-2 py-1.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <input
                        type="number"
                        value={opt.stock || ''}
                        onChange={e => updateOption(vt.id, opt.id, 'stock', parseInt(e.target.value) || 0)}
                        placeholder="Stock"
                        className="w-16 px-2 py-1.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        title="Stock for this option"
                      />
                      {vt.options.length > 1 && (
                        <button onClick={() => removeOption(vt.id, opt.id)} className="p-1 rounded-lg hover:bg-destructive/10 transition-colors">
                          <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => addOption(vt.id)}
                  className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline">
                  <Plus className="w-3.5 h-3.5" /> Add option
                </button>
              </div>
            ))}
            <button onClick={addVariantType}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm hover:border-primary/40 hover:text-primary transition-colors">
              <Plus className="w-4 h-4" /> Add Variant Type
            </button>
          </div>
        )}
      </div>

      <SaveButton onClick={handleSave} label={product ? 'Update Product' : 'Add Product'} />
    </FormScreen>
  );
}

// ---------------------------------------------------------------------------
// Shared UI helpers
// ---------------------------------------------------------------------------
export function FormScreen({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-background">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-card">
        <button onClick={onClose} className="p-2 rounded-xl bg-secondary">
          <X className="w-4 h-4 text-foreground" />
        </button>
        <h2 className="font-bold text-foreground text-base">{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {children}
      </div>
    </div>
  );
}

export function SaveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className="w-full py-3.5 bg-primary text-primary-foreground rounded-2xl font-bold text-sm active:scale-[0.98] transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2">
      <Check className="w-4 h-4" /> {label}
    </button>
  );
}

export function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground/30">
        {icon}
      </div>
      <p className="text-muted-foreground text-sm font-medium">{label}</p>
    </div>
  );
}
