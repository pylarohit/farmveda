import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "./_components/app-sidebar";
import Navbar from "./_components/Navbar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <Navbar />
        {children}
      </main>
      <Toaster />
    </SidebarProvider>
  );
}
