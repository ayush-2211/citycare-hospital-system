import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { api } from '../api';
import { Card, Header, Loading, Notice } from '../components/UI';
import { colors } from '../theme';
import { formatDate } from '../utils';

export default function PrescriptionsScreen({ openAppointment }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try { setList(await api.get('/prescriptions')); setError(''); } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ flex: 1 }}>
      <Header title="My prescriptions" subtitle="Newest first" />
      <View style={{ paddingHorizontal: 16 }}><Notice text={error} /></View>
      {!list && !error ? <Loading /> : (
        <FlatList
          data={list || []}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          ListEmptyComponent={<Text style={{ color: colors.muted, textAlign: 'center', marginTop: 30 }}>You have no prescriptions yet.</Text>}
          renderItem={({ item: rx }) => (
            <Card>
              <Text style={{ fontWeight: '700', fontSize: 16, color: colors.ink }}>{rx.doctor_name}</Text>
              <Text style={{ color: colors.muted }}>{rx.specialization} · {formatDate(rx.appointment_date)}</Text>
              {rx.diagnosis ? <Text style={{ color: colors.ink, marginTop: 4 }}>Diagnosis: {rx.diagnosis}</Text> : null}
              {rx.items.map((i) => (
                <View key={i.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line, marginTop: 8 }}>
                  <Text style={{ fontWeight: '700', color: colors.ink }}>{i.medicine}</Text>
                  <Text style={{ color: colors.muted }}>{i.dosage} · {i.frequency} · {i.duration_days} days</Text>
                  {i.instructions ? <Text style={{ color: colors.muted, fontSize: 13 }}>{i.instructions}</Text> : null}
                </View>
              ))}
              {rx.notes ? <Text style={{ color: colors.muted, marginTop: 6 }}>Note: {rx.notes}</Text> : null}
              <TouchableOpacity onPress={() => openAppointment(rx.appointment_id)} style={{ marginTop: 8 }}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>View the full consultation</Text>
              </TouchableOpacity>
            </Card>
          )}
        />
      )}
    </View>
  );
}
