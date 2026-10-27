import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { api } from '../api';
import { Badge, Button, Card, Header, Loading, Notice, Row, styles } from '../components/UI';
import { colors } from '../theme';
import { formatDate, formatTime, formatStamp } from '../utils';

export default function AppointmentDetailScreen({ id, onBack, onChanged }) {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState({ kind: 'error', text: '' });

  const load = useCallback(async () => {
    try { setData(await api.get(`/appointments/${id}`)); } catch (e) { setMsg({ kind: 'error', text: e.message }); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  function cancel() {
    Alert.alert('Cancel appointment', 'Do you want to cancel this appointment?', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel appointment', style: 'destructive',
        onPress: async () => {
          try { await api.patch(`/appointments/${id}/status`, { status: 'cancelled' }); onChanged(); await load(); setMsg({ kind: 'success', text: 'Appointment cancelled.' }); }
          catch (e) { setMsg({ kind: 'error', text: e.message }); }
        },
      },
    ]);
  }

  if (!data) return (<View style={{ flex: 1 }}><Header title="Appointment" onBack={onBack} /><Notice kind={msg.kind} text={msg.text} />{!msg.text && <Loading />}</View>);

  const { appointment: a, consultation, prescription } = data;
  return (
    <ScrollView>
      <Header title={a.doctor_name} subtitle={a.specialization} onBack={onBack} />
      <View style={{ paddingHorizontal: 16 }}>
        <Notice kind={msg.kind} text={msg.text} />
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.h2}>Visit details</Text>
            <Badge status={a.status} />
          </View>
          <Row label="Date and time" value={`${formatDate(a.appointment_date)} at ${formatTime(a.start_time)}`} />
          <Row label="Reason for visit" value={a.reason} />
          <Row label="Booked on" value={formatStamp(a.created_at)} />
          {a.status === 'cancelled' && <Row label="Cancelled by" value={a.cancelled_by} />}
          {['pending', 'confirmed'].includes(a.status) && <Button title="Cancel appointment" kind="danger" onPress={cancel} style={{ marginTop: 14 }} />}
        </Card>

        <Card>
          <Text style={styles.h2}>Consultation record</Text>
          {consultation ? (
            <>
              <Row label="Symptoms" value={consultation.symptoms} />
              <Row label="Diagnosis" value={consultation.diagnosis} />
              <Row label="Advice and notes" value={consultation.notes} />
              <Row label="Follow-up" value={consultation.follow_up_date ? formatDate(consultation.follow_up_date) : 'Not required'} />
            </>
          ) : (
            <Text style={{ color: colors.muted }}>{a.status === 'cancelled' ? 'This appointment was cancelled.' : 'The doctor will add the consultation record after the visit.'}</Text>
          )}
        </Card>

        <Card>
          <Text style={styles.h2}>Prescription</Text>
          {prescription ? prescription.items.map((i) => (
            <View key={i.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
              <Text style={{ fontWeight: '700', color: colors.ink }}>{i.medicine}</Text>
              <Text style={{ color: colors.muted }}>{i.dosage} · {i.frequency} · {i.duration_days} days</Text>
              {i.instructions ? <Text style={{ color: colors.muted, fontSize: 13 }}>{i.instructions}</Text> : null}
            </View>
          )) : <Text style={{ color: colors.muted }}>No prescription for this visit.</Text>}
        </Card>
        <View style={{ height: 16 }} />
      </View>
    </ScrollView>
  );
}
