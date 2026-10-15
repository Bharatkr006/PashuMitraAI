import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";

// Read Firebase configuration from Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== "your_firebase_api_key" &&
  firebaseConfig.apiKey.length > 5
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
  } catch (err) {
    console.warn("Failed to initialize Firebase app:", err);
  }
}

export { auth, GoogleAuthProvider };

/**
 * Sign in or automatically register with email and password via Firebase Auth.
 * If user does not exist, it creates the user, then signs them in.
 */
export async function firebaseEmailAuth(
  email: string,
  password?: string
): Promise<{ user: FirebaseUser; isNewUser: boolean }> {
  if (!auth) {
    throw new Error(
      "Firebase is not configured. Please add your VITE_FIREBASE_API_KEY to your .env file."
    );
  }

  // Use provided password or generate a consistent secure fallback for the user
  const effectivePassword = password && password.length >= 6
    ? password
    : `PashuMitra@${email.trim().toLowerCase().replace(/[^a-z0-9]/g, "")}2026`;

  try {
    // Attempt sign in first
    const credential = await signInWithEmailAndPassword(auth, email.trim(), effectivePassword);
    return { user: credential.user, isNewUser: false };
  } catch (err: any) {
    // If user not found, create new account
    if (
      err.code === "auth/user-not-found" ||
      err.code === "auth/invalid-credential" ||
      err.code === "auth/invalid-login-credentials"
    ) {
      try {
        const newCredential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          effectivePassword
        );
        return { user: newCredential.user, isNewUser: true };
      } catch (createErr: any) {
        if (createErr.code === "auth/email-already-in-use") {
          throw new Error(
            "इस ईमेल से खाता पहले से मौजूद है। कृपया सही पासवर्ड दर्ज करें। (Account already exists. Please enter correct password.)"
          );
        }
        throw createErr;
      }
    }
    throw err;
  }
}

/**
 * Sign in with Google via Firebase popup
 */
export async function firebaseGoogleAuth(): Promise<{ user: FirebaseUser; isNewUser: boolean }> {
  if (!auth) {
    throw new Error(
      "Firebase is not configured. Please add your VITE_FIREBASE_API_KEY to your .env file."
    );
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  return { user: result.user, isNewUser: false };
}

/**
 * Sign out from Firebase
 */
export async function firebaseSignOut(): Promise<void> {
  if (auth) {
    await signOut(auth);
  }
}

/**
 * Listen to Firebase Auth state changes
 */
export function subscribeToFirebaseAuth(
  callback: (user: FirebaseUser | null) => void
): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}
