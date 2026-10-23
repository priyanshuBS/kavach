// Home screen: the shield, the on/off switch for the guard, and the setup steps.
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Shield from '../components/Shield';
import { Button, Card, SectionTitle } from '../components/ui';
import { colors, type } from '../theme';

function status({ nativeAvailable, guard, risk }) {
  if (!nativeAvailable)
    return {
      color: colors.inkFaint,
      symbol: 'off',
      title: 'Demo mode only',
      text: 'Live call protection needs the Kavach app build (not Expo Go). You can still try the demo calls.',
    };
  if (!guard.running)
    return { color: colors.inkFaint, symbol: 'off', title: 'Guard is off', text: 'Turn it on before taking calls.' };
  if (guard.state === 'listening' && risk?.alert)
    return { color: colors.danger, symbol: 'alert', title: 'This call looks like a scam', text: 'Hang up now. Real police never arrest anyone on a video call.' };
  if (guard.state === 'listening')
    return { color: colors.saffron, symbol: 'listen', pulse: true, title: 'Listening to this call', text: 'Keep the call on speaker so Kavach can hear the caller.' };
  return { color: colors.safe, symbol: 'check', title: 'Your calls are protected', text: 'Kavach starts listening as soon as a call begins.' };
}

function Step({ n, done, title, text, action }) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepNum, done && { backgroundColor: colors.safe, borderColor: colors.safe }]}>
        <Text style={[styles.stepNumText, done && { color: '#fff' }]}>{done ? '✓' : n}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[type.body, { fontWeight: '700' }]}>{title}</Text>
        <Text style={type.small}>{text}</Text>
        {!done && action}
      </View>
    </View>
  );
}

export default function GuardScreen(props) {
  const { nativeAvailable, guard, setup, session, onToggle, onRequestPermissions, onOpenAccessibility, onOpenAppSettings, goTo } = props;
  const s = status({ nativeAvailable, guard, risk: session?.source === 'phone' ? session.risk : null });
  const ready = setup.serverOk && setup.micGranted;
  const silent = guard.state === 'listening' && guard.level !== null && guard.level < 0.003;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[type.display, styles.brand]}>Kavach</Text>

      <View style={styles.hero}>
        <Shield color={s.color} symbol={s.symbol} pulse={s.pulse} />
        <Text style={[type.display, styles.title]}>{s.title}</Text>
        <Text style={[type.body, styles.subtitle]}>{s.text}</Text>
      </View>

      {nativeAvailable ? (
        <Button
          title={guard.running ? 'Turn guard off' : 'Turn guard on'}
          variant={guard.running ? 'ghost' : 'saffron'}
          onPress={onToggle}
          disabled={!guard.running && !ready}
        />
      ) : (
        <Button title="Try a demo call" variant="saffron" onPress={() => goTo('demo')} />
      )}

      {guard.state === 'listening' && (
        <Card style={{ marginTop: 14 }}>
          <Text style={[type.small, { marginBottom: 8 }]}>Sound Kavach can hear</Text>
          <View style={styles.meter}>
            <View style={[styles.meterFill, { width: `${Math.min(100, Math.round((guard.level || 0) * 1500))}%` }]} />
          </View>
          {silent && (
            <Text style={[type.small, { color: colors.danger, marginTop: 8 }]}>
              Kavach hears silence. Turn on the call guard in Accessibility, or try another microphone in Settings.
            </Text>
          )}
          <Button title="Open live call" variant="ghost" style={{ marginTop: 12 }} onPress={() => goTo('live')} />
        </Card>
      )}

      {guard.message && guard.state === 'error' && (
        <Card style={[styles.error]}>
          <Text style={[type.body, { color: colors.danger }]}>{guard.message}</Text>
        </Card>
      )}

      {nativeAvailable && (
        <>
          <SectionTitle>Set up once</SectionTitle>
          <Card style={{ gap: 18 }}>
            <Step
              n={1}
              done={setup.serverOk}
              title="Connect to the Kavach server"
              text={setup.serverOk ? 'Connected.' : setup.serverError || 'Add the server address shown when you start the backend.'}
              action={<Button title="Open settings" variant="ghost" onPress={() => goTo('settings')} style={styles.stepBtn} />}
            />
            <Step
              n={2}
              done={setup.micGranted}
              title="Allow microphone and notifications"
              text="Kavach needs the microphone to hear the call, and notifications to warn you."
              action={<Button title="Allow" variant="ghost" onPress={onRequestPermissions} style={styles.stepBtn} />}
            />
            <Step
              n={3}
              done={setup.accessibility}
              title="Turn on Kavach call guard"
              text="Android only lets Kavach hear calls and show the warning over the call screen when this is on. Find 'Kavach call guard' under Accessibility → Installed apps."
              action={
                <View style={{ gap: 8 }}>
                  <Button title="Open accessibility settings" variant="ghost" onPress={onOpenAccessibility} style={styles.stepBtn} />
                  <Text style={type.small}>
                    Greyed out? Open App info, tap ⋮ (top right) → "Allow restricted settings", then try again.
                  </Text>
                  <Button title="Open app info" variant="ghost" onPress={onOpenAppSettings} style={styles.stepBtn} />
                </View>
              }
            />
          </Card>
        </>
      )}

      <Text style={[type.small, styles.footer]}>
        Real police, CBI or courts never arrest anyone on a phone or video call. If in doubt, hang up and call 1930.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  brand: { fontSize: 22, lineHeight: 28, color: colors.saffron },
  hero: { alignItems: 'center', marginTop: 4, marginBottom: 24 },
  title: { textAlign: 'center', marginTop: 4 },
  subtitle: { textAlign: 'center', color: colors.inkSoft, marginTop: 8, maxWidth: 320 },
  meter: { height: 10, borderRadius: 5, backgroundColor: colors.line, overflow: 'hidden' },
  meterFill: { height: '100%', backgroundColor: colors.saffron, borderRadius: 5 },
  error: { marginTop: 14, backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft },
  step: { flexDirection: 'row', gap: 14 },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontWeight: '800', color: colors.inkSoft },
  stepBtn: { minHeight: 46, marginTop: 6, alignSelf: 'flex-start' },
  footer: { textAlign: 'center', marginTop: 28 },
});
