// Supabase Edge Function (Deno). Run every 5 minutes by pg_cron (see docs/supabase-setup.md).
// Finds shared doses more than 60 minutes late and sends one push alert per dose to the patient's
// caregiver through the Expo push service. The alert text contains no medicine name.
import { createClient } from 'npm:@supabase/supabase-js@2';

type Row = { patient_id: string; dose_key: string; caregiver_id: string; patient_name: string; tokens: string[] };

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('unauthorized', { status: 401 });
  }
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data, error } = await supabase.rpc('overdue_doses_to_alert');
  if (error) return new Response(error.message, { status: 500 });
  const rows = (data ?? []) as Row[];

  const messages = rows.flatMap((r) =>
    r.tokens.map((to) => ({
      to,
      title: 'Tickdo',
      body: `${r.patient_name || 'Your family member'}: a dose is more than 60 minutes late`,
      sound: 'default',
      priority: 'high',
      channelId: 'caregiver',
      data: { kind: 'caregiver-overdue', patientId: r.patient_id },
    })),
  );

  for (let i = 0; i < messages.length; i += 100) {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(messages.slice(i, i + 100)),
    });
    if (!res.ok) return new Response(`push failed: ${res.status}`, { status: 502 });
  }

  // Mark as alerted so each late dose produces exactly one alert.
  for (const r of rows) {
    await supabase
      .from('shared_doses')
      .update({ overdue_alerted_at: new Date().toISOString() })
      .eq('patient_id', r.patient_id)
      .eq('dose_key', r.dose_key);
  }
  return Response.json({ alerted: rows.length, messages: messages.length });
});
