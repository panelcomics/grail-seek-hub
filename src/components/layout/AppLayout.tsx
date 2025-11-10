import { ReactNode } from "react";
import Navbar from "@/components/Navbar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
