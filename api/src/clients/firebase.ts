import * as firebase from 'firebase-admin';
import { env } from '@trail-status-app/utilities';

firebase.initializeApp({
  credential: firebase.credential.cert({
    projectId: env('FIREBASE_PROJECT_ID'),
    clientEmail: env('FIREBASE_CLIENT_EMAIL'),
    privateKey: env('FIREBASE_PRIVATE_KEY'),
  }),
});

export default firebase;
