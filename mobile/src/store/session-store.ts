import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SessionState {
  token: string | null;
  userId: string | null;
  deviceId: string | null;
}

export const initialSessionState: SessionState = {
  token: null,
  userId: null,
  deviceId: null,
};

const SESSION_KEY = 'akpos.session';

export async function getStoredSession(): Promise<SessionState> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return initialSessionState;

  try {
    return JSON.parse(raw) as SessionState;
  } catch {
    return initialSessionState;
  }
}

export async function setStoredSession(session: SessionState) {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearStoredSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}
