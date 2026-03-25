import { View, Text, TextInput, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { login } from '@/services/api/auth-api';
import { runSync } from '@/services/sync/sync-engine';
import { setStoredSession } from '@/store/session-store';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    try {
      setIsSubmitting(true);
      setError('');
      const deviceId = 'android-dev-1';
      const response = await login({
        username,
        password,
        deviceId,
        deviceName: 'AKPOS Mobile Dev',
        platform: 'android',
        appVersion: '0.1.0',
      });

      await setStoredSession({
        token: response.token,
        userId: response.user.id,
        deviceId,
      });

      await runSync(response.token, deviceId, response.device.lastPullCursor);
      router.replace('/(main)/sale');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f7f7f5', justifyContent: 'center', padding: 24 }}>
      <View style={{ borderWidth: 1, borderColor: '#ddd7cf', backgroundColor: '#ffffff', borderRadius: 18, padding: 20, gap: 14 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#171717' }}>AKPOS</Text>
        <Text style={{ fontSize: 13, color: '#6b7280' }}>Offline-first Android POS login scaffold.</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Username"
          style={{ borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 14, backgroundColor: '#fafaf9', paddingHorizontal: 14, paddingVertical: 12 }}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          style={{ borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 14, backgroundColor: '#fafaf9', paddingHorizontal: 14, paddingVertical: 12 }}
        />
        {error ? (
          <Text style={{ fontSize: 12, color: '#dc2626', fontWeight: '600' }}>{error}</Text>
        ) : null}
        <Pressable
          onPress={handleLogin}
          disabled={isSubmitting || !username || !password}
          style={{ backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 14, alignItems: 'center', opacity: isSubmitting || !username || !password ? 0.6 : 1 }}
        >
          <Text style={{ color: '#ffffff', fontWeight: '700' }}>{isSubmitting ? 'Signing in...' : 'Enter AKPOS'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
