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
