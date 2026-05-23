/**
 * Route protection component.
 * Redirects unauthenticated users to the login page.
 * Full implementation in Task 3.
 */

"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, ReactNode } from "react";

interface AuthGuardProps {
  children: ReactNode;
  redirectPath?: string;
}

export default function AuthGuard({ children, redirectPath = "/" }: AuthGuardProps) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated" && pathname !== "/") {
      router.push(redirectPath);
    }
  }, [status, router, pathname, redirectPath]);

  if (status === "loading") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (status === "unauthenticated" && pathname !== "/") {
    return null;
  }

  return <>{children}</>;
}

