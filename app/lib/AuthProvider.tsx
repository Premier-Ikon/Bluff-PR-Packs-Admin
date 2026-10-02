"use client";

import { User, onAuthStateChanged, signInWithCustomToken, signOut } from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { requestAdminCode, verifyAdminCode } from "./api";
import { firebaseReady, getFirebaseAuth } from "./firebase";

type AuthState = {
  loading: boolean;
  ready: boolean;
  user: User | null;
  token: string;
  requestCode: (email: string) => Promise<string>;
  verifyCode: (email: string, code: string) => Promise<void>;
  logOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const ready = firebaseReady();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!ready) {
      setLoading(false);
      return;
    }
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, async (current) => {
      setUser(current);
      setToken(current ? await current.getIdToken() : "");
      setLoading(false);
    });
  }, [ready]);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      ready,
      user,
      token,
      async requestCode(email) {
        const payload = await requestAdminCode(email);
        return payload.message || "If that email is on the team list, a sign-in code is on the way.";
      },
      async verifyCode(email, code) {
        const payload = await verifyAdminCode(email, code);
        const auth = getFirebaseAuth();
        await signInWithCustomToken(auth, payload.token);
      },
      async logOut() {
        await signOut(getFirebaseAuth());
      },
    }),
    [loading, ready, user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
