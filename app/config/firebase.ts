import admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

  admin.initializeApp({
    credential: admin.credential.cert({
      ...serviceAccount,
      // Fixes the most common 'Invalid PEM' error on Vercel
      privateKey: serviceAccount.private_key?.replace(/\\n/g, '\n'),
    }),
  });
}

export const firebase = admin.firestore();