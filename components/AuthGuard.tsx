"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useDeferredDataStart } from "@/hooks/useDeferredDataStart";
import { useUserProfile } from "@/hooks/useUserProfile";
import LoadingState from "@/components/LoadingState";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, error } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const shouldStartProfileCheck = useDeferredDataStart(180);
  const onboardingExempt =
    pathname === "/onboarding" ||
    pathname === "/settings" ||
    pathname === "/login" ||
    pathname === "/signup";
  const profile = useUserProfile(shouldStartProfileCheck && !onboardingExempt ? user?.uid : undefined);

  useEffect(() => {
    if (!loading && !user && !error) {
      router.replace("/login");
    }
  }, [error, loading, router, user]);

  useEffect(() => {
    if (
      !user ||
      loading ||
      onboardingExempt ||
      !shouldStartProfileCheck ||
      !profile.ready ||
      profile.loading ||
      profile.error
    ) {
      return;
    }

    if (!profile.profile?.onboardingCompleted) {
      router.replace("/onboarding");
    }
  }, [
    loading,
    onboardingExempt,
    profile.error,
    profile.loading,
    profile.profile,
    profile.ready,
    router,
    shouldStartProfileCheck,
    user
  ]);

  if (loading) {
    return <LoadingState label="Checking your session" />;
  }

  if (error) {
    return (
      <main className="page-shell">
        <div className="error-box">{error}</div>
      </main>
    );
  }

  if (!user) {
    return <LoadingState label="Redirecting to login" />;
  }

  return <>{children}</>;
}
