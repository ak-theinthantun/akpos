'use client';
// cache-bust-v2: force-rebuild
import { POSProvider, usePOS } from '@/lib/pos-context';
import { AppShell } from '@/components/pos/app-shell';
import { LoginScreen } from '@/components/pos/login-screen';
import { POSScreen } from '@/components/pos/sale-screen';
import { ProductsScreen } from '@/components/pos/products-screen';
import { SalesLogScreen } from '@/components/pos/sales-log-screen';
import { ReportsScreen } from '@/components/pos/reports-screen';
import { CustomersScreen } from '@/components/pos/customers-screen';
import { UsersScreen } from '@/components/pos/users-screen';
import { SettingsScreen } from '@/components/pos/settings-screen';
import { SuppliersScreen } from '@/components/pos/suppliers-screen';
import { CouponsScreen } from '@/components/pos/coupons-screen';
import { ReceiptGalleryScreen } from '@/components/pos/receipt-gallery-screen';
import { DaySessionScreen } from '@/components/pos/day-session-screen';

function POSApp() {
  const { state } = usePOS();

  if (!state.isLoggedIn) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <LoginScreen />
      </div>
    );
  }

  const isStaff = state.currentUser?.role === 'staff';
  const blockedForStaff =
    state.activeScreen === 'dashboard' ||
    state.activeScreen === 'products' ||
    state.activeScreen === 'reports' ||
    state.activeScreen === 'settings' ||
    state.activeScreen === 'coupons' ||
    state.activeScreen === 'day-session' ||
    state.activeScreen === 'customers' ||
    state.activeScreen === 'suppliers' ||
    state.activeScreen === 'users';

  const screenMap: Record<string, React.ReactNode> = {
    dashboard: <POSScreen />,
    pos: <POSScreen />,
    products: <ProductsScreen />,
    'sales-log': <SalesLogScreen />,
    reports: <ReportsScreen />,
    customers: <CustomersScreen />,
    users: <UsersScreen />,
    coupons: <CouponsScreen />,
    settings: <SettingsScreen />,
    suppliers: <SuppliersScreen />,
    'receipt-gallery': <ReceiptGalleryScreen />,
    'day-session': <DaySessionScreen />,
  };

  const content = isStaff && blockedForStaff
    ? <POSScreen />
    : (screenMap[state.activeScreen] ?? <POSScreen />);

  return (
    <AppShell>
      {content}
    </AppShell>
  );
}

export default function Home() {
  return (
    <POSProvider>
      <POSApp />
    </POSProvider>
  );
}
