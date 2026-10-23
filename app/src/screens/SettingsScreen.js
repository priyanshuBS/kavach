// Server address, test buttons and options for testing on your own phone.
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import { Button, Card, SectionTitle } from '../components/ui';
import { AUDIO_SOURCES } from '../../modules/kavach-guard';
import { colors, type } from '../theme';

function Row({ label, on }) {
  return (
    <View style={styles.row}>
      <Text style={type.body}>{label}</Text>
      <Text style={[type.body, { fontWeight: '700', color: on ? colors.safe : colors.inkFaint }]}>{on ? 'On' : 'Off'}</Text>
    </View>
  );
}

export default function SettingsScreen({ settings, onSave, health, onCheckServer, onPreviewWarning, nativeAvailable, guardRunning }) {
  const [url, setUrl] = useState(settings.serverUrl);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => setUrl(settings.serverUrl), [settings.serverUrl]);

  const saveAndTest = async () => {
    setBusy('save');
    setMessage('');
    const clean = url.trim().replace(/\/+$/, '');
    const withScheme = clean && !/^https?:\/\//.test(clean) ? `http://${clean}` : clean;
    await onSave({ serverUrl: withScheme });
    const result = await onCheckServer(withScheme);
    setMessage(result.ok ? 'Connected to the server.' : result.error);
    setBusy('');
  };

  const testTelegram = async () => {
    setBusy('tg');
    try {
      await api.testAlert(settings.serverUrl);
      setMessage('Test alert sent. Check Telegram on the family member\'s phone.');
    } catch (e) {
      setMessage(e.message);
    }
    setBusy('');
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={type.display}>Settings</Text>

      <SectionTitle>Kavach server</SectionTitle>
      <Card style={{ gap: 12 }}>
        <Text style={type.small}>
          Start the backend on your laptop. It prints a "Phone URL" such as http://192.168.1.5:4000. Type it here. The phone and laptop must be on the same Wi-Fi.
        </Text>
        <TextInput
          value={url}
          onChangeText={setUrl}
          placeholder="http://192.168.1.5:4000"
          placeholderTextColor={colors.inkFaint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={styles.input}
        />
        <Button title="Save and test connection" onPress={saveAndTest} loading={busy === 'save'} />
        {!!message && <Text style={[type.small, { color: colors.ink }]}>{message}</Text>}
        {health && (
          <View style={{ marginTop: 4 }}>
            <Row label="AI stage detection (Groq)" on={health.llm} />
            <Row label="Speech to text (Groq)" on={health.groq} />
            <Row label="Telegram family alert" on={health.telegram} />
          </View>
        )}
      </Card>

      <SectionTitle>Check the alarm</SectionTitle>
      <Card style={{ gap: 12 }}>
        <Button title="Send a test Telegram alert" variant="ghost" onPress={testTelegram} loading={busy === 'tg'} />
        <Button title="Preview the warning screen" variant="ghost" onPress={onPreviewWarning} />
      </Card>

      {nativeAvailable && (
        <>
          <SectionTitle>Testing on your phone</SectionTitle>
          <Card style={{ gap: 14 }}>
            <View style={styles.row}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[type.body, { fontWeight: '700' }]}>Listen without a call</Text>
                <Text style={type.small}>Kavach listens all the time while the guard is on. Useful for testing: play a scam recording near the phone.</Text>
              </View>
              <Switch
                value={settings.alwaysListen}
                onValueChange={(v) => onSave({ alwaysListen: v })}
                trackColor={{ true: colors.saffron }}
              />
            </View>

            <View>
              <Text style={[type.body, { fontWeight: '700' }]}>Microphone source</Text>
              <Text style={type.small}>If Kavach hears silence during calls on your phone, try another source.</Text>
              <View style={styles.chips}>
                {AUDIO_SOURCES.map((s) => {
                  const active = settings.audioSource === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => onSave({ audioSource: s.id })}
                      style={[styles.chip, active && styles.chipActive]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.chipText, active && { color: '#fff' }]}>{s.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            {guardRunning && <Text style={type.small}>Changes apply the next time you turn the guard on.</Text>}
          </Card>
        </>
      )}

      <Text style={[type.small, styles.footer]}>
        Kavach sends call audio to your own Kavach server, which uses Groq for speech-to-text. Nothing is stored after the server stops.
        National cyber crime helpline: 1930 · cybercrime.gov.in
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 54,
    fontSize: 17,
    color: colors.ink,
    backgroundColor: colors.bg,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { borderWidth: 1.5, borderColor: colors.line, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontWeight: '600', color: colors.ink },
  footer: { textAlign: 'center', marginTop: 28 },
});
