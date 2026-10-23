// Full-screen in-app warning (the native overlay does the same over the call screen).
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

const TELEGRAM = {
  sent: 'Your family has been alerted on Telegram.',
  sending: 'Alerting your family on Telegram…',
  failed: 'The Telegram alert could not be sent.',
  off: 'Family alerts are not set up yet.',
  preview: 'This is a preview. No alert was sent.',
};

export default function AlertModal({ visible, telegram, onClose }) {
  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>Scam alert</Text>
        <Text style={styles.text}>This call matches the digital arrest scam.</Text>
        <Text style={styles.strong}>Real police never arrest anyone on a phone or video call.</Text>
        <Text style={styles.big}>Hang up now and call 1930.</Text>
        <Text style={styles.small}>{TELEGRAM[telegram] || TELEGRAM.off}</Text>

        <Pressable style={styles.call} onPress={() => Linking.openURL('tel:1930')} accessibilityRole="button">
          <Text style={styles.callText}>Call 1930 (Cyber helpline)</Text>
        </Pressable>
        <Pressable style={styles.close} onPress={onClose} accessibilityRole="button">
          <Text style={styles.closeText}>Close warning</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#A3001B', padding: 28, justifyContent: 'center' },
  icon: { fontSize: 64, textAlign: 'center' },
  title: { fontSize: 40, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 12 },
  text: { fontSize: 19, color: '#fff', opacity: 0.92, textAlign: 'center', marginBottom: 10 },
  strong: { fontSize: 22, lineHeight: 30, color: '#fff', fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  big: { fontSize: 26, color: '#fff', fontWeight: '900', textAlign: 'center' },
  small: { fontSize: 15, color: '#fff', opacity: 0.8, textAlign: 'center', marginTop: 14 },
  call: { backgroundColor: '#fff', borderRadius: 18, minHeight: 60, justifyContent: 'center', marginTop: 32 },
  callText: { color: colors.danger, fontSize: 19, fontWeight: '800', textAlign: 'center' },
  close: { borderColor: '#fff', borderWidth: 2, borderRadius: 18, minHeight: 56, justifyContent: 'center', marginTop: 12 },
  closeText: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
});
