import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, indexedDBLocalPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { environment } from '../../environments/environment';

/* Same Firebase project as the website (shared Auth users + Firestore).
   The getApps() guard stops "already initialized" errors on dev live-reload. */
const alreadyInitialized = getApps().length > 0;

export const app = alreadyInitialized ? getApp() : initializeApp(environment.firebase);

/* Website used browserLocalPersistence. Inside the native webview, IndexedDB
   persistence is the reliable choice; localStorage is the fallback. */
export const auth = alreadyInitialized
  ? getAuth(app)
  : initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });

/* Full Firestore SDK (the website used Firestore Lite, which has no realtime).
   - ignoreUndefinedProperties: optional form fields (e.g. customer.lat) that are
     undefined would otherwise throw on write.
   - experimentalAutoDetectLongPolling: falls back to long-polling on networks
     that break WebChannel streaming (some mobile/proxy connections). */
export const db = alreadyInitialized
  ? getFirestore(app)
  : initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      experimentalAutoDetectLongPolling: true
    });
