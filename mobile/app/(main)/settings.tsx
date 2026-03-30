import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { getStoredSession } from '@/store/session-store';
import { syncStateRepository } from '@/db/repositories/sync-state-repository';
import { fetchHealth, fetchReady } from '@/services/api/system-api';
import { API_BASE_URL } from '@/services/api/client';
import { AppSectionNav } from '@/components/app-section-nav';
import { DataStatusCard } from '@/components/data-status-card';

export default function SettingsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<{
    token: string | null;
    userId: string | null;
    deviceId: string | null;
  }>({
    token: null,
    userId: null,
    deviceId: null,
  });
  const [lastCursor, setLastCursor] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState({
    health: 'Unavailable',
    readiness: 'Unavailable',
    detail: 'No backend check yet.',
  });

  async function loadStatus() {
    setIsLoading(true);

    const [storedSession, cursor] = await Promise.all([
      getStoredSession(),
      syncStateRepository.get('last_pull_cursor'),
    ]);

    setSession(storedSession);
    setLastCursor(cursor);

    try {
      const [health, ready] = await Promise.all([fetchHealth(), fetchReady()]);
      setBackendStatus({
        health: health.ok ? 'Healthy' : 'Unhealthy',
        readiness: ready.ok ? 'Ready' : 'Not ready',
        detail: ready.detail ?? `${health.service} • ${health.persistence ?? 'unknown persistence'}`,
      });
    } catch {
      setBackendStatus({
        health: 'Offline',
        readiness: 'Offline',
        detail: 'Backend is unreachable from this device.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f4' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e7e5e4', backgroundColor: '#ffffff' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#171717' }}>Settings</Text>
        <Text style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>Deployment and device status.</Text>
        <AppSectionNav current="settings" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
        {isLoading ? (
          <View style={{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#16a34a" />
            <Text style={{ marginTop: 10, fontSize: 13, color: '#6b7280' }}>Loading device status...</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <InfoCard label="API Base URL" value={API_BASE_URL} />
            <InfoCard label="User ID" value={session.userId ?? 'Not logged in'} />
            <InfoCard label="Device ID" value={session.deviceId ?? 'Unavailable'} />
            <InfoCard label="Has Token" value={session.token ? 'Yes' : 'No'} />
            <InfoCard label="Last Sync Cursor" value={lastCursor ?? 'None yet'} />
            <DataStatusCard
              title="Backend Status"
              rows={[
                { label: 'Health', value: backendStatus.health },
                { label: 'Readiness', value: backendStatus.readiness },
                { label: 'Detail', value: backendStatus.detail },
              ]}
            />
          </View>
        )}

        <Pressable
          onPress={loadStatus}
          style={{ marginTop: 14, borderRadius: 12, backgroundColor: '#16a34a', paddingVertical: 13, alignItems: 'center' }}
        >
          <Text style={{ color: '#ffffff', fontWeight: '700' }}>Refresh Status</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ borderRadius: 14, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', padding: 14 }}>
      <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '600' }}>{label}</Text>
      <Text style={{ marginTop: 6, fontSize: 15, fontWeight: '700', color: '#171717' }}>{value}</Text>
    </View>
  );
}
