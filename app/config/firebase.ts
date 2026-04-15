import admin from 'firebase-admin'
import { ServiceAccount } from 'firebase-admin'

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(process.env.FIREBASE_SERVICE_ACCOUNT as ServiceAccount),
  })
}

export const firebase = admin.firestore()
