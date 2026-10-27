import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { api } from '../api';
import { Button, Card, Field, Header, Loading, Notice, styles } from '../components/UI';
import { colors } from '../theme';
import { addDays, formatDate, formatTime, todayStr, weekday } from '../utils';

// Booking in four steps: doctor, day, time slot, reason
export default function BookScreen({ onBooked }) {
  const [doctors, setDoctors] = useState(null);
  const [spec, setSpec] = useState('');
  const [doctor, setDoctor] = useState(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState(null);
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get('/doctors').then(setDoctors).catch((e) => setError(e.message)); }, []);

  const specs = doctors ? [...new Set(doctors.map((d) => d.specialization))].sort() : [];
  const shown = (doctors || []).filter((d) => !spec || d.specialization === spec);

  const days = [];
  for (let i = 0; days.length < 12; i++) { const d = addDays(todayStr(), i); if (weekday(d) !== 'Sun') days.push(d); }

  useEffect(() => {
    setTime('');
    if (!doctor || !date) { setSlots(null); return; }
    setSlots(null);
    api.get(`/doctors/${doctor.id}/slots?date=${date}`).then((d) => setSlots(d.slots)).catch((e) => setError(e.message));
  }, [doctor, date]);

  async function submit() {
    setError('');
    if (!doctor || !date || !time) return setError('Choose a doctor, a day and a time slot.');
    if (!reason.trim()) return setError('Tell the doctor briefly why you are visiting.');
    setBusy(true);
    try {
      const r = await api.post('/appointments', { doctorId: doctor.id, date, time, reason });
      setBusy(false);
      onBooked(r.id);
    } catch (e) {
      setError(e.message);
      setBusy(false);
      if (e.status === 409) { // the slot was taken meanwhile: refresh the grid
        api.get(`/doctors/${doctor.id}/slots?date=${date}`).then((d) => { setSlots(d.slots); setTime(''); }).catch(() => {});
      }
    }
  }

  const chip = (active) => ({
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1, marginRight: 8,
    borderColor: active ? colors.primary : colors.lineStrong, backgroundColor: active ? colors.primary : '#fff',
  });

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <Header title="Book an appointment" subtitle="The doctor confirms your request and you will be notified." />
      <View style={{ paddingHorizontal: 16 }}>
        <Notice text={error} />

        <Card>
          <Text style={styles.h2}>1. Choose a doctor</Text>
          {!doctors && <Loading />}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            {['', ...specs].map((s) => (
              <TouchableOpacity key={s || 'all'} onPress={() => setSpec(s)} style={chip(spec === s)}>
                <Text style={{ color: spec === s ? '#fff' : colors.muted, fontWeight: '600', fontSize: 13 }}>{s || 'All'}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {shown.map((d) => {
            const sel = doctor && doctor.id === d.id;
            return (
              <TouchableOpacity key={d.id} onPress={() => { setDoctor(d); setError(''); }} style={{ padding: 12, marginTop: 8, borderRadius: 10, borderWidth: 1.5, borderColor: sel ? colors.primary : colors.line, backgroundColor: sel ? '#f6fbfe' : '#fff' }}>
                <Text style={{ fontWeight: '700', fontSize: 16, color: colors.ink }}>{d.name}</Text>
                <Text style={{ color: colors.ink }}>{d.specialization}</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>{d.qualification} · {d.experience_years} yrs</Text>
                <Text style={{ color: colors.ink, fontSize: 13, marginTop: 2 }}>₹{d.consultation_fee} · {formatTime(d.available_from)} to {formatTime(d.available_to)}</Text>
              </TouchableOpacity>
            );
          })}
        </Card>

        <Card style={{ opacity: doctor ? 1 : 0.5 }}>
          <Text style={styles.h2}>2. Pick a day</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {days.map((d) => {
              const active = date === d;
              return (
                <TouchableOpacity key={d} disabled={!doctor} onPress={() => { setDate(d); setError(''); }}
                  style={{ width: 60, paddingVertical: 8, marginRight: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center', borderColor: active ? colors.primary : colors.lineStrong, backgroundColor: active ? colors.primary : '#fff' }}>
                  <Text style={{ fontSize: 12, color: active ? '#cfe6f4' : colors.muted }}>{weekday(d)}</Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: active ? '#fff' : colors.ink }}>{Number(d.slice(8))}</Text>
                  <Text style={{ fontSize: 12, color: active ? '#cfe6f4' : colors.muted }}>{formatDate(d).split(' ')[1]}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Card>

        <Card style={{ opacity: doctor && date ? 1 : 0.5 }}>
          <Text style={styles.h2}>3. Select a time</Text>
          {doctor && date && !slots && <Loading text="Loading free slots…" />}
          {slots && slots.length === 0 && <Text style={{ color: colors.muted }}>No slots are available on this day.</Text>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {(slots || []).map((s) => {
              const active = time === s.time;
              return (
                <TouchableOpacity key={s.time} disabled={!s.available} onPress={() => { setTime(s.time); setError(''); }}
                  style={{ width: '31%', marginRight: '2%', marginBottom: 8, paddingVertical: 9, borderRadius: 8, borderWidth: 1, alignItems: 'center',
                    borderColor: active ? colors.primary : colors.lineStrong, backgroundColor: active ? colors.primary : s.available ? '#fff' : '#f0f3f6' }}>
                  <Text style={{ fontWeight: '600', fontSize: 13, color: active ? '#fff' : s.available ? colors.ink : '#a2afb9', textDecorationLine: s.available ? 'none' : 'line-through' }}>{formatTime(s.time)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        <Card style={{ opacity: time ? 1 : 0.5 }}>
          <Text style={styles.h2}>4. Reason for the visit</Text>
          <Field value={reason} onChangeText={setReason} multiline maxLength={255} editable={Boolean(time)} placeholder="For example: fever for three days" style={{ marginTop: 0 }} />
          {doctor && date && time ? (
            <Text style={{ marginTop: 10, padding: 10, backgroundColor: colors.primaryTint, borderRadius: 8, color: colors.ink }}>
              {doctor.name} · {formatDate(date)} at {formatTime(time)} · ₹{doctor.consultation_fee}
            </Text>
          ) : null}
          <Button title={busy ? 'Booking…' : 'Request appointment'} onPress={submit} disabled={busy || !time} style={{ marginTop: 14 }} />
        </Card>
        <View style={{ height: 16 }} />
      </View>
    </ScrollView>
  );
}
