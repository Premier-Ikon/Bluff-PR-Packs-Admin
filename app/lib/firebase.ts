"use client";

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function firebaseReady() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.apiKey !== "replace-me" &&
      firebaseConfig.projectId &&
      firebaseConfig.appId &&
      firebaseConfig.appId !== "replace-me"
  );
}

export function getFirebaseAuth() {
  if (!getApps().length) initializeApp(firebaseConfig);
  return getAuth(getApps()[0]);
}
