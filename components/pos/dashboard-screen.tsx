'use client';

import { usePOS } from '@/lib/pos-context';
import { formatCurrency } from '@/lib/pos-store';
import {
  TrendingUp, ShoppingCart, Package, Users,
  ArrowRight, ChevronRight
} from 'lucide-react';
import { useMemo } from 'react';

export function DashboardScreen() {
  const { state, dispatch } = usePOS();

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = state.sales.filter(s => s.date === todayStr && s.status === 'completed');
  const todayTotal = todaySales.reduce((s, sale) => s + sale.total, 0);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekSales = state.sales.filter(s => {
    const d = new Date(s.date);
    return d >= weekAgo && s.status === 'completed';
  });
  const weekTotal = weekSales.reduce((s, sale) => s + sale.total, 0);

  const lowStock = state.products.filter(p => p.stock <= 10 && p.active);

  // Top 5 products by sales
  const productSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  state.sales.filter(s => s.status === 'completed').forEach(sale => {
    sale.items.forEach(item => {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
      }
      productSalesMap[item.productId].qty += item.quantity;
      productSalesMap[item.productId].revenue += item.total;
    });
  });
  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const recentSales = state.sales.slice(0, 5);

  const isAdmin = state.currentUser?.role === 'admin';
  const sym = state.settings.currencySymbol;

  return (
    <div className="flex-1 overflow-y-auto pb-6">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <p className="text-muted-foreground text-sm">Good {getGreeting()},</p>
        <h1 className="text-xl font-bold text-foreground">{state.currentUser?.name}</h1>
      </div>

      {/* Quick action */}
      <div className="px-4 mb-5">
        <button
          onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'pos' })}
          className="w-full flex items-center justify-between px-5 py-4 bg-primary rounded-2xl shadow-lg shadow-primary/20 active:scale-98 transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="text-left">
              <p className="text-primary-foreground font-bold text-base">New Sale</p>
              <p className="text-primary-foreground/70 text-xs">Start checkout</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-primary-foreground" />
        </button>
      </div>

      {/* Stats row */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-5">
        <StatCard
          label="Today's Sales"
          value={formatCurrency(todayTotal, sym)}
          sub={`${todaySales.length} transactions`}
          icon={<TrendingUp className="w-4 h-4" />}
          accent="primary"
        />
        <StatCard
          label="This Week"
          value={formatCurrency(weekTotal, sym)}
          sub={`${weekSales.length} transactions`}
          icon={<TrendingUp className="w-4 h-4" />}
          accent="info"
        />
        <StatCard
          label="Products"
          value={String(state.products.filter(p => p.active).length)}
          sub={`${lowStock.length} low stock`}
          icon={<Package className="w-4 h-4" />}
          accent="warning"
          onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'products' })}
        />
        <StatCard
          label="Customers"
          value={String(state.customers.filter(c => c.active).length)}
          sub="Active customers"
          icon={<Users className="w-4 h-4" />}
          accent="chart4"
          onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'customers' })}
        />
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="px-4 mb-5">
          <div className="bg-warning/10 border border-warning/30 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-warning font-semibold text-sm">Low Stock Alert</p>
              <button
                onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'products' })}
                className="text-warning text-xs flex items-center gap-1"
              >
                View <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-1.5">
              {lowStock.slice(0, 3).map(p => (
                <div key={p.id} className="flex justify-between items-center">
                  <p className="text-foreground text-xs">{p.name}</p>
                  <span className="text-warning text-xs font-medium">{p.stock} left</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top products */}
      {isAdmin && topProducts.length > 0 && (
        <div className="px-4 mb-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-foreground text-sm">Best Sellers</h2>
            <button
              onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'reports' })}
              className="text-primary text-xs flex items-center gap-0.5"
            >
              Reports <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {topProducts.map((p, i) => (
              <div key={p.name} className={`flex items-center gap-3 px-4 py-3 ${i < topProducts.length - 1 ? 'border-b border-border' : ''}`}>
                <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <p className="flex-1 text-foreground text-sm">{p.name}</p>
                <div className="text-right">
                  <p className="text-foreground text-xs font-medium">{p.qty} sold</p>
                  <p className="text-muted-foreground text-xs">{formatCurrency(p.revenue, sym)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent sales */}
      <div className="px-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-foreground text-sm">Recent Sales</h2>
          <button
            onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'sales-log' })}
            className="text-primary text-xs flex items-center gap-0.5"
          >
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {recentSales.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">No sales yet</div>
          ) : (
            recentSales.map((sale, i) => (
              <div key={sale.id} className={`flex items-center gap-3 px-4 py-3 ${i < recentSales.length - 1 ? 'border-b border-border' : ''}`}>
                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium">{sale.receiptNo}</p>
                  <p className="text-muted-foreground text-xs">{sale.date} · {sale.time} · {sale.items.length} items</p>
                </div>
                <p className="text-primary font-semibold text-sm">{formatCurrency(sale.total, sym)}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

function StatCard({
  label, value, sub, icon, accent, onClick,
}: {
  label: string; value: string; sub: string; icon: React.ReactNode;
  accent: 'primary' | 'info' | 'warning' | 'chart4'; onClick?: () => void;
}) {
  const colors = {
    primary: 'text-primary bg-primary/15',
    info: 'text-info bg-info/15',
    warning: 'text-warning bg-warning/15',
    chart4: 'text-chart-4 bg-chart-4/15',
  };
  return (
    <div
      className="bg-card border border-border rounded-2xl p-4 cursor-pointer active:scale-98 transition-transform"
      onClick={onClick}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${colors[accent]}`}>
        {icon}
      </div>
      <p className="text-foreground font-bold text-base leading-tight">{value}</p>
      <p className="text-muted-foreground text-xs mt-0.5">{sub}</p>
      <p className="text-foreground/70 text-xs mt-1 font-medium">{label}</p>
    </div>
  );
}
