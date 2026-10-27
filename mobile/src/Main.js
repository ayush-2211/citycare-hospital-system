import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, BackHandler, Alert, Platform, StatusBar } from 'react-native';
import { api } from './api';
import { colors } from './theme';
import HomeScreen from './screens/HomeScreen';
import BookScreen from './screens/BookScreen';
import AppointmentsScreen from './screens/AppointmentsScreen';
import AppointmentDetailScreen from './screens/AppointmentDetailScreen';
import PrescriptionsScreen from './screens/PrescriptionsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ProfileScreen from './screens/ProfileScreen';

const TABS = [
  { id: 'home', label: 'Home', icon: '\u{1F3E0}' },
  { id: 'book', label: 'Book', icon: '\u2795' },
  { id: 'appointments', label: 'Visits', icon: '\u{1F4C5}' },
  { id: 'prescriptions', label: 'Rx', icon: '\u{1F48A}' },
  { id: 'profile', label: 'Profile', icon: '\u{1F464}' },
];

// A small stack navigator written by hand: `tab` is the current bottom tab, `stack` holds the screens opened on top of it.
export default function Main() {
  const [tab, setTab] = useState('home');
  const [stack, setStack] = useState([]); // e.g. [{ name: 'appointment', id: 4 }, { name: 'notifications' }]
  const [unread, setUnread] = useState(0);
  const [version, setVersion] = useState(0); // bump to make the visible lists reload
  const lastUnread = useRef(null);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const push = (screen) => setStack((s) => [...s, screen]);
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const openAppointment = (id) => push({ name: 'appointment', id });

  // Android hardware back button: close the top screen, or go back to the Home tab
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 0) { pop(); return true; }
      if (tab !== 'home') { setTab('home'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [stack, tab, pop]);

  // Notifications: poll the unread count every 30 seconds and alert the patient when something new arrives
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const { count } = await api.get('/notifications/unread-count');
        if (!alive) return;
        if (lastUnread.current !== null && count > lastUnread.current) {
          const latest = (await api.get('/notifications'))[0];
          if (latest) Alert.alert(latest.title, latest.message);
          refresh();
        }
        lastUnread.current = count;
        setUnread(count);
      } catch (e) { /* offline: try again on the next tick */ }
    };
    check();
    const timer = setInterval(check, 30000);
    return () => { alive = false; clearInterval(timer); };
  }, [refresh]);

  const top = stack[stack.length - 1];
  const afterBooking = (id) => { setTab('appointments'); refresh(); openAppointment(id); };

  let content;
  if (top && top.name === 'appointment') {
    content = <AppointmentDetailScreen key={top.id} id={top.id} onBack={pop} onChanged={refresh} />;
  } else if (top && top.name === 'notifications') {
    content = <NotificationsScreen onBack={pop} openAppointment={openAppointment}
      onChanged={() => { refresh(); api.get('/notifications/unread-count').then((d) => { lastUnread.current = d.count; setUnread(d.count); }).catch(() => {}); }} />;
  } else if (tab === 'home') {
    content = <HomeScreen go={setTab} openAppointment={openAppointment} refreshKey={version} />;
  } else if (tab === 'book') {
    content = <BookScreen onBooked={afterBooking} />;
  } else if (tab === 'appointments') {
    content = <AppointmentsScreen openAppointment={openAppointment} refreshKey={version} />;
  } else if (tab === 'prescriptions') {
    content = <PrescriptionsScreen openAppointment={openAppointment} />;
  } else {
    content = <ProfileScreen />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44 }}>
      {/* top bar with the notification bell */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700', marginTop: -2 }}>+</Text>
          </View>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>CityCare Hospital</Text>
        </View>
        <TouchableOpacity onPress={() => push({ name: 'notifications' })} accessibilityLabel={`Notifications, ${unread} unread`} style={{ padding: 6 }}>
          <Text style={{ fontSize: 22 }}>{'\u{1F514}'}</Text>
          {unread > 0 && (
            <View style={{ position: 'absolute', top: 0, right: 0, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>{content}</View>

      {/* bottom tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.line, paddingBottom: Platform.OS === 'ios' ? 18 : 4 }}>
        {TABS.map((t) => {
          const active = !top && tab === t.id;
          return (
            <TouchableOpacity key={t.id} onPress={() => { setStack([]); setTab(t.id); }} style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }} accessibilityLabel={t.label}>
              <Text style={{ fontSize: 20, opacity: active ? 1 : 0.55 }}>{t.icon}</Text>
              <Text style={{ fontSize: 11, marginTop: 2, fontWeight: active ? '700' : '500', color: active ? colors.primary : colors.muted }}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
