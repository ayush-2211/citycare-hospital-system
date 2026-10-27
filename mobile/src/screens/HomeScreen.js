import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { Button, Card, Badge, Header, Notice, styles } from '../components/UI';
import { colors } from '../theme';
import { formatDate, formatTime, formatStamp, todayStr } from '../utils';

export default function HomeScreen({ go, openAppointment, refreshKey }) {
  const { user } = useAuth();
  const [data, setData] = useState({ appts: [], notes: [], rx: [] });
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [appts, notes, rx] = await Promise.all([api.get('/appointments'), api.get('/notifications'), api.get('/prescriptions')]);
      setData({ appts, notes, rx });
      setError('');
    } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const today = todayStr();
  const upcoming = data.appts
    .filter((a) => ['pending', 'confirmed'].includes(a.status) && a.appointment_date >= today)
    .sort((a, b) => (a.appointment_date + a.start_time).localeCompare(b.appointment_date + b.start_time));
  const next = upcoming[0];

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
      <Header title={`Hello, ${user.name.split(' ')[0]}`} subtitle="Here is what is coming up." />
      <View style={{ paddingHorizontal: 16 }}>
        <Notice text={error} />

        <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary, marginTop: 6 }}>
          {next ? (
            <>
              <Text style={{ color: '#b9dbef', fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>YOUR NEXT APPOINTMENT</Text>
              <Text style={{ color: '#fff', fontSize: 21, fontWeight: '700', marginTop: 4 }}>{next.doctor_name}</Text>
              <Text style={{ color: '#e3f1f9', marginTop: 2 }}>{next.specialization}</Text>
              <Text style={{ color: '#e3f1f9', marginTop: 2 }}>{formatDate(next.appointment_date)} at {formatTime(next.start_time)}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <Badge status={next.status} />
                <Button title="View details" kind="secondary" small onPress={() => openAppointment(next.id)} />
              </View>
            </>
          ) : (
            <>
              <Text style={{ color: '#b9dbef', fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>NO UPCOMING APPOINTMENTS</Text>
              <Text style={{ color: '#fff', fontSize: 21, fontWeight: '700', marginTop: 4 }}>Need to see a doctor?</Text>
              <Button title="Book an appointment" kind="secondary" onPress={() => go('book')} style={{ marginTop: 12 }} />
            </>
          )}
        </Card>

        <Card>
          <Text style={styles.h2}>Upcoming</Text>
          {upcoming.length === 0 && <Text style={{ color: colors.muted }}>Nothing scheduled.</Text>}
          {upcoming.slice(0, 4).map((a) => (
            <View key={a.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontWeight: '600', color: colors.ink }}>{a.doctor_name}</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>{formatDate(a.appointment_date)}, {formatTime(a.start_time)}</Text>
              </View>
              <Badge status={a.status} />
            </View>
          ))}
        </Card>

        <Card>
          <Text style={styles.h2}>Latest notifications</Text>
          {data.notes.length === 0 && <Text style={{ color: colors.muted }}>No notifications yet.</Text>}
          {data.notes.slice(0, 3).map((n) => (
            <View key={n.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
              <Text style={{ fontWeight: n.is_read ? '500' : '700', color: colors.ink }}>{n.title}</Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>{n.message}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{formatStamp(n.created_at)}</Text>
            </View>
          ))}
        </Card>
        <View style={{ height: 16 }} />
      </View>
    </ScrollView>
  );
}
