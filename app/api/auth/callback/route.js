// app/api/auth/callback/route.js
import { firebase } from '../../../config/firebase';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

   const uid = "1493";

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  const res = await fetch('https://api.salesmessage.com/pub/v2.2/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: process.env.SALESMSG_CLIENT_ID,
      client_secret: process.env.SALESMSG_CLIENT_SECRET,
      code,
      redirect_uri: process.env.SALESMSG_REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: await res.text() }, { status: 500 });
  }

  const data = await res.json();

  if (!data.access_token || !data.expires_in) {
    return NextResponse.json({ error: 'Invalid token response' }, { status: 500 });
  }

  const expiresAt = Date.now() + data.expires_in * 1000;

  await firebase
    .collection('users').doc(uid)
    .collection('integrations').doc('salesmsg')
    .set({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAt,
    });

  return NextResponse.redirect(new URL('/', req.url));
}