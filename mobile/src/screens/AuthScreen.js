import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useAuth } from '../AuthContext';
import { Button, Field, Notice, Card } from '../components/UI';
import { colors } from '../theme';

// Login and registration on one screen (a toggle switches between them)
export default function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF({ ...f, [k]: v });

  async function submit() {
    setError('');
    if (mode === 'register') {
      if (!f.name.trim() || !f.email.trim()) return setError('Name and email are required.');
      if (f.password.length < 6) return setError('Password must be at least 6 characters.');
      if (f.password !== f.confirm) return setError('The two passwords do not match.');
    } else if (!f.email.trim() || !f.password) {
      return setError('Enter your email and password.');
    }
    setBusy(true);
    try {
      if (mode === 'login') await login(f.email, f.password);
      else await register({ name: f.name, email: f.email, phone: f.phone, password: f.password });
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 56 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <View style={{ width: 54, height: 54, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 34, fontWeight: '700', marginTop: -3 }}>+</Text>
          </View>
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.ink, marginTop: 10 }}>CityCare Hospital</Text>
          <Text style={{ color: colors.muted }}>Patient app</Text>
        </View>

        <Card>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.ink }}>{mode === 'login' ? 'Log in' : 'Create an account'}</Text>
          <Notice text={error} />
          {mode === 'register' && <Field label="Full name" value={f.name} onChangeText={set('name')} autoCapitalize="words" />}
          <Field label="Email" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="name@example.com" />
          {mode === 'register' && <Field label="Phone (optional)" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />}
          <Field label="Password" value={f.password} onChangeText={set('password')} secureTextEntry autoCapitalize="none" />
          {mode === 'register' && <Field label="Confirm password" value={f.confirm} onChangeText={set('confirm')} secureTextEntry autoCapitalize="none" />}
          <Button title={busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'} onPress={submit} disabled={busy} style={{ marginTop: 18 }} />
          <TouchableOpacity onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{mode === 'login' ? 'New patient? Create an account' : 'Already registered? Log in'}</Text>
          </TouchableOpacity>
        </Card>

        {mode === 'login' && (
          <View style={{ padding: 14, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: colors.line }}>
            <Text style={{ fontWeight: '700', color: colors.ink, marginBottom: 4 }}>Demo patient</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>ayush@citycare.in / Patient@123</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
