import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { getStoredSession } from '@/store/session-store';
import { fetchReportSummary } from '@/services/api/reports-api';
import { salesRepository } from '@/db/repositories/sales-repository';
import { fetchHealth, fetchReady } from '@/services/api/system-api';

function formatCurrency(amount: number) {
  return `${amount.toLocaleString()} Ks`;
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
      setSummary(response.summary);
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
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Pressable onPress={() => router.replace('/(main)/sale')} style={{ borderRadius: 999, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d6d3d1', paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#171717' }}>Sale</Text>
          </Pressable>
          <Pressable onPress={() => router.replace('/(main)/orders')} style={{ borderRadius: 999, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d6d3d1', paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#171717' }}>Orders</Text>
          </Pressable>
          <View style={{ borderRadius: 999, backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#16a34a', paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534' }}>Reports</Text>
          </View>
          <Pressable onPress={() => router.replace('/(main)/settings')} style={{ borderRadius: 999, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d6d3d1', paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#171717' }}>Settings</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 }}>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>
            Source: <Text style={{ fontWeight: '700', color: '#171717' }}>{sourceLabel === 'server' ? 'Server' : 'Offline fallback'}</Text>
          </Text>
          <Text style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>
            Backend: <Text style={{ fontWeight: '700', color: '#171717' }}>{serverStatus.label}</Text>
          </Text>
          <Text style={{ marginTop: 4, fontSize: 11, color: '#6b7280' }}>{serverStatus.detail}</Text>
        </View>

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
