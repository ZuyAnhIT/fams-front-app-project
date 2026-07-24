import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/** Expo Go does not contain FAMS native Firebase/Google modules. */
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export function isNativeDevelopmentOrProductionBuild(): boolean {
  return Platform.OS !== 'web' && !isExpoGo();
}
