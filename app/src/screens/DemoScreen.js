// Plays the role-played calls from the backend, line by line, through the real detector.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { Button, Card, Pill } from '../components/ui';
import { colors, type } from '../theme';

export default function DemoScreen({ serverUrl, demo, onPlay, onStop }) {
  const [calls, setCalls] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setCalls(null);
    try {
      setCalls(await api.demoCalls(serverUrl));
    } catch (e) {
      setError(e.message);
      setCalls([]);
    }
  }, [serverUrl]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={type.display}>Demo calls</Text>
      <Text style={[type.body, styles.intro]}>
        Each call is played line by line through the same detector used for real calls. Watch the risk meter on the Live call
        tab. The scam calls should raise the alarm; the genuine ones should stay calm.
      </Text>

      {demo.playing && (
        <Card style={styles.playing}>
          <Text style={[type.body, { fontWeight: '700', flex: 1 }]}>Playing line {demo.line} of {demo.total}</Text>
          <Button title="Stop" variant="ghost" onPress={onStop} style={{ minHeight: 44 }} />
        </Card>
      )}

      {calls === null && <ActivityIndicator color={colors.ink} style={{ marginTop: 30 }} />}

      {!!error && (
        <Card style={styles.error}>
          <Text style={[type.body, { color: colors.danger }]}>{error}</Text>
          <Button title="Try again" variant="ghost" onPress={load} style={{ marginTop: 12 }} />
        </Card>
      )}

      <View style={{ gap: 12 }}>
        {calls?.map((c) => {
          const scam = c.label === 'scam';
          return (
            <Pressable
              key={c.id}
              onPress={() => onPlay(c)}
              disabled={demo.playing}
              accessibilityRole="button"
              style={({ pressed }) => [styles.call, pressed && { opacity: 0.85 }, demo.playing && { opacity: 0.5 }]}
            >
              <View style={[styles.play, { backgroundColor: scam ? colors.danger : colors.safe }]}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[type.body, { fontWeight: '700' }]}>{c.title}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pill
                    label={scam ? 'Scam' : 'Genuine'}
                    color={scam ? colors.danger : colors.safe}
                    bg={scam ? colors.dangerSoft : colors.safeSoft}
                  />
                  <Pill label={`${c.lines.length} lines · ${c.language}`} />
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  intro: { color: colors.inkSoft, marginTop: 8, marginBottom: 20 },
  playing: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, backgroundColor: colors.saffronSoft, borderColor: colors.saffronSoft },
  error: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft, marginBottom: 14 },
  call: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  play: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  playIcon: { color: '#fff', fontSize: 18, marginLeft: 3 },
});
