import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { api } from '../api';
import { Button, Header, Loading, Notice } from '../components/UI';
import { colors } from '../theme';
import { formatStamp } from '../utils';

export default function NotificationsScreen({ onBack, openAppointment, onChanged }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setList(await api.get('/notifications')); setError(''); } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const unread = (list || []).filter((n) => !n.is_read).length;

  async function open(n) {
    try {
      if (!n.is_read) { await api.patch(`/notifications/${n.id}/read`); onChanged(); }
      if (n.appointment_id) openAppointment(n.appointment_id); else await load();
    } catch (e) { setError(e.message); }
  }
  async function readAll() {
    try { await api.post('/notifications/read-all'); onChanged(); await load(); } catch (e) { setError(e.message); }
  }

  return (
    <View style={{ flex: 1 }}>
      <Header title="Notifications" subtitle={unread ? `${unread} unread` : 'You are all caught up.'} onBack={onBack}
        right={unread ? <Button title="Mark all read" kind="secondary" small onPress={readAll} /> : null} />
      <View style={{ paddingHorizontal: 16 }}><Notice text={error} /></View>
      {!list && !error ? <Loading /> : (
        <FlatList
          data={list || []}
          keyExtractor={(n) => String(n.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          ListEmptyComponent={<Text style={{ color: colors.muted, textAlign: 'center', marginTop: 30, paddingHorizontal: 24 }}>No notifications yet. Appointment updates and new prescriptions will appear here.</Text>}
          renderItem={({ item: n }) => (
            <TouchableOpacity onPress={() => open(n)} style={{ flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: n.is_read ? '#fff' : '#f4f9fd' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: n.is_read ? '600' : '700', color: colors.ink, fontSize: 15 }}>{n.title}</Text>
                <Text style={{ color: colors.ink, marginTop: 2 }}>{n.message}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{formatStamp(n.created_at)}</Text>
              </View>
              {!n.is_read && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 6, marginLeft: 8 }} />}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
