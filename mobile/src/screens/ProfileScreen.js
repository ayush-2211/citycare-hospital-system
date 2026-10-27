import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { Button, Card, Field, Header, Loading, Notice } from '../components/UI';
import { colors } from '../theme';

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const [f, setF] = useState(null);
  const [msg, setMsg] = useState({ kind: 'error', text: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/patients/me').then((p) => setF({
      name: p.name || '', phone: p.phone || '', date_of_birth: p.date_of_birth ? String(p.date_of_birth).slice(0, 10) : '',
      gender: p.gender || '', blood_group: p.blood_group || '', address: p.address || '',
      emergency_contact: p.emergency_contact || '', allergies: p.allergies || '',
    })).catch((e) => setMsg({ kind: 'error', text: e.message }));
  }, []);

  const set = (k) => (v) => setF({ ...f, [k]: v });

  async function save() {
    setMsg({ kind: 'error', text: '' });
    setBusy(true);
    try {
      const r = await api.put('/patients/me', f);
      updateUser({ name: f.name.trim() });
      setMsg({ kind: 'success', text: r.message });
    } catch (e) { setMsg({ kind: 'error', text: e.message }); }
    finally { setBusy(false); }
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <Header title="My profile" subtitle={user.email} />
      <View style={{ paddingHorizontal: 16 }}>
        <Notice kind={msg.kind} text={msg.text} />
        {!f && !msg.text && <Loading />}
        {f && (
          <Card>
            <Field label="Full name" value={f.name} onChangeText={set('name')} style={{ marginTop: 0 }} />
            <Field label="Phone" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
            <Field label="Date of birth (YYYY-MM-DD)" value={f.date_of_birth} onChangeText={set('date_of_birth')} placeholder="2003-08-14" />
            <Field label="Gender (male, female or other)" value={f.gender} onChangeText={set('gender')} autoCapitalize="none" />
            <Field label="Blood group (for example B+)" value={f.blood_group} onChangeText={set('blood_group')} autoCapitalize="characters" />
            <Field label="Address" value={f.address} onChangeText={set('address')} />
            <Field label="Emergency contact" value={f.emergency_contact} onChangeText={set('emergency_contact')} />
            <Field label="Allergies" value={f.allergies} onChangeText={set('allergies')} />
            <Button title={busy ? 'Saving…' : 'Save changes'} onPress={save} disabled={busy} style={{ marginTop: 16 }} />
          </Card>
        )}
        <Button title="Log out" kind="secondary" onPress={logout} style={{ marginTop: 4 }} />
        <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 12 }}>CityCare Hospital patient app</Text>
        <View style={{ height: 24 }} />
      </View>
    </ScrollView>
  );
}
