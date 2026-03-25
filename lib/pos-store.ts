// POS Global State Store (React Context + useReducer — mirrors SQLite schema)

export type Role = 'admin' | 'manager' | 'staff';

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
  password: string;
  active: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  type: 'regular' | 'wholesale';
  active: boolean;
  notes: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  allowDecimal: boolean;
}

/** A variant option value, e.g. { label: 'Red' } or { label: 'Large' } */
export interface VariantOption {
  id: string;
  label: string;
  priceAdjust: number; // added to base price
  stock: number;
}

/** A variant type, e.g. Color, Size, Type */
export interface VariantType {
  id: string;
  name: string; // e.g. 'Color', 'Size'
  options: VariantOption[];
}

export interface Product {
  id: string;
  name: string;
  price: number;          // base retail selling price
  wholesalePrice: number; // wholesale selling price (shown to wholesale customers)
  costPrice: number;      // purchase/cost price for profit calculation
  categoryId: string;
  unitId: string;
  supplierId: string;     // linked supplier
  sku: string;
  stock: number;
  image: string;          // base64 or URL
  active: boolean;
  variants: VariantType[];
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  notes: string;
  active: boolean;
}

export interface VoucherPaymentRecord {
  id: string;
  date: string;
  amount: number;
  remark: string;
  createdAt: string;
}

/** An operational/overhead cost line on a purchase voucher (transport, electricity, etc.) */
export interface OperationalCost {
  id: string;
  label: string;   // e.g. "Transportation", "Electricity"
  amount: number;
}

/** A purchase voucher from a supplier */
export interface SupplierVoucher {
  id: string;
  supplierId: string;
  voucherNo: string;
  date: string;
  items: VoucherItem[];
  operationalCosts: OperationalCost[]; // overhead costs for this order
  totalAmount: number;   // product costs only
  grandTotal: number;    // totalAmount + sum of operationalCosts
  notes: string;
  image?: string;        // voucher receipt/document image (base64 or URL)
  paidAmount: number;    // amount already paid
  balanceDue: number;    // grandTotal - paidAmount
  paymentStatus: 'unpaid' | 'partial' | 'paid'; // payment status
  paymentHistory: VoucherPaymentRecord[];
  createdAt: string;
}

export interface VoucherItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  total: number;
}

/** Day session — opening/closing cash drawer */
export interface DaySession {
  id: string;
  date: string;
  openingCash: number;
  closingCash: number | null;
  openedAt: string;
  closedAt: string | null;
  openedBy: string;
  totalSales: number;
  sessionNotes: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  selectedVariant: { typeId: string; optionId: string } | null; // chosen variant
  customPriceOverride?: boolean;
}

