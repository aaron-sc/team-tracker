"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Forces a fresh server refetch of the current route whenever it mounts, bypassing any client-side route cache. */
export function RefreshOnMount() {
  const router = useRouter();

  useEffect(() => {
    router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
