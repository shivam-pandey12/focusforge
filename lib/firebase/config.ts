import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const firebaseConfigError =
  missingKeys.length > 0
    ? `Firebase is not configured. Missing: ${missingKeys.join(", ")}. Add these values to .env.local.`
    : null;

let app: FirebaseApp | null = null;

if (!firebaseConfigError) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export const firebaseApp = app;
export const firebaseAuth: Auth | null = app ? getAuth(app) : null;

function createFirestore(appInstance: FirebaseApp | null): Firestore | null {
  if (!appInstance) {
    return null;
  }

  if (typeof window === "undefined") {
    return getFirestore(appInstance);
  }

  try {
    return initializeFirestore(appInstance, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch {
    return getFirestore(appInstance);
  }
}

export const firestoreDb: Firestore | null = createFirestore(app);

export function ensureFirebaseAuth(): Auth {
  if (!firebaseAuth) {
    throw new Error(firebaseConfigError ?? "Firebase Authentication is unavailable.");
  }

  return firebaseAuth;
}

export function ensureFirestoreDb(): Firestore {
  if (!firestoreDb) {
    throw new Error(firebaseConfigError ?? "Firestore is unavailable.");
  }

  return firestoreDb;
}
