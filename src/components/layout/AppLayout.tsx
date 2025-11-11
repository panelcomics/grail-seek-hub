import { ReactNode } from "react";
import { AppHeader } from "@/components/layout/AppHeader";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
