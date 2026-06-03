import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_KEY = 'streak_count';
const DATE_KEY = 'last_streak_date';

export async function getStreak(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(STREAK_KEY);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

export async function updateStreak(): Promise<number> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const lastDate = await AsyncStorage.getItem(DATE_KEY);
    const current = parseInt((await AsyncStorage.getItem(STREAK_KEY)) || '0', 10);

    let newStreak: number;
    if (!lastDate) {
      newStreak = 1;
    } else if (lastDate === today) {
      return current;
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      newStreak = lastDate === yesterdayStr ? current + 1 : 1;
    }

    await AsyncStorage.setItem(STREAK_KEY, String(newStreak));
    await AsyncStorage.setItem(DATE_KEY, today);
    return newStreak;
  } catch {
    return 0;
  }
}
