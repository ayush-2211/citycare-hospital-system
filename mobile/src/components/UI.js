import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, statusStyle } from '../theme';

export function Button({ title, onPress, kind = 'primary', disabled, small, style }) {
  const palette = {
    primary: { bg: colors.primary, fg: '#fff', border: colors.primary },
    secondary: { bg: '#fff', fg: colors.ink, border: colors.lineStrong },
    danger: { bg: '#fff', fg: colors.danger, border: '#e7b5b0' },
  }[kind];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.btn, { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.5 : 1 }, small && styles.btnSmall, style]}
    >
      <Text style={[styles.btnText, { color: palette.fg }, small && { fontSize: 13 }]}>{title}</Text>
    </TouchableOpacity>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ status }) {
  const s = statusStyle[status] || statusStyle.pending;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

export function Field({ label, style, ...props }) {
  return (
    <View style={[{ marginTop: 12 }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput placeholderTextColor="#8d9aa5" style={[styles.input, props.multiline && { height: 84, textAlignVertical: 'top' }]} {...props} />
    </View>
  );
}

export function Notice({ kind = 'error', text }) {
  if (!text) return null;
  const ok = kind === 'success';
  return (
    <View style={[styles.notice, { backgroundColor: ok ? colors.okTint : colors.dangerTint, borderColor: ok ? '#b5e0cd' : '#f2c3be' }]}>
      <Text style={{ color: ok ? '#07583c' : '#8a1b12', fontSize: 14 }}>{text}</Text>
    </View>
  );
}

export function Loading({ text = 'Loading…' }) {
  return (
    <View style={{ padding: 24, alignItems: 'center' }}>
      <ActivityIndicator color={colors.primary} />
      <Text style={{ color: colors.muted, marginTop: 8 }}>{text}</Text>
    </View>
  );
}

export function Header({ title, subtitle, onBack, right }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={{ marginBottom: 6 }} accessibilityLabel="Go back">
          <Text style={{ color: colors.primary, fontSize: 15 }}>{'\u2190'} Back</Text>
        </TouchableOpacity>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={{ color: colors.muted, marginTop: 2 }}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

export function Row({ label, value }) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.ink, fontSize: 15 }}>{value || '-'}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 7, paddingHorizontal: 12 },
  btnText: { fontWeight: '700', fontSize: 15 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 16, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.ink, backgroundColor: '#fff' },
  notice: { borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 10 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: '700', color: colors.ink },
  h2: { fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 6 },
});
