import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { productsRepository } from '@/db/repositories/products-repository';
import { customersRepository } from '@/db/repositories/customers-repository';
import { setCartDraft } from '@/store/cart-draft-store';

interface MobileProduct {
  id: string;
  name: string;
  price: number;
  wholesalePrice: number;
  stock: number;
  unitLabel: string;
}

interface MobileCustomer {
  id: string;
  name: string;
  phone: string;
  type: 'regular' | 'wholesale';
}

function formatCurrency(amount: number) {
  return `${amount.toLocaleString()} Ks`;
}

export default function SaleScreen() {
  const [products, setProducts] = useState<MobileProduct[]>([]);
  const [customers, setCustomers] = useState<MobileCustomer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [cartCounts, setCartCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    Promise.all([productsRepository.list(), customersRepository.list()])
      .then(([productRows, customerRows]) => {
        if (!mounted) return;
        setProducts(productRows);
        setCustomers(customerRows);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const selectedCustomer = useMemo(
    () => customers.find(customer => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  const cartCount = Object.values(cartCounts).reduce((sum, qty) => sum + qty, 0);
  const cartTotal = products.reduce((sum, product) => {
    const qty = cartCounts[product.id] ?? 0;
    if (qty === 0) return sum;
    const unitPrice = selectedCustomer?.type === 'wholesale' ? product.wholesalePrice : product.price;
    return sum + unitPrice * qty;
  }, 0);

  async function handleReviewCart() {
    if (cartCount === 0) return;

    const items = products
      .filter(product => (cartCounts[product.id] ?? 0) > 0)
      .map(product => {
        const quantity = cartCounts[product.id] ?? 0;
        const unitPrice = selectedCustomer?.type === 'wholesale' ? product.wholesalePrice : product.price;
        return {
          productId: product.id,
          productName: product.name,
          variantLabel: null,
          quantity,
          unitPrice,
          discount: 0,
          total: quantity * unitPrice,
        };
      });

    await setCartDraft({
      customer: selectedCustomer
        ? {
            id: selectedCustomer.id,
            name: selectedCustomer.name,
            type: selectedCustomer.type,
          }
        : null,
      items,
      total: cartTotal,
      updatedAt: new Date().toISOString(),
    });
    router.push('/(main)/cart-review');
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f4' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e7e5e4', backgroundColor: '#ffffff' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#171717' }}>AKPOS Sale</Text>
        <Text style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>Offline SQLite-backed sale screen foundation.</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <View style={{ borderRadius: 999, backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#16a34a', paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534' }}>Sale</Text>
          </View>
          <Pressable onPress={() => router.replace('/(main)/orders')} style={{ borderRadius: 999, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d6d3d1', paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#171717' }}>Orders</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 12 }}>
          <Pressable
            onPress={() => setSelectedCustomerId('')}
            style={{
              borderWidth: 1,
              borderColor: selectedCustomerId === '' ? '#16a34a' : '#d6d3d1',
              backgroundColor: selectedCustomerId === '' ? '#dcfce7' : '#ffffff',
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#171717' }}>Walk-in</Text>
          </Pressable>
          {customers.map(customer => (
            <Pressable
              key={customer.id}
              onPress={() => setSelectedCustomerId(customer.id)}
              style={{
                borderWidth: 1,
                borderColor: selectedCustomerId === customer.id ? '#16a34a' : '#d6d3d1',
                backgroundColor: selectedCustomerId === customer.id ? '#dcfce7' : '#ffffff',
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#171717' }}>
                {customer.name} {customer.type === 'wholesale' ? '• wholesale' : ''}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={{ padding: 12 }}>
        {isLoading ? (
          <View style={{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#16a34a" />
            <Text style={{ marginTop: 10, fontSize: 13, color: '#6b7280' }}>Loading offline products...</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {products.map(product => {
              const quantity = cartCounts[product.id] ?? 0;
              const unitPrice = selectedCustomer?.type === 'wholesale' ? product.wholesalePrice : product.price;
              return (
                <Pressable
                  key={product.id}
                  onPress={() => setCartCounts(current => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }))}
                  style={{
                    width: '48%',
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: quantity > 0 ? '#16a34a' : '#d6d3d1',
                    borderRadius: 10,
                    padding: 10,
                  }}
                >
                  <View style={{ aspectRatio: 1, backgroundColor: '#f5f5f4', marginBottom: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 28, fontWeight: '700', color: '#a8a29e' }}>{product.name.charAt(0)}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#171717' }}>{product.name}</Text>
                  <Text style={{ marginTop: 4, fontSize: 12, color: '#16a34a', fontWeight: '600' }}>{formatCurrency(unitPrice)}</Text>
                  <Text style={{ marginTop: 4, fontSize: 11, color: '#6b7280' }}>
                    {product.stock} in stock {product.unitLabel ? `• ${product.unitLabel}` : ''}
                  </Text>
                  {quantity > 0 && (
                    <View style={{ marginTop: 8, borderRadius: 999, backgroundColor: '#dcfce7', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#166534' }}>In cart: {quantity}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
      <View style={{ borderTopWidth: 1, borderTopColor: '#e7e5e4', backgroundColor: '#ffffff', padding: 16 }}>
        <Pressable onPress={handleReviewCart} style={{ borderRadius: 14, backgroundColor: '#16a34a', paddingVertical: 14, alignItems: 'center', opacity: cartCount === 0 ? 0.6 : 1 }} disabled={cartCount === 0}>
          <Text style={{ color: '#ffffff', fontWeight: '700' }}>
            Review Cart {cartCount > 0 ? `• ${cartCount} items • ${formatCurrency(cartTotal)}` : ''}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
