import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { productsRepository } from '@/db/repositories/products-repository';
import { AppSectionNav } from '@/components/app-section-nav';

interface MobileProduct {
  id: string;
  name: string;
  price: number;
  wholesalePrice: number;
  costPrice: number;
  categoryId: string | null;
  unitLabel: string;
  sku: string;
  stock: number;
}

function formatCurrency(amount: number) {
  return `${amount.toLocaleString()} Ks`;
}

export default function ProductsScreen() {
  const [products, setProducts] = useState<MobileProduct[]>([]);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in-stock' | 'low' | 'out'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    productsRepository
      .list()
      .then((rows) => {
        if (!mounted) return;
        setProducts(rows);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      if (query) {
        const haystack = [product.name, product.sku, product.unitLabel].join(' ').toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }

      if (stockFilter === 'out') {
        return product.stock <= 0;
      }
      if (stockFilter === 'low') {
        return product.stock > 0 && product.stock <= 5;
      }
      if (stockFilter === 'in-stock') {
        return product.stock > 0;
      }
      return true;
    });
  }, [products, search, stockFilter]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f4' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e7e5e4', backgroundColor: '#ffffff' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#171717' }}>Products</Text>
        <Text style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>Offline product catalog synced from the server.</Text>
        <AppSectionNav current="products" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
        <View style={{ borderRadius: 14, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', padding: 12 }}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search product or SKU"
            placeholderTextColor="#a8a29e"
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#d6d3d1',
              backgroundColor: '#fafaf9',
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 14,
              color: '#171717',
            }}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, marginTop: 10 }}
          >
            {[
              { key: 'all', label: 'All' },
              { key: 'in-stock', label: 'In Stock' },
              { key: 'low', label: 'Low Stock' },
              { key: 'out', label: 'Out of Stock' },
            ].map((item) => (
              <Pressable
                key={item.key}
                onPress={() => setStockFilter(item.key as typeof stockFilter)}
                style={{
                  borderWidth: 1,
                  borderColor: stockFilter === item.key ? '#16a34a' : '#d6d3d1',
                  backgroundColor: stockFilter === item.key ? '#dcfce7' : '#ffffff',
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: stockFilter === item.key ? '#166534' : '#171717' }}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={{ marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', overflow: 'hidden' }}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e7e5e4', backgroundColor: '#fafaf9' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#171717' }}>
              {filteredProducts.length} products
            </Text>
          </View>

          {isLoading ? (
            <View style={{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color="#16a34a" />
              <Text style={{ marginTop: 10, fontSize: 13, color: '#6b7280' }}>Loading offline products...</Text>
            </View>
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((product, index) => (
              <View
                key={product.id}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: '#f0ece7',
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#171717' }}>{product.name}</Text>
                    <Text style={{ marginTop: 3, fontSize: 12, color: '#6b7280' }}>
                      {[product.sku || 'No SKU', product.unitLabel || 'No unit'].join(' • ')}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#16a34a' }}>
                    {formatCurrency(product.price)}
                  </Text>
                </View>

                <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    Wholesale {formatCurrency(product.wholesalePrice)} • Cost {formatCurrency(product.costPrice)}
                  </Text>
                  <Text style={{ fontSize: 12, color: product.stock <= 0 ? '#b91c1c' : product.stock <= 5 ? '#a16207' : '#6b7280' }}>
                    Stock {product.stock}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={{ paddingHorizontal: 14, paddingVertical: 18 }}>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>No products matched this filter.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
