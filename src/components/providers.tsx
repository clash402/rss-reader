"use client";

import { ReaderStoreProvider } from "@/lib/reader-store";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ReaderStoreProvider>{children}</ReaderStoreProvider>;
}
