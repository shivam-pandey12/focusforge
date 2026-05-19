import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User
} from "firebase/auth";
import { ensureFirebaseAuth } from "@/lib/firebase/config";
import { createUserDocument } from "@/lib/firebase/firestore";

export function getFriendlyAuthError(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";

  switch (code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "The email or password is incorrect.";
    case "auth/email-already-in-use":
      return "An account already exists with this email.";
    case "auth/account-exists-with-different-credential":
      return "This email already uses a different sign-in method.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was closed before it finished.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in popup.";
    case "auth/weak-password":
      return "Use a stronger password with at least 6 characters.";
    case "auth/network-request-failed":
      return "Network connection failed. Please try again.";
    default:
      return error instanceof Error ? error.message : "Something went wrong. Please try again.";
  }
}

async function prepareAuth() {
  const auth = ensureFirebaseAuth();
  await setPersistence(auth, browserLocalPersistence);

  return auth;
}

export async function signUpWithEmail(email: string, password: string): Promise<User> {
  const auth = await prepareAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  await createUserDocument(credential.user);

  return credential.user;
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const auth = await prepareAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);

  return credential.user;
}

export async function signInWithGoogle(): Promise<User> {
  const auth = await prepareAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account"
  });

  const credential = await signInWithPopup(auth, provider);
  await createUserDocument(credential.user);

  return credential.user;
}

export async function logoutUser(): Promise<void> {
  const auth = ensureFirebaseAuth();
  await signOut(auth);
}
