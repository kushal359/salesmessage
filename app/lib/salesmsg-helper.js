// lib/salesmsg.js
import { firebase } from "../config/firebase";


export async function getValidSalesmsgToken(uid) {
  const ref = firebase
    .collection('').doc(uid)
    .collection('integrations').doc('salesmsg');

  const snap = await ref.get();

  if (!snap.exists) {
    throw new Error('Salesmsg not connected');
  }

  const data = snap.data();
  const now = Date.now();


  if (now < data.expires_at - 2 * 60 * 1000) {
    return data.access_token;
  }


  const res = await fetch('https://api.salesmessage.com/pub/v2.2/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: process.env.SALESMSG_CLIENT_ID,
      client_secret: process.env.SALESMSG_CLIENT_SECRET,
      refresh_token: data.refresh_token,
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to refresh token');
  }

  const refreshed = await res.json();

  const newData = {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token || data.refresh_token,
    expires_at: Date.now() + refreshed.expires_in * 1000,
  };

  await ref.update(newData);

  return newData.access_token;
}