import admin from 'firebase-admin'
import serviceAccount from '@/firebase_config.json'

import { ServiceAccount } from 'firebase-admin'

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as ServiceAccount),
  })
}

export const firebase = admin.firestore()
