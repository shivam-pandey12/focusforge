"use client";

import { createContext, createElement, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth, firebaseConfigError } from "@/lib/firebase/config";
import type { AuthState } from "@/types";

const AuthContext = createContext<AuthState | null>(null);

function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!firebaseAuth) {
      setState({
        user: null,
        loading: false,
        error: firebaseConfigError ?? "Firebase Authentication is unavailable."
      });
      return;
    }

    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      (user) => {
        setState({
          user: user
            ? {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL
              }
            : null,
          loading: false,
          error: null
        });
      },
      (error) => {
        setState({
          user: null,
          loading: false,
          error: error.message
        });
      }
    );

    return unsubscribe;
  }, []);

  return state;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const state = useAuthState();

  return createElement(AuthContext.Provider, { value: state }, children);
}

export function useAuth(): AuthState {
  const state = useContext(AuthContext);

  if (!state) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return state;
}
