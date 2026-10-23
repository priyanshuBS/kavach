// The five steps of the scam script, top to bottom. A step turns red once detected.
import { StyleSheet, Text, View } from 'react-native';
import { colors, STAGES, type } from '../theme';

export default function StageLadder({ stages = {} }) {
  return (
    <View>
      {STAGES.map((s, i) => {
        const c = stages[s.id]?.confidence ?? 0;
        const hit = c >= 0.5;
        const last = i === STAGES.length - 1;
        return (
          <View key={s.id} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.dot, hit && styles.dotHit]}>
                <Text style={[styles.num, hit && { color: '#fff' }]}>{i + 1}</Text>
              </View>
              {!last && <View style={[styles.line, hit && { backgroundColor: colors.danger }]} />}
            </View>
            <View style={styles.body}>
              <View style={styles.head}>
                <Text style={[type.body, styles.label, hit && { color: colors.danger }]}>{s.label}</Text>
                <View style={styles.bar}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${Math.round(c * 100)}%`, backgroundColor: hit ? colors.danger : colors.caution },
                    ]}
                  />
                </View>
              </View>
              <Text style={type.small}>{s.hint}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  rail: { width: 40, alignItems: 'center' },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotHit: { backgroundColor: colors.danger, borderColor: colors.danger },
  num: { fontWeight: '800', color: colors.inkSoft },
  line: { width: 2, flex: 1, backgroundColor: colors.line, marginVertical: 2 },
  body: { flex: 1, paddingLeft: 8, paddingBottom: 16 },
  head: { flexDirection: 'row', alignItems: 'center', minHeight: 30 },
  label: { flex: 1, fontWeight: '700' },
  bar: { width: 64, height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