export interface SaleItem {
  productId: string;
  productName: string;
  variantLabel: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface SalePaymentRecord {
  id: string;
  date: string;
  amount: number;
  remark: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  date: string;
  time: string;
  sessionId: string | null;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'debt';
  amountPaid: number;
  change: number;
  customerId: string | null;
  staffId: string;
  status: 'completed' | 'voided';
  receiptNo: string;
  couponCode?: string | null;
  couponDiscount?: number;
  paymentHistory?: SalePaymentRecord[];
}

/** A saved receipt in the gallery */
export interface ReceiptRecord {
  id: string;
  saleId: string;
  receiptNo: string;
  savedAt: string;
  total: number;
  itemCount: number;
  customerName: string | null;
}

export interface Coupon {
  id: string;
  code: string;
  amount: number;
  active: boolean;
  used: boolean;
  createdAt: string;
  createdBy: string;
  sourceSaleId: string | null;
}

export interface StoreSettings {
  shopName: string;
  address: string;
  phone: string;
  receiptHeader: string;
  receiptFooter: string;
  currency: string;
  currencySymbol: string;
  priceLockerPassword: string;
  posTextScale: number;
  posDefaultGridCols: number;
}

export const defaultStoreSettings: StoreSettings = {
  shopName: 'My Shop',
  address: '123 Main Street, Yangon',
  phone: '09-000-1234',
  receiptHeader: 'Thank you for shopping!',
  receiptFooter: 'Please come again.',
  currency: 'MMK',
  currencySymbol: 'Ks',
  priceLockerPassword: '0000',
  posTextScale: 0,
  posDefaultGridCols: 4,
};

export interface POSState {
  currentUser: User | null;
  users: User[];
  customers: Customer[];
  categories: Category[];
  units: Unit[];
  products: Product[];
  suppliers: Supplier[];
  supplierVouchers: SupplierVoucher[];
  sales: Sale[];
  coupons: Coupon[];
  receiptGallery: ReceiptRecord[];
  daySession: DaySession | null;      // current open session
  pastSessions: DaySession[];
  cart: CartItem[];
  selectedCustomer: Customer | null;
  settings: StoreSettings;
  activeScreen: Screen;
  isLoggedIn: boolean;
}

export type Screen =
  | 'login'
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'sales-log'
  | 'reports'
  | 'customers'
  | 'users'
  | 'suppliers'
  | 'coupons'
  | 'settings'
  | 'receipt-gallery'
  | 'day-session';

export type POSAction =
  | { type: 'LOGIN'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_SCREEN'; screen: Screen }
  | { type: 'ADD_TO_CART'; product: Product; variant?: { typeId: string; optionId: string }; unitPrice?: number }
  | { type: 'REMOVE_FROM_CART'; cartKey: string }
  | { type: 'UPDATE_CART_QTY'; cartKey: string; quantity: number }
  | { type: 'UPDATE_CART_DISCOUNT'; cartKey: string; discount: number }
  | { type: 'UPDATE_CART_PRICE'; cartKey: string; price: number }
  | { type: 'UPDATE_CART_VARIANT'; cartKey: string; variant: { typeId: string; optionId: string } | null }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_CUSTOMER'; customer: Customer | null }
  | { type: 'COMPLETE_SALE'; sale: Sale }
  | { type: 'SAVE_SALE'; sale: Sale }
  | { type: 'SAVE_PRODUCT'; product: Product }
  | { type: 'DELETE_PRODUCT'; id: string }
  | { type: 'SAVE_CUSTOMER'; customer: Customer }
  | { type: 'DELETE_CUSTOMER'; id: string }
  | { type: 'SAVE_USER'; user: User }
  | { type: 'DELETE_USER'; id: string }
  | { type: 'SAVE_CATEGORY'; category: Category }
  | { type: 'DELETE_CATEGORY'; id: string }
  | { type: 'SAVE_UNIT'; unit: Unit }
  | { type: 'DELETE_UNIT'; id: string }
  | { type: 'SAVE_SUPPLIER'; supplier: Supplier }
  | { type: 'SAVE_VOUCHER'; voucher: SupplierVoucher }
  | { type: 'DELETE_VOUCHER'; id: string }
  | { type: 'OPEN_DAY_SESSION'; session: DaySession }
  | { type: 'CLOSE_DAY_SESSION'; closingCash: number; notes: string }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<StoreSettings> }
  | { type: 'SAVE_RECEIPT_TO_GALLERY'; record: ReceiptRecord }
  | { type: 'DELETE_RECEIPT_FROM_GALLERY'; id: string }
  | { type: 'SAVE_COUPON'; coupon: Coupon }
  | { type: 'DELETE_COUPON'; id: string }
  | { type: 'MARK_COUPON_USED'; id: string };

// ---------------------------------------------------------------------------
// Cart key helper — identifies a cart item uniquely (product + variant combo)
// ---------------------------------------------------------------------------
export function cartKey(productId: string, variant?: { typeId: string; optionId: string } | null): string {
  if (!variant) return productId;
  return `${productId}__${variant.typeId}__${variant.optionId}`;
}

function getCustomerCartPrice(product: Product, customer: Customer | null, variant?: { typeId: string; optionId: string } | null): number {
  const variantPriceAdj = variant
    ? (product.variants.flatMap(vt => vt.options).find(o => o.id === variant.optionId)?.priceAdjust ?? 0)
    : 0;
  const basePrice = customer?.type === 'wholesale' ? product.wholesalePrice : product.price;
  return basePrice + variantPriceAdj;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const SEED_USERS: User[] = [
  { id: 'u1', name: 'Admin User', username: 'admin', role: 'admin', password: '1234', active: true, createdAt: '2024-01-01' },
  { id: 'u2', name: 'Staff One', username: 'staff', role: 'staff', password: '1234', active: true, createdAt: '2024-01-02' },
];

const SEED_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Beverages', color: '#22c55e' },
  { id: 'c2', name: 'Snacks', color: '#f59e0b' },
  { id: 'c3', name: 'Household', color: '#3b82f6' },
  { id: 'c4', name: 'Apparel', color: '#a855f7' },
];

const SEED_UNITS: Unit[] = [
  { id: 'un1', name: 'Piece', abbreviation: 'pcs', allowDecimal: false },
  { id: 'un2', name: 'Kilogram', abbreviation: 'kg', allowDecimal: true },
  { id: 'un3', name: 'Bottle', abbreviation: 'btl', allowDecimal: false },
  { id: 'un4', name: 'Pack', abbreviation: 'pk', allowDecimal: false },
  { id: 'un5', name: 'Box', abbreviation: 'box', allowDecimal: false },
];

const SEED_PRODUCTS: Product[] = [
  {
    id: 'p1', name: 'Coca Cola 330ml', price: 500, wholesalePrice: 450, costPrice: 350,
    categoryId: 'c1', unitId: 'un3', supplierId: 's2', sku: 'BEV001', stock: 120, image: '', active: true,
    variants: [],
  },
  {
    id: 'p2', name: 'Pepsi 330ml', price: 450, wholesalePrice: 400, costPrice: 300,
    categoryId: 'c1', unitId: 'un3', supplierId: 's2', sku: 'BEV002', stock: 95, image: '', active: true,
    variants: [],
  },
  {
    id: 'p3', name: 'Water 500ml', price: 200, wholesalePrice: 170, costPrice: 120,
    categoryId: 'c1', unitId: 'un3', supplierId: 's2', sku: 'BEV003', stock: 200, image: '', active: true,
    variants: [],
  },
  {
    id: 'p4', name: 'Lays Chips', price: 600, wholesalePrice: 540, costPrice: 420,
    categoryId: 'c2', unitId: 'un1', supplierId: 's1', sku: 'SNK001', stock: 60, image: '', active: true,
    variants: [
      {
        id: 'vt1', name: 'Flavor',
        options: [
          { id: 'vo1', label: 'Classic Salted', priceAdjust: 0, stock: 20 },
          { id: 'vo2', label: 'BBQ', priceAdjust: 50, stock: 25 },
          { id: 'vo3', label: 'Sour Cream', priceAdjust: 50, stock: 15 },
        ],
      },
    ],
  },
  {
    id: 'p5', name: 'T-Shirt', price: 5000, wholesalePrice: 4200, costPrice: 2800,
    categoryId: 'c4', unitId: 'un1', supplierId: 's1', sku: 'APP001', stock: 48, image: '', active: true,
    variants: [
      {
        id: 'vt2', name: 'Color',
        options: [
          { id: 'vo4', label: 'White', priceAdjust: 0, stock: 15 },
          { id: 'vo5', label: 'Black', priceAdjust: 0, stock: 18 },
          { id: 'vo6', label: 'Blue', priceAdjust: 200, stock: 15 },
        ],
      },
      {
        id: 'vt3', name: 'Size',
        options: [
          { id: 'vo7', label: 'S', priceAdjust: 0, stock: 12 },
          { id: 'vo8', label: 'M', priceAdjust: 0, stock: 18 },
          { id: 'vo9', label: 'L', priceAdjust: 0, stock: 18 },
        ],
      },
    ],
  },
  {
    id: 'p6', name: 'Instant Noodles', price: 300, wholesalePrice: 260, costPrice: 200,
    categoryId: 'c2', unitId: 'un4', supplierId: 's1', sku: 'SNK003', stock: 150, image: '', active: true,
    variants: [],
  },
  {
    id: 'p7', name: 'Detergent 1kg', price: 2500, wholesalePrice: 2200, costPrice: 1600,
    categoryId: 'c3', unitId: 'un2', supplierId: 's1', sku: 'HH001', stock: 40, image: '', active: true,
    variants: [],
  },
  {
    id: 'p8', name: 'Shampoo 200ml', price: 1800, wholesalePrice: 1550, costPrice: 1100,
    categoryId: 'c3', unitId: 'un3', supplierId: 's1', sku: 'PC001', stock: 35, image: '', active: true,
    variants: [
      {
        id: 'vt4', name: 'Type',
        options: [
          { id: 'vo10', label: 'Anti-Dandruff', priceAdjust: 0, stock: 15 },
          { id: 'vo11', label: 'Smooth & Silky', priceAdjust: 200, stock: 20 },
        ],
      },
    ],
  },
];

const SEED_CUSTOMERS: Customer[] = [
  { id: 'cust1', name: 'Ko Aung', phone: '09-123-456', type: 'regular', active: true, notes: '', createdAt: '2024-01-10' },
  { id: 'cust2', name: 'Ma Hnin', phone: '09-234-567', type: 'wholesale', active: true, notes: 'Wholesale buyer', createdAt: '2024-01-12' },
];

const SEED_SUPPLIERS: Supplier[] = [
  { id: 's1', name: 'ABC Trading Co.', contact: '09-777-111', notes: 'Main supplier', active: true },
  { id: 's2', name: 'XYZ Distributor', contact: '09-888-222', notes: 'Beverages only', active: true },
];

const SEED_COUPONS: Coupon[] = [];

const SEED_VOUCHERS: SupplierVoucher[] = [
  {
    id: 'v1', supplierId: 's1', voucherNo: 'PV-001',
    date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    items: [
      { productId: 'p4', productName: 'Lays Chips', quantity: 50, unitCost: 420, total: 21000 },
      { productId: 'p6', productName: 'Instant Noodles', quantity: 100, unitCost: 200, total: 20000 },
    ],
    operationalCosts: [
      { id: 'oc1', label: 'Transportation', amount: 2000 },
      { id: 'oc2', label: 'Loading Fee', amount: 500 },
    ],
    totalAmount: 41000,
    grandTotal: 43500,
    paidAmount: 0,
    balanceDue: 43500,
    paymentStatus: 'unpaid',
    notes: 'First order',
    paymentHistory: [],
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

function generateSeedSales(): Sale[] {
  const sales: Sale[] = [];
  const now = new Date();
  for (let i = 0; i < 25; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - Math.floor(i / 3));
    const items: SaleItem[] = [
      { productId: 'p1', productName: 'Coca Cola 330ml', variantLabel: null, quantity: 2 + Math.ceil(Math.random() * 3), unitPrice: 500, discount: 0, total: 0 },
      { productId: 'p4', productName: 'Lays Chips', variantLabel: 'BBQ', quantity: 1 + Math.ceil(Math.random() * 2), unitPrice: 650, discount: 0, total: 0 },
    ].map(it => ({ ...it, total: it.quantity * it.unitPrice - it.discount }));
    const subtotal = items.reduce((s, it) => s + it.total, 0);
    sales.push({
      id: `sale${i + 1}`,
      date: d.toISOString().split('T')[0],
      time: `${String(9 + Math.floor(Math.random() * 10)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      sessionId: null,
      items,
      subtotal,
      discount: 0,
      total: subtotal,
      paymentMethod: 'cash',
      amountPaid: subtotal + Math.floor(Math.random() * 500),
      change: 0,
      customerId: Math.random() > 0.6 ? 'cust1' : null,
      staffId: 'u1',
      status: 'completed',
      receiptNo: `RCP${String(1000 + i).padStart(4, '0')}`,
      paymentHistory: [],
    });
  }
  return sales.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
}

export const initialState: POSState = {
  currentUser: null,
  isLoggedIn: false,
  users: SEED_USERS,
  customers: SEED_CUSTOMERS,
  categories: SEED_CATEGORIES,
  units: SEED_UNITS,
  products: SEED_PRODUCTS,
  suppliers: SEED_SUPPLIERS,
  supplierVouchers: SEED_VOUCHERS,
  sales: generateSeedSales(),
  coupons: SEED_COUPONS,
  receiptGallery: [],
  daySession: null,
  pastSessions: [],
  cart: [],
  selectedCustomer: null,
  settings: defaultStoreSettings,
  activeScreen: 'login',
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------
export function posReducer(state: POSState, action: POSAction): POSState {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, currentUser: action.user, isLoggedIn: true, activeScreen: 'pos' };
    case 'LOGOUT':
      return { ...state, currentUser: null, isLoggedIn: false, activeScreen: 'login', cart: [], selectedCustomer: null };
    case 'SET_SCREEN':
      return { ...state, activeScreen: action.screen };

    // Cart — keyed by product+variant combo
    case 'ADD_TO_CART': {
      const key = cartKey(action.product.id, action.variant);
      const existing = state.cart.find(i => cartKey(i.product.id, i.selectedVariant) === key);
      const unitPrice = action.unitPrice ?? getCustomerCartPrice(action.product, state.selectedCustomer, action.variant);
      if (existing) {
        return { ...state, cart: state.cart.map(i => cartKey(i.product.id, i.selectedVariant) === key ? { ...i, quantity: i.quantity + 1 } : i) };
      }
      return {
        ...state,
        cart: [...state.cart, {
          product: action.product,
          quantity: 1,
          unitPrice,
          discount: 0,
          selectedVariant: action.variant ?? null,
          customPriceOverride: false,
        }],
      };
    }
    case 'REMOVE_FROM_CART':
      return { ...state, cart: state.cart.filter(i => cartKey(i.product.id, i.selectedVariant) !== action.cartKey) };
    case 'UPDATE_CART_QTY':
      return {
        ...state,
        cart: action.quantity <= 0
          ? state.cart.filter(i => cartKey(i.product.id, i.selectedVariant) !== action.cartKey)
          : state.cart.map(i => cartKey(i.product.id, i.selectedVariant) === action.cartKey ? { ...i, quantity: action.quantity } : i),
      };
    case 'UPDATE_CART_DISCOUNT':
      return { ...state, cart: state.cart.map(i => cartKey(i.product.id, i.selectedVariant) === action.cartKey ? { ...i, discount: action.discount } : i) };
    case 'UPDATE_CART_PRICE':
      return { ...state, cart: state.cart.map(i => cartKey(i.product.id, i.selectedVariant) === action.cartKey ? { ...i, unitPrice: action.price, customPriceOverride: true } : i) };
    case 'UPDATE_CART_VARIANT': {
      const existing = state.cart.find(i => cartKey(i.product.id, i.selectedVariant) === action.cartKey);
      if (!existing) return state;
      const newKey = cartKey(existing.product.id, action.variant);
      const duplicate = state.cart.find(i => cartKey(i.product.id, i.selectedVariant) === newKey && cartKey(i.product.id, i.selectedVariant) !== action.cartKey);
      const newUnitPrice = existing.customPriceOverride
        ? existing.unitPrice
        : getCustomerCartPrice(existing.product, state.selectedCustomer, action.variant);
      if (duplicate) {
        // merge into existing
        return {
          ...state,
          cart: state.cart
            .filter(i => cartKey(i.product.id, i.selectedVariant) !== action.cartKey)
            .map(i => cartKey(i.product.id, i.selectedVariant) === newKey
              ? { ...i, quantity: i.quantity + existing.quantity }
              : i
            ),
        };
      }
      return {
        ...state,
        cart: state.cart.map(i =>
          cartKey(i.product.id, i.selectedVariant) === action.cartKey
            ? { ...i, selectedVariant: action.variant, unitPrice: newUnitPrice }
            : i
        ),
      };
    }
    case 'CLEAR_CART':
      return { ...state, cart: [], selectedCustomer: null };
    case 'SET_CUSTOMER':
      return {
        ...state,
        selectedCustomer: action.customer,
        cart: state.cart.map(item => item.customPriceOverride
          ? item
          : { ...item, unitPrice: getCustomerCartPrice(item.product, action.customer, item.selectedVariant) }
        ),
      };

    // Sales
    case 'COMPLETE_SALE': {
      const updatedProducts = state.products.map(p => {
        const items = action.sale.items.filter(i => i.productId === p.id);
        if (!items.length) return p;
        const totalQty = items.reduce((s, i) => s + i.quantity, 0);
        return { ...p, stock: Math.max(0, p.stock - totalQty) };
      });
      const updatedSession = state.daySession
        ? { ...state.daySession, totalSales: state.daySession.totalSales + action.sale.total }
        : null;
      return {
        ...state,
        sales: [action.sale, ...state.sales],
        products: updatedProducts,
        cart: [],
        selectedCustomer: null,
        daySession: updatedSession,
      };
    }
    case 'SAVE_SALE': {
      return {
        ...state,
        sales: state.sales.map(sale => sale.id === action.sale.id ? action.sale : sale),
      };
    }

    // Products
    case 'SAVE_PRODUCT': {
      const exists = state.products.find(p => p.id === action.product.id);
      // Ensure stock never goes below 0
      const validatedProduct = { ...action.product, stock: Math.max(0, action.product.stock) };
      return { ...state, products: exists ? state.products.map(p => p.id === validatedProduct.id ? validatedProduct : p) : [...state.products, validatedProduct] };
    }
    case 'DELETE_PRODUCT':
      return { ...state, products: state.products.filter(p => p.id !== action.id) };

    // Customers
    case 'SAVE_CUSTOMER': {
      const exists = state.customers.find(c => c.id === action.customer.id);
      return { ...state, customers: exists ? state.customers.map(c => c.id === action.customer.id ? action.customer : c) : [...state.customers, action.customer] };
    }
    case 'DELETE_CUSTOMER':
      return { ...state, customers: state.customers.filter(c => c.id !== action.id) };

    // Users
    case 'SAVE_USER': {
      const exists = state.users.find(u => u.id === action.user.id);
      return { ...state, users: exists ? state.users.map(u => u.id === action.user.id ? action.user : u) : [...state.users, action.user] };
    }
    case 'DELETE_USER':
      return { ...state, users: state.users.filter(u => u.id !== action.id) };

    // Categories
    case 'SAVE_CATEGORY': {
      const exists = state.categories.find(c => c.id === action.category.id);
      return { ...state, categories: exists ? state.categories.map(c => c.id === action.category.id ? action.category : c) : [...state.categories, action.category] };
    }
    case 'DELETE_CATEGORY':
      return { ...state, categories: state.categories.filter(c => c.id !== action.id) };

    // Units
    case 'SAVE_UNIT': {
      const exists = state.units.find(u => u.id === action.unit.id);
      return { ...state, units: exists ? state.units.map(u => u.id === action.unit.id ? action.unit : u) : [...state.units, action.unit] };
    }
    case 'DELETE_UNIT':
      return { ...state, units: state.units.filter(u => u.id !== action.id) };

    // Suppliers
    case 'SAVE_SUPPLIER': {
      const exists = state.suppliers.find(s => s.id === action.supplier.id);
      return { ...state, suppliers: exists ? state.suppliers.map(s => s.id === action.supplier.id ? action.supplier : s) : [...state.suppliers, action.supplier] };
    }

    // Vouchers
    case 'SAVE_VOUCHER': {
      const exists = state.supplierVouchers.find(v => v.id === action.voucher.id);
      // On new voucher: update product stock, cost price, AND ensure supplierId is linked
      let updatedProducts = state.products;
      if (!exists) {
        updatedProducts = state.products.map(p => {
          const item = action.voucher.items.find(i => i.productId === p.id);
          if (item) {
            return {
              ...p,
              stock: p.stock + item.quantity,
              costPrice: item.unitCost,
              supplierId: p.supplierId || action.voucher.supplierId,
            };
          }
          return p;
        });
      }
      // Ensure voucher always has operationalCosts and grandTotal
      const opTotal = (action.voucher.operationalCosts ?? []).reduce((s, c) => s + c.amount, 0);
      const fullVoucher = {
        ...action.voucher,
        operationalCosts: action.voucher.operationalCosts ?? [],
        grandTotal: action.voucher.totalAmount + opTotal,
        paymentHistory: action.voucher.paymentHistory ?? [],
      };
      return {
        ...state,
        products: updatedProducts,
        supplierVouchers: exists
          ? state.supplierVouchers.map(v => v.id === fullVoucher.id ? fullVoucher : v)
          : [fullVoucher, ...state.supplierVouchers],
      };
    }
    case 'DELETE_VOUCHER':
      return { ...state, supplierVouchers: state.supplierVouchers.filter(v => v.id !== action.id) };

    // Day session
    case 'OPEN_DAY_SESSION':
      return { ...state, daySession: action.session };
    case 'CLOSE_DAY_SESSION': {
      if (!state.daySession) return state;
      const closed: DaySession = {
        ...state.daySession,
        closingCash: action.closingCash,
        closedAt: new Date().toISOString(),
        sessionNotes: action.notes,
      };
      return { ...state, daySession: null, pastSessions: [closed, ...state.pastSessions] };
    }

    // Settings
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };

    // Receipt gallery
    case 'SAVE_RECEIPT_TO_GALLERY': {
      const alreadySaved = state.receiptGallery.find(r => r.saleId === action.record.saleId);
      if (alreadySaved) return state;
      return { ...state, receiptGallery: [action.record, ...state.receiptGallery] };
    }
    case 'DELETE_RECEIPT_FROM_GALLERY':
      return { ...state, receiptGallery: state.receiptGallery.filter(r => r.id !== action.id) };

    case 'SAVE_COUPON': {
      const exists = state.coupons.find(c => c.id === action.coupon.id);
      return {
        ...state,
        coupons: exists
          ? state.coupons.map(c => c.id === action.coupon.id ? action.coupon : c)
          : [action.coupon, ...state.coupons],
      };
    }
    case 'DELETE_COUPON':
      return { ...state, coupons: state.coupons.filter(c => c.id !== action.id) };
    case 'MARK_COUPON_USED':
      return {
        ...state,
        coupons: state.coupons.map(c => c.id === action.id ? { ...c, used: true } : c),
      };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
export function formatCurrency(amount: number | null | undefined, symbol = 'Ks'): string {
  const safeAmount = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return `${safeAmount.toLocaleString()} ${symbol}`;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function generateReceiptNo(): string {
  return `RCP${Date.now().toString().slice(-6)}`;
}

export function getVariantLabel(product: Product, variant: { typeId: string; optionId: string } | null): string {
  if (!variant) return '';
  const labels: string[] = [];
  for (const vt of product.variants) {
    if (vt.id === variant.typeId) {
      const opt = vt.options.find(o => o.id === variant.optionId);
      if (opt) labels.push(opt.label);
    }
  }
  return labels.join(' / ');
}
