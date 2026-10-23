// JavaScript side of the native call guard (android/…/KavachGuardModule.kt).
// In Expo Go or on iOS the native part does not exist, so every function
// becomes a safe no-op and `isAvailable` is false.
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

const Native = Platform.OS === 'android' ? requireOptionalNativeModule('KavachGuard') : null;

export const isAvailable = Boolean(Native);

// Android microphone sources. If MIC records silence during calls on your
// phone, try VOICE_RECOGNITION or VOICE_COMMUNICATION in Settings.
export const AUDIO_SOURCES = [
  { id: 1, label: 'Microphone' },
  { id: 6, label: 'Voice recognition' },
  { id: 7, label: 'Voice communication' },
];

export function startGuard({ serverUrl, alwaysListen = false, audioSource = 1 }) {
  return Native ? Native.startGuard(serverUrl, alwaysListen, audioSource) : false;
}
export const stopGuard = () => Native?.stopGuard();
export const isGuardRunning = () => Boolean(Native?.isGuardRunning());
export const isAccessibilityEnabled = () => Boolean(Native?.isAccessibilityEnabled());
export const openAccessibilitySettings = () => Native?.openAccessibilitySettings();
export const openAppSettings = () => Native?.openAppSettings();
export const showTestWarning = () => Boolean(Native?.showTestWarning());

/** Subscribe to native events: onStatus, onUpdate, onLevel. Returns an unsubscribe function. */
export function addListener(event, callback) {
  if (!Native) return () => {};
  const sub = Native.addListener(event, callback);
  return () => sub.remove();
}
