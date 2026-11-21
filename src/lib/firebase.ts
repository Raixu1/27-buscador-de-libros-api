import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/** En Vercel la clave se pega con \n literales; aquí se convierten a saltos de línea. */
export function normalizePrivateKey(raw: string): string {
  return raw.replace(/\\n/g, "\n");
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

function app(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  return initializeApp({
    credential: cert({
      projectId: required("FIREBASE_PROJECT_ID"),
      clientEmail: required("FIREBASE_CLIENT_EMAIL"),
      privateKey: normalizePrivateKey(required("FIREBASE_PRIVATE_KEY")),
    }),
  });
}

export const adminAuth = () => getAuth(app());
export const db = () => getFirestore(app());
export const webApiKey = () => required("FIREBASE_WEB_API_KEY");
