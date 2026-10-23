// Small shared building blocks: Card, Button, Pill, SectionTitle.
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, type } from '../theme';

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, style }) {
  const v = variants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border },
        (pressed || disabled) && { opacity: disabled ? 0.45 : 0.85 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={v.text} /> : <Text style={[styles.buttonText, { color: v.text }]}>{title}</Text>}
    </Pressable>
  );
}

const variants = {
  primary: { bg: colors.ink, text: '#fff', border: colors.ink },
  saffron: { bg: colors.saffron, text: '#fff', border: colors.saffron },
  danger: { bg: colors.danger, text: '#fff', border: colors.danger },
  ghost: { bg: 'transparent', text: colors.ink, border: colors.line },
};

export function Pill({ label, color = colors.inkSoft, bg = colors.bg }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ children }) {
  return <Text style={styles.section}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  button: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonText: { fontSize: 18, fontWeight: '700' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, alignSelf: 'flex-start' },
  pillText: { fontSize: 13, fontWeight: '600' },
  section: { ...type.title, fontSize: 18, marginTop: 26, marginBottom: 10 },
});
