// Live view of the current call: risk meter, the five scam steps and the transcript.
import { useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import RiskRing from '../components/RiskRing';
import StageLadder from '../components/StageLadder';
import Transcript from '../components/Transcript';
import { Button, Card, Pill, SectionTitle } from '../components/ui';
import { colors, levelColor, levelSoft, type } from '../theme';

export default function LiveScreen({ session, demo, onStopDemo, goTo }) {
  const scroll = useRef(null);

  if (!session) {
    return (
      <View style={styles.empty}>
        <Text style={[type.display, { textAlign: 'center' }]}>No call yet</Text>
        <Text style={[type.body, styles.emptyText]}>
          Turn the guard on and take a call on speaker, or play a demo call to see Kavach at work.
        </Text>
        <Button title="Play a demo call" variant="saffron" onPress={() => goTo('demo')} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }

  const risk = session.risk;
  const live = !session.endedAt;
  const heading = session.source === 'demo' ? session.title || 'Demo call' : 'Phone call';

  return (
    <ScrollView
      ref={scroll}
      contentContainerStyle={styles.content}
      onContentSizeChange={() => live && scroll.current?.scrollToEnd({ animated: true })}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={type.title} numberOfLines={2}>{heading}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            {live ? <Pill label="● Live" color={colors.danger} bg={colors.dangerSoft} /> : <Pill label="Ended" />}
            {session.source === 'demo' && <Pill label="Demo" color={colors.saffron} bg={colors.saffronSoft} />}
          </View>
        </View>
        {demo.playing && <Button title="Stop" variant="ghost" onPress={onStopDemo} style={{ minHeight: 44 }} />}
      </View>

      <Card style={[styles.riskCard, { backgroundColor: levelSoft(risk.level), borderColor: levelSoft(risk.level) }]}>
        <RiskRing score={risk.score} level={risk.level} />
        <Text style={[type.body, styles.reason, { color: levelColor(risk.level) }]}>{session.llmNote || risk.reason}</Text>
      </Card>

      <SectionTitle>The scam script</SectionTitle>
      <Card>
        <StageLadder stages={session.stages} />
      </Card>

      <SectionTitle>What's being said</SectionTitle>
      <Card>
        <Transcript lines={session.transcript} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  riskCard: { alignItems: 'center', paddingVertical: 24 },
  reason: { textAlign: 'center', marginTop: 14, fontWeight: '700', maxWidth: 300 },
  empty: { flex: 1, padding: 28, justifyContent: 'center', gap: 14 },
  emptyText: { textAlign: 'center', color: colors.inkSoft, marginBottom: 12 },
});
