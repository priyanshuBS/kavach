import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, PermissionsAndroid, Platform, StyleSheet, Vibration, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as Guard from './modules/kavach-guard';
import { api } from './src/api';
import { colors, levelColor } from './src/theme';
import TabBar from './src/components/TabBar';
import AlertModal from './src/components/AlertModal';
import GuardScreen from './src/screens/GuardScreen';
import LiveScreen from './src/screens/LiveScreen';
import DemoScreen from './src/screens/DemoScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const SETTINGS_KEY = 'kavach.settings';
const DEFAULT_SETTINGS = { serverUrl: '', alwaysListen: false, audioSource: 1 };
const DEMO_LINE_DELAY_MS = 2500;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

function Main() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('guard');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [health, setHealth] = useState(null);
  const [setup, setSetup] = useState({ serverOk: false, serverError: '', micGranted: false, accessibility: false });
  const [guard, setGuard] = useState({ running: false, state: 'stopped', message: '', level: null });
  const [session, setSession] = useState(null);
  const [demo, setDemo] = useState({ playing: false, line: 0, total: 0 });
  const [alertModal, setAlertModal] = useState({ visible: false, telegram: null });
  const demoCancelled = useRef(false);
  const alertShownFor = useRef(null);

  // ---------- settings ----------
  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY)
      .then((raw) => raw && setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) }))
      .catch(() => {});
  }, []);

  const saveSettings = useCallback(async (patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // ---------- server check ----------
  const checkServer = useCallback(async (url) => {
    try {
      const h = await api.health(url);
      setHealth(h);
      setSetup((s) => ({ ...s, serverOk: true, serverError: '' }));
      return { ok: true };
    } catch (e) {
      setHealth(null);
      setSetup((s) => ({ ...s, serverOk: false, serverError: e.message }));
      return { ok: false, error: e.message };
    }
  }, []);

  useEffect(() => {
    if (settings.serverUrl) checkServer(settings.serverUrl);
  }, [settings.serverUrl, checkServer]);

  // ---------- permissions + native state (re-checked when you come back to the app) ----------
  const refreshDeviceState = useCallback(async () => {
    let micGranted = true;
    if (Platform.OS === 'android') {
      micGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    }
    setSetup((s) => ({ ...s, micGranted, accessibility: Guard.isAccessibilityEnabled() }));
    const running = Guard.isGuardRunning();
    setGuard((g) => ({ ...g, running, state: running ? (g.state === 'stopped' ? 'guarding' : g.state) : 'stopped' }));
  }, []);

  useEffect(() => {
    refreshDeviceState();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refreshDeviceState());
    return () => sub.remove();
  }, [refreshDeviceState]);

  const requestPermissions = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    const wanted = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
    if (Platform.Version >= 33) wanted.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    await PermissionsAndroid.requestMultiple(wanted);
    refreshDeviceState();
  }, [refreshDeviceState]);

  // ---------- events from the native guard ----------
  useEffect(() => {
    const offStatus = Guard.addListener('onStatus', ({ state, message }) => {
      setGuard((g) => {
        if (state === 'error') return { ...g, state: 'error', message };
        return { running: state !== 'stopped', state, message: '', level: state === 'listening' ? g.level : null };
      });
    });
    const offUpdate = Guard.addListener('onUpdate', ({ json }) => {
      try {
        const snap = JSON.parse(json);
        if (snap?.id) setSession(snap);
      } catch {}
    });
    const offLevel = Guard.addListener('onLevel', ({ level }) =>
      setGuard((g) => ({ ...g, level, state: g.state === 'error' ? 'listening' : g.state }))
    );
    return () => {
      offStatus();
      offUpdate();
      offLevel();
    };
  }, []);

  const toggleGuard = useCallback(() => {
    if (guard.running) {
      Guard.stopGuard();
      setGuard({ running: false, state: 'stopped', message: '', level: null });
    } else {
      Guard.startGuard(settings);
      setGuard({ running: true, state: 'guarding', message: '', level: null });
    }
  }, [guard.running, settings]);

  // ---------- demo calls ----------
  const playDemo = useCallback(
    async (call) => {
      demoCancelled.current = false;
      setTab('live');
      setDemo({ playing: true, line: 0, total: call.lines.length });
      try {
        let snap = await api.createSession(settings.serverUrl, 'demo', call.title);
        setSession(snap);
        for (let i = 0; i < call.lines.length; i++) {
          if (demoCancelled.current) break;
          const line = call.lines[i];
          snap = await api.sendText(settings.serverUrl, snap.id, line.text, line.speaker);
          setSession(snap);
          setDemo((d) => ({ ...d, line: i + 1 }));
          await wait(DEMO_LINE_DELAY_MS);
        }
        setSession(await api.endSession(settings.serverUrl, snap.id));
      } catch (e) {
        setGuard((g) => ({ ...g, message: e.message }));
      } finally {
        setDemo({ playing: false, line: 0, total: 0 });
      }
    },
    [settings.serverUrl]
  );

  const stopDemo = useCallback(() => {
    demoCancelled.current = true;
  }, []);

  // ---------- the alarm ----------
  useEffect(() => {
    if (!session?.risk?.alert) return;
    if (alertShownFor.current !== session.id) {
      alertShownFor.current = session.id;
      Vibration.vibrate([0, 500, 200, 500, 200, 800]);
      // For real phone calls the native overlay already covers the call screen.
      const overlayHandlesIt = session.source === 'phone' && setup.accessibility;
      if (!overlayHandlesIt) setAlertModal({ visible: true, telegram: session.alert?.telegram });
    } else {
      setAlertModal((m) => (m.visible ? { ...m, telegram: session.alert?.telegram } : m));
    }
  }, [session]);

  const previewWarning = useCallback(() => {
    if (Guard.isAvailable && Guard.isAccessibilityEnabled()) Guard.showTestWarning();
    else setAlertModal({ visible: true, telegram: 'preview' });
  }, []);

  const goTo = useCallback((t) => setTab(t), []);
  const liveDot = session && !session.endedAt ? levelColor(session.risk.level) : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
        {tab === 'guard' && (
          <GuardScreen
            nativeAvailable={Guard.isAvailable}
            guard={guard}
            setup={setup}
            session={session}
            onToggle={toggleGuard}
            onRequestPermissions={requestPermissions}
            onOpenAccessibility={Guard.openAccessibilitySettings}
            onOpenAppSettings={Guard.openAppSettings}
            goTo={goTo}
          />
        )}
        {tab === 'live' && <LiveScreen session={session} demo={demo} onStopDemo={stopDemo} goTo={goTo} />}
        {tab === 'demo' && <DemoScreen serverUrl={settings.serverUrl} demo={demo} onPlay={playDemo} onStop={stopDemo} />}
        {tab === 'settings' && (
          <SettingsScreen
            settings={settings}
            onSave={saveSettings}
            health={health}
            onCheckServer={checkServer}
            onPreviewWarning={previewWarning}
            nativeAvailable={Guard.isAvailable}
            guardRunning={guard.running}
          />
        )}
      </View>
      <TabBar tab={tab} onChange={setTab} bottomInset={insets.bottom} liveDot={liveDot} />
      <AlertModal
        visible={alertModal.visible}
        telegram={alertModal.telegram}
        onClose={() => setAlertModal({ visible: false, telegram: null })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
