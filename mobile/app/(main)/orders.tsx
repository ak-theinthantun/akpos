import { View, Text, ScrollView, Pressable } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { salesRepository } from '@/db/repositories/sales-repository';
import { syncStateRepository } from '@/db/repositories/sync-state-repository';
import { syncQueueRepository } from '@/db/repositories/sync-queue-repository';
import { runSync } from '@/services/sync/sync-engine';
import { getStoredSession } from '@/store/session-store';
import { fetchOrders } from '@/services/api/orders-api';
import { AppSectionNav } from '@/components/app-section-nav';
import { DataStatusCard } from '@/components/data-status-card';

interface OrderItem {
  id: string;
  receiptNo: string;
  date: string;
  time: string;
  customerId: string | null;
  total: number;
  status: string;
  paymentMethod: 'cash' | 'debt';
  itemCount: number;
  source: 'server' | 'local';
}

function formatCurrency(amount: number) {
  return `${amount.toLocaleString()} Ks`;
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [pendingEntityIds, setPendingEntityIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncMessage, setSyncMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastCursor, setLastCursor] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState<'local' | 'server'>('local');

  async function loadOrders() {
    const session = await getStoredSession();
    const [queue, cursor] = await Promise.all([
      syncQueueRepository.listAll(),
      syncStateRepository.get('last_pull_cursor'),
    ]);

    let resolvedOrders: OrderItem[] | null = null;

    if (session.token) {
      try {
        const response = await fetchOrders(session.token);
        resolvedOrders = response.orders.map((order) => ({
          id: order.id,
          receiptNo: order.receiptNo ?? order.id,
          date: order.date ?? '-',
          time: order.time ?? '-',
          customerId: order.customerId,
          total: order.total,
          status: order.status,
          paymentMethod: order.paymentMethod === 'debt' ? 'debt' : 'cash',
          itemCount: order.itemCount,
          source: 'server' as const,
        }));
        setSourceLabel('server');
      } catch {
        resolvedOrders = null;
      }
    }

    if (!resolvedOrders) {
      const sales = await salesRepository.list();
      resolvedOrders = sales.map((sale) => ({
        id: sale.id,
        receiptNo: sale.receiptNo,
        date: sale.date,
        time: sale.time,
        customerId: sale.customerId,
        total: sale.total,
        status: sale.status,
        paymentMethod: sale.paymentMethod,
        itemCount: sale.items.reduce((sum, item) => sum + item.quantity, 0),
        source: 'local' as const,
      }));
      setSourceLabel('local');
    }

    setOrders(resolvedOrders);
    setPendingEntityIds(
      queue.filter((item) => item.entityType === 'sale' && item.status !== 'synced').map((item) => item.entityId)
    );
    setLastCursor(cursor);
  }

  useEffect(() => {
    let mounted = true;

    loadOrders()
      .then(() => {
        if (!mounted) return;
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    return {
      count: orders.length,
      total: orders.reduce((sum, order) => sum + order.total, 0),
      pending: pendingEntityIds.length,
    };
  }, [orders, pendingEntityIds]);

  async function handleSyncNow() {
    try {
      setIsSyncing(true);
      setSyncMessage('');
      const session = await getStoredSession();
      if (!session.token || !session.deviceId) {
        setSyncMessage('Login is required before syncing.');
        return;
      }

      const result = await runSync(session.token, session.deviceId);
      await loadOrders();
      setSyncMessage(`Synced ${result.pushed} push / ${result.pulled} pull changes.`);
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Sync failed.');
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f4' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e7e5e4', backgroundColor: '#ffffff' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#171717' }}>Orders</Text>
        <Text style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>
          {sourceLabel === 'server' ? 'Server-backed orders with offline fallback.' : 'Local sales saved on device.'}
        </Text>
        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ flex: 1, fontSize: 11, color: '#6b7280' }}>
            {lastCursor ? `Last sync cursor: ${lastCursor}` : 'No sync cursor yet'}
          </Text>
          <Pressable
            onPress={handleSyncNow}
            disabled={isSyncing}
            style={{
              borderRadius: 999,
              backgroundColor: '#16a34a',
              paddingHorizontal: 12,
              paddingVertical: 8,
              opacity: isSyncing ? 0.6 : 1,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>{isSyncing ? 'Syncing...' : 'Sync Now'}</Text>
          </Pressable>
        </View>
        <AppSectionNav current="orders" />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 12 }}>
        <View style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', padding: 12 }}>
          <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '600' }}>Orders</Text>
          <Text style={{ marginTop: 6, fontSize: 18, fontWeight: '700', color: '#171717' }}>{summary.count}</Text>
        </View>
        <View style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', padding: 12 }}>
          <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '600' }}>Pending Sync</Text>
          <Text style={{ marginTop: 6, fontSize: 18, fontWeight: '700', color: '#d97706' }}>{summary.pending}</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
        <DataStatusCard
          title="Data Source"
          rows={[
            {
              label: 'Source',
              value: sourceLabel === 'server' ? 'Server' : 'Local offline cache',
            },
          ]}
        />
      </View>
      {syncMessage ? (
        <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
          <View style={{ borderRadius: 12, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#166534' }}>{syncMessage}</Text>
          </View>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
        {isLoading ? (
          <Text style={{ color: '#6b7280' }}>Loading orders...</Text>
        ) : orders.length === 0 ? (
          <View style={{ borderRadius: 14, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', padding: 18 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#171717' }}>
              {sourceLabel === 'server' ? 'No server orders yet' : 'No local orders yet'}
            </Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>
              {sourceLabel === 'server'
                ? 'The server is reachable, but no synced orders are available yet.'
                : 'Complete a sale from the Sale screen to see it here.'}
            </Text>
          </View>
        ) : (
          orders.map((order) => {
            const isPending = pendingEntityIds.includes(order.id);
            return (
              <Pressable
                key={order.id}
                onPress={() => router.push(`/(main)/orders/${order.id}`)}
                style={{ borderRadius: 14, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', padding: 14, marginBottom: 10 }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#171717' }}>{order.receiptNo}</Text>
                    <Text style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>{order.date} • {order.time}</Text>
                    <Text style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>{order.itemCount} items • {order.paymentMethod}</Text>
                    <Text style={{ marginTop: 4, fontSize: 11, color: '#6b7280' }}>
                      {order.source === 'server' ? 'Server order' : 'Local offline order'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#16a34a' }}>{formatCurrency(order.total)}</Text>
                    <View style={{ marginTop: 8, borderRadius: 999, backgroundColor: isPending ? '#fef3c7' : '#dcfce7', paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: isPending ? '#b45309' : '#166534' }}>
                        {isPending ? 'Pending sync' : 'Synced/ready'}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
