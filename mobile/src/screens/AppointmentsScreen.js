import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { api } from '../api';
import { Badge, Button, Card, Header, Loading, Notice } from '../components/UI';
import { colors } from '../theme';
import { formatDate, formatTime, todayStr } from '../utils';

const FILTERS = [['upcoming', 'Upcoming'], ['past', 'Past'], ['cancelled', 'Cancelled'], ['all', 'All']];

export default function AppointmentsScreen({ openAppointment, refreshKey }) {
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState('upcoming');
  const [msg, setMsg] = useState({ kind: 'error', text: '' });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setList(await api.get('/appointments')); } catch (e) { setMsg({ kind: 'error', text: e.message }); }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const today = todayStr();
  const shown = (list || []).filter((a) => {
    if (filter === 'upcoming') return ['pending', 'confirmed'].includes(a.status) && a.appointment_date >= today;
    if (filter === 'past') return a.status === 'completed' || (['pending', 'confirmed'].includes(a.status) && a.appointment_date < today);
    if (filter === 'cancelled') return a.status === 'cancelled';
    return true;
  });

  function cancel(a) {
    Alert.alert('Cancel appointment', `Cancel your visit with ${a.doctor_name} on ${formatDate(a.appointment_date)}?`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel appointment', style: 'destructive',
        onPress: async () => {
          try { await api.patch(`/appointments/${a.id}/status`, { status: 'cancelled' }); setMsg({ kind: 'success', text: 'Appointment cancelled.' }); await load(); }
          catch (e) { setMsg({ kind: 'error', text: e.message }); }
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1 }}>
      <Header title="Appointments" />
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, flexWrap: 'wrap' }}>
        {FILTERS.map(([id, label]) => (
          <TouchableOpacity key={id} onPress={() => setFilter(id)}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1, marginRight: 8, marginBottom: 8, borderColor: filter === id ? colors.primary : colors.lineStrong, backgroundColor: filter === id ? colors.primary : '#fff' }}>
            <Text style={{ color: filter === id ? '#fff' : colors.muted, fontWeight: '600', fontSize: 13 }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ paddingHorizontal: 16 }}><Notice kind={msg.kind} text={msg.text} /></View>
      {!list ? <Loading /> : (
        <FlatList
          data={shown}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          ListEmptyComponent={<Text style={{ color: colors.muted, textAlign: 'center', marginTop: 30 }}>No appointments here.</Text>}
          renderItem={({ item: a }) => (
            <Card>
              <TouchableOpacity onPress={() => openAppointment(a.id)}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontWeight: '700', fontSize: 16, color: colors.ink }}>{a.doctor_name}</Text>
                    <Text style={{ color: colors.muted }}>{a.specialization}</Text>
                  </View>
                  <Badge status={a.status} />
                </View>
                <Text style={{ marginTop: 8, color: colors.ink, fontWeight: '600' }}>{formatDate(a.appointment_date)} at {formatTime(a.start_time)}</Text>
                <Text style={{ color: colors.muted, marginTop: 2 }}>{a.reason}</Text>
              </TouchableOpacity>
              {['pending', 'confirmed'].includes(a.status) && (
                <Button title="Cancel appointment" kind="danger" small onPress={() => cancel(a)} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
              )}
            </Card>
          )}
        />
      )}
    </View>
  );
}
