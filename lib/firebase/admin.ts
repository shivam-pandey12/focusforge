import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export class ServerSetupError extends Error {
  code = "server_setup_missing";

  constructor(message: string) {
    super(message);
    this.name = "ServerSetupError";
  }
}

let cachedApp: App | null = null;

function parseServiceAccount(): Record<string, string> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;

    if (typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }

    return parsed;
  } catch {
    return null;
  }
}

export function getFirebaseAdminSetupError(): string | null {
  const serviceAccount = parseServiceAccount();

  if (!serviceAccount) {
    return "Firebase Admin is not configured. Add FIREBASE_SERVICE_ACCOUNT_JSON to enable secure billing actions.";
  }

  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    return "Firebase Admin service account is incomplete. Check project_id, client_email, and private_key.";
  }

  return null;
}

export function getFirebaseAdminApp(): App {
  if (cachedApp) {
    return cachedApp;
  }

  const setupError = getFirebaseAdminSetupError();

  if (setupError) {
    throw new ServerSetupError(setupError);
  }

  cachedApp =
    getApps()[0] ??
    initializeApp({
      credential: cert(parseServiceAccount()!)
    });

  return cachedApp;
}

export function getAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export async function getAdminFirestore() {
  let firestoreModule: typeof import("firebase-admin/firestore");

  try {
    firestoreModule = await import("firebase-admin/firestore");
  } catch (error) {
    if (error instanceof Error && error.message.includes("@opentelemetry/api")) {
      throw new ServerSetupError(
        "Firebase Admin Firestore is missing @opentelemetry/api. Run npm.cmd install @opentelemetry/api to enable billing API routes."
      );
    }

    throw error;
  }

  const { FieldValue, getFirestore } = firestoreModule;

  return {
    db: getFirestore(getFirebaseAdminApp()),
    FieldValue
  };
}
