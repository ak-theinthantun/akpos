import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { getStoredSession } from '@/store/session-store';
import { fetchReportSales, fetchReportSummary } from '@/services/api/reports-api';
import { salesRepository } from '@/db/repositories/sales-repository';
import { fetchHealth, fetchReady } from '@/services/api/system-api';
import { AppSectionNav } from '@/components/app-section-nav';
import { DataStatusCard } from '@/components/data-status-card';

function formatCurrency(amount: number) {
  return `${amount.toLocaleString()} Ks`;
}

function formatPaymentLabel(paymentMethod: string, amountPaid: number, total: number) {
  if (paymentMethod === 'debt' || amountPaid < total) {
    return 'Credit';
  }
  return 'Cash';
}

export default function ReportsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [sourceLabel, setSourceLabel] = useState<'server' | 'offline'>('offline');
  const [message, setMessage] = useState('');
  const [serverStatus, setServerStatus] = useState<{
    label: string;
    detail: string;
  }>({
    label: 'Offline',
    detail: 'Server not checked yet.',
  });
  const [summary, setSummary] = useState({
    totalSales: 0,
    grossSales: 0,
    paidSales: 0,
    creditSales: 0,
    outstandingBalance: 0,
  });
  const [sales, setSales] = useState<
    Array<{
      id: string;
      receiptNo: string | null;
      date: string | null;
      time: string | null;
      total: number;
      amountPaid: number;
      paymentMethod: string;
      itemCount: number;
      paymentCount: number;
    }>
  >([]);

  async function loadReport() {
    setIsLoading(true);
    setMessage('');
    let fallbackMessage = '';

    try {
      const [health, ready] = await Promise.all([fetchHealth(), fetchReady()]);
      setServerStatus({
        label: ready.ok ? 'Online' : 'Degraded',
        detail: `${health.service} • ${ready.persistence ?? health.persistence ?? 'unknown persistence'}`,
      });
    } catch {
      setServerStatus({
        label: 'Offline',
        detail: 'Backend is unreachable. Using local data when available.',
      });
    }

    try {
      const session = await getStoredSession();
      if (!session.token) {
        setSourceLabel('offline');
        setMessage('Login is required for server reports.');
        return;
      }

      const response = await fetchReportSummary(session.token);
      const salesResponse = await fetchReportSales(session.token);
      setSummary(response.summary);
      setSales(salesResponse.sales);
      setSourceLabel('server');
      return;
    } catch (error) {
      fallbackMessage = error instanceof Error ? error.message : 'Failed to load server report.';
    }

    try {
      const sales = await salesRepository.list();
      setSummary({
        totalSales: sales.length,
        grossSales: sales.reduce((sum, sale) => sum + sale.total, 0),
        paidSales: sales.filter((sale) => sale.paymentMethod === 'cash' || sale.amountPaid >= sale.total).length,
        creditSales: sales.filter((sale) => sale.paymentMethod === 'debt' || sale.amountPaid < sale.total).length,
        outstandingBalance: sales.reduce((sum, sale) => sum + Math.max(0, sale.total - sale.amountPaid), 0),
      });
      setSales(
        sales.map((sale) => ({
          id: sale.id,
          receiptNo: sale.receiptNo,
          date: sale.date,
          time: sale.time,
          total: sale.total,
          amountPaid: sale.amountPaid,
          paymentMethod: sale.paymentMethod,
          itemCount: sale.items.length,
          paymentCount: sale.paymentHistory?.length ?? 0,
        }))
      );
      setSourceLabel('offline');
      setMessage(fallbackMessage || 'Showing local report summary from offline sales.');
    } catch {
      setSourceLabel('offline');
      if (fallbackMessage) {
        setMessage(fallbackMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f4' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e7e5e4', backgroundColor: '#ffffff' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#171717' }}>Reports</Text>
        <Text style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>
          {sourceLabel === 'server' ? 'Live server-backed summary.' : 'Offline fallback mode.'}
        </Text>
        <AppSectionNav current="reports" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
        <DataStatusCard
          title="Data Source"
          rows={[
            {
              label: 'Source',
              value: sourceLabel === 'server' ? 'Server' : 'Offline fallback',
            },
            {
              label: 'Backend',
              value: serverStatus.label,
            },
            {
              label: 'Detail',
              value: serverStatus.detail,
            },
          ]}
        />

        {message ? (
          <View style={{ borderRadius: 12, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 }}>
            <Text style={{ fontSize: 12, color: '#6b7280' }}>{message}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#16a34a" />
            <Text style={{ marginTop: 10, fontSize: 13, color: '#6b7280' }}>Loading report...</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <SummaryCard label="Total Sales" value={String(summary.totalSales)} />
            <SummaryCard label="Gross Sales" value={formatCurrency(summary.grossSales)} />
            <SummaryCard label="Paid Sales" value={String(summary.paidSales)} />
            <SummaryCard label="Credit Sales" value={String(summary.creditSales)} />
            <SummaryCard label="Outstanding Balance" value={formatCurrency(summary.outstandingBalance)} />
          </View>
        )}

        {!isLoading ? (
          <View style={{ marginTop: 14, borderRadius: 14, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', overflow: 'hidden' }}>
            <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e7e5e4', backgroundColor: '#fafaf9' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#171717' }}>Recent Sales</Text>
              <Text style={{ marginTop: 3, fontSize: 12, color: '#6b7280' }}>
                {sourceLabel === 'server' ? 'Loaded from server reports.' : 'Loaded from local offline sales.'}
              </Text>
            </View>
            {sales.length > 0 ? (
              sales.slice(0, 10).map((sale, index) => (
                <View
                  key={sale.id}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: '#f0ece7',
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#171717' }}>
                        {sale.receiptNo || sale.id}
                      </Text>
                      <Text style={{ marginTop: 3, fontSize: 12, color: '#6b7280' }}>
                        {[sale.date || 'No date', sale.time || 'No time'].join(' • ')}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#16a34a' }}>
                      {formatCurrency(sale.total)}
                    </Text>
                  </View>
                  <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>
                      {formatPaymentLabel(sale.paymentMethod, sale.amountPaid, sale.total)} • {sale.itemCount} items • {sale.paymentCount} payments
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>
                      Paid {formatCurrency(sale.amountPaid)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={{ paddingHorizontal: 14, paddingVertical: 18 }}>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>No sales available yet.</Text>
              </View>
            )}
          </View>
        ) : null}

        <Pressable
          onPress={loadReport}
          style={{ marginTop: 14, borderRadius: 12, backgroundColor: '#16a34a', paddingVertical: 13, alignItems: 'center' }}
        >
          <Text style={{ color: '#ffffff', fontWeight: '700' }}>Refresh Report</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ borderRadius: 14, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', padding: 14 }}>
      <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '600' }}>{label}</Text>
      <Text style={{ marginTop: 6, fontSize: 20, fontWeight: '700', color: '#171717' }}>{value}</Text>
    </View>
  );
}
