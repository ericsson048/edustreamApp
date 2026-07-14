import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'edustream_onboarding_completed';
const MIGRATION_KEY = 'edustream_onboarding_migrated_v2';

interface OnboardingContextValue {
  isLoading: boolean;
  hasCompleted: boolean;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue>({
  isLoading: true,
  hasCompleted: false,
  completeOnboarding: async () => {},
  resetOnboarding: async () => {},
});

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    (async () => {
      const migrated = await AsyncStorage.getItem(MIGRATION_KEY);
      if (!migrated) {
        await AsyncStorage.removeItem(ONBOARDING_KEY);
        await AsyncStorage.setItem(MIGRATION_KEY, 'true');
      }
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      setHasCompleted(value === 'true');
      setIsLoading(false);
    })();
  }, []);

  const completeOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setHasCompleted(true);
  };

  const resetOnboarding = async () => {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    setHasCompleted(false);
  };

  return (
    <OnboardingContext.Provider value={{ isLoading, hasCompleted, completeOnboarding, resetOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}
