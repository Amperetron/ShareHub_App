import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'session_count';

export async function getSessionCount(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(SESSION_KEY);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

export async function incrementSessionCount(): Promise<number> {
  try {
    const current = await getSessionCount();
    const next = current + 1;
    await AsyncStorage.setItem(SESSION_KEY, String(next));
    return next;
  } catch {
    return 1;
  }
}
