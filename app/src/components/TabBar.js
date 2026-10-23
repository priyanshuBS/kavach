// Bottom navigation with four tabs.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../theme';

function Icon({ name, color }) {
  const p = { stroke: color, strokeWidth: 2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      {name === 'guard' && <Path d="M12 2 4 5v6c0 5 3.4 9.2 8 11 4.6-1.8 8-6 8-11V5l-8-3z" {...p} />}
      {name === 'live' && <Path d="M3 12h3l3-7 4 14 3-7h5" {...p} />}
      {name === 'demo' && (
        <>
          <Circle cx="12" cy="12" r="9" {...p} />
          <Path d="m10 8.5 5 3.5-5 3.5z" {...p} />
        </>
      )}
      {name === 'settings' && (
        <>
          <Path d="M4 7h10M18 7h2M4 17h4M12 17h8" {...p} />
          <Circle cx="16" cy="7" r="2" {...p} />
          <Circle cx="10" cy="17" r="2" {...p} />
        </>
      )}
    </Svg>
  );
}

const TABS = [
  { id: 'guard', label: 'Guard' },
  { id: 'live', label: 'Live call' },
  { id: 'demo', label: 'Demo' },
  { id: 'settings', label: 'Settings' },
];

export default function TabBar({ tab, onChange, bottomInset, liveDot }) {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(bottomInset, 10) }]}>
      {TABS.map((t) => {
        const active = t.id === tab;
        const color = active ? colors.ink : colors.inkFaint;
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange(t.id)}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <View>
              <Icon name={t.id} color={color} />
              {t.id === 'live' && liveDot && <View style={[styles.dot, { backgroundColor: liveDot }]} />}
            </View>
            <Text style={[styles.label, { color }, active && { fontWeight: '800' }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4 },
  label: { fontSize: 13, fontWeight: '600' },
  dot: { position: 'absolute', right: -3, top: -1, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#fff' },
});
