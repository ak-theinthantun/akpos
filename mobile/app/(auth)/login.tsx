import { View, Text, TextInput, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

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
        <Pressable
          onPress={() => router.replace('/(main)/sale')}
          style={{ backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
        >
          <Text style={{ color: '#ffffff', fontWeight: '700' }}>Enter AKPOS</Text>
        </Pressable>
      </View>
    </View>
  );
}
