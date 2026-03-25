import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { useBootstrap } from '@/hooks/use-bootstrap';

const queryClient = new QueryClient();

export default function RootLayout() {
  const { isReady, error } = useBootstrap();

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#171717' }}>AKPOS Bootstrap Error</Text>
        <Text style={{ marginTop: 8, color: '#6b7280', textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#171717' }}>AKPOS</Text>
        <Text style={{ marginTop: 8, color: '#6b7280' }}>Preparing local database...</Text>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
      </Stack>
    </QueryClientProvider>
  );
}
