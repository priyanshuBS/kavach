// Live transcript bubbles, newest at the bottom.
import { StyleSheet, Text, View } from 'react-native';
import { colors, STAGES, type } from '../theme';

const LABEL = Object.fromEntries(STAGES.map((s) => [s.id, s.label]));
const WHO = { caller: 'Caller', user: 'You', call: 'Call audio' };

const clock = (t = 0) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;

export default function Transcript({ lines = [] }) {
  if (!lines.length) {
    return <Text style={[type.small, { textAlign: 'center', paddingVertical: 20 }]}>Words from the call will appear here.</Text>;
  }
  return (
    <View style={{ gap: 10 }}>
      {lines.map((l, i) => {
        const mine = l.speaker === 'user';
        return (
          <View key={i} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
            <Text style={styles.meta}>
              {WHO[l.speaker] || 'Caller'}  {clock(l.t)}
            </Text>
            <Text style={type.body}>{l.text}</Text>
            {l.hits?.length > 0 && (
              <View style={styles.tags}>
                {l.hits.map((h) => (
                  <Text key={h} style={styles.tag}>
                    {LABEL[h]}
                  </Text>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { padding: 12, borderRadius: 16, maxWidth: '92%' },
  theirs: { backgroundColor: colors.bg, borderTopLeftRadius: 4, alignSelf: 'flex-start' },
  mine: { backgroundColor: colors.saffronSoft, borderTopRightRadius: 4, alignSelf: 'flex-end' },
  meta: { fontSize: 12, color: colors.inkFaint, marginBottom: 2, fontWeight: '600' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    overflow: 'hidden',
  },
});
