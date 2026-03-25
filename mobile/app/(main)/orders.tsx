import { View, Text, ScrollView, Pressable } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { salesRepository } from '@/db/repositories/sales-repository';
import { syncQueueRepository } from '@/db/repositories/sync-queue-repository';

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
}

function formatCurrency(amount: number) {
  return `${amount.toLocaleString()} Ks`;
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [pendingEntityIds, setPendingEntityIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    Promise.all([salesRepository.list(), syncQueueRepository.listAll()])
      .then(([sales, queue]) => {
        if (!mounted) return;
        setOrders(
          sales.map((sale) => ({
            id: sale.id,
            receiptNo: sale.receiptNo,
            date: sale.date,
            time: sale.time,
            customerId: sale.customerId,
            total: sale.total,
            status: sale.status,
            paymentMethod: sale.paymentMethod,
            itemCount: sale.items.reduce((sum, item) => sum + item.quantity, 0),
          }))
        );
        setPendingEntityIds(
          queue.filter((item) => item.entityType === 'sale' && item.status !== 'synced').map((item) => item.entityId)
        );
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

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f4' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e7e5e4', backgroundColor: '#ffffff' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#171717' }}>Orders</Text>
        <Text style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>Local sales saved on device.</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Pressable onPress={() => router.replace('/(main)/sale')} style={{ borderRadius: 999, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d6d3d1', paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#171717' }}>Sale</Text>
          </Pressable>
          <View style={{ borderRadius: 999, backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#16a34a', paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534' }}>Orders</Text>
          </View>
        </View>
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

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
        {isLoading ? (
          <Text style={{ color: '#6b7280' }}>Loading orders...</Text>
        ) : orders.length === 0 ? (
          <View style={{ borderRadius: 14, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', padding: 18 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#171717' }}>No local orders yet</Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>Complete a sale from the Sale screen to see it here.</Text>
          </View>
        ) : (
          orders.map((order) => {
            const isPending = pendingEntityIds.includes(order.id);
            return (
              <View key={order.id} style={{ borderRadius: 14, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', padding: 14, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#171717' }}>{order.receiptNo}</Text>
                    <Text style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>{order.date} • {order.time}</Text>
                    <Text style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>{order.itemCount} items • {order.paymentMethod}</Text>
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
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
