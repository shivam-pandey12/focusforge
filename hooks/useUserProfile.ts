"use client";

import { useCallback, useEffect, useState } from "react";
import { getClientCache, hasClientCache, setClientCache } from "@/lib/clientCache";
import {
  getFirestoreErrorMessage,
  fetchUserProfile,
  subscribeToUserProfile,
  upsertUserProfile,
  type UserProfileInput
} from "@/lib/firebase/firestore";
import type { UserProfile } from "@/types";

interface UseUserProfileResult {
  profile: UserProfile | null;
  loading: boolean;
  ready: boolean;
  error: string | null;
  saveProfile: (input: UserProfileInput) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export function useUserProfile(userId?: string | null): UseUserProfileResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      setReady(false);
      return;
    }

    const cacheKey = `userProfile:${userId}`;
    setError(null);

    if (hasClientCache(cacheKey)) {
      setProfile(getClientCache<UserProfile | null>(cacheKey));
      setLoading(false);
      setReady(true);
    } else {
      setLoading(true);
      setReady(false);
    }

    try {
      return subscribeToUserProfile(
        userId,
        (nextProfile) => {
          setClientCache(cacheKey, nextProfile);
          setProfile(nextProfile);
          setLoading(false);
          setReady(true);
          setError(null);
        },
        (message) => {
          setError(message);
          setLoading(false);
          setReady(true);
        }
      );
    } catch (currentError) {
      setError(getFirestoreErrorMessage(currentError));
      setLoading(false);
      setReady(true);
    }
  }, [userId]);

  const saveProfile = useCallback(
    async (input: UserProfileInput) => {
      if (!userId) {
        throw new Error("Login is required before saving settings.");
      }

      const savedProfile = await upsertUserProfile(userId, input);
      setClientCache(`userProfile:${userId}`, savedProfile);
      setProfile(savedProfile);
      setReady(true);
    },
    [userId]
  );

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      return;
    }

    const nextProfile = await fetchUserProfile(userId);
    setClientCache(`userProfile:${userId}`, nextProfile);
    setProfile(nextProfile);
    setReady(true);
  }, [userId]);

  return { profile, loading, ready, error, saveProfile, refreshProfile };
}
