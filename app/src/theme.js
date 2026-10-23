import { Platform } from 'react-native';

export const colors = {
  bg: '#F3F5FA',
  surface: '#FFFFFF',
  ink: '#16193A',
  inkSoft: '#5A6080',
  inkFaint: '#9AA0B8',
  line: '#E2E6F0',
  saffron: '#E8890C',
  saffronSoft: '#FDF1E1',
  safe: '#1F9D7A',
  safeSoft: '#E3F5EF',
  caution: '#C98A00',
  cautionSoft: '#FFF4D6',
  danger: '#D7263D',
  dangerSoft: '#FCE6E9',
};

export const levelColor = (level) =>
  ({ safe: colors.safe, caution: colors.caution, danger: colors.danger })[level] || colors.inkFaint;

export const levelSoft = (level) =>
  ({ safe: colors.safeSoft, caution: colors.cautionSoft, danger: colors.dangerSoft })[level] || colors.bg;

export const levelWord = (level) =>
  ({ safe: 'Looks safe', caution: 'Be careful', danger: 'Scam likely' })[level] || 'Waiting';

const family = Platform.select({ android: 'sans-serif', default: undefined });
const condensed = Platform.select({ android: 'sans-serif-condensed', default: undefined });

// Large, plain type: this app is often used by older people.
export const type = {
  display: { fontFamily: condensed, fontSize: 34, lineHeight: 40, fontWeight: '800', color: colors.ink },
  title: { fontFamily: family, fontSize: 22, lineHeight: 28, fontWeight: '700', color: colors.ink },
  body: { fontFamily: family, fontSize: 17, lineHeight: 25, color: colors.ink },
  small: { fontFamily: family, fontSize: 14, lineHeight: 20, color: colors.inkSoft },
  number: { fontFamily: condensed, fontWeight: '800', color: colors.ink },
};

export const STAGES = [
  { id: 'impersonation', label: 'Fake officer', hint: 'Claims to be CBI, police, customs, TRAI…' },
  { id: 'accusation', label: 'Accusation', hint: 'Says you are linked to a crime' },
  { id: 'isolation', label: 'Isolation', hint: '"Don\'t tell anyone, stay on camera"' },
  { id: 'urgency', label: 'Urgency', hint: 'Threatens arrest or jail right now' },
  { id: 'money', label: 'Money demand', hint: 'Asks you to transfer money' },
];
