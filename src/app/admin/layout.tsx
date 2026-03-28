"use client";

import Sidebar from "@/components/admin/Sidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Decide page title based on pathname
    let pageTitle = "Admin Dashboard";
    if (pathname.includes("/admin/events")) pageTitle = "Events Management";
    if (pathname.includes("/admin/hotels")) pageTitle = "Hotels & Accommodation";
    if (pathname.includes("/admin/coordinators")) pageTitle = "Coordinator Management";
    if (pathname.includes("/admin/team")) pageTitle = "Team Management";
    if (pathname.includes("/admin/settings")) pageTitle = "Settings";

    // Check if we are on login/signup pages where we don't want the sidebar/header
    const isAuthPage = pathname === "/admin/login" || pathname === "/admin/signup";

    if (isAuthPage) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-zinc-50/30 dark:bg-zinc-950/50 relative overflow-hidden">
            {/* Mesh Gradient Background */}
            <div className="absolute inset-0 bg-gradient-mesh opacity-[0.4] pointer-events-none" />

            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className={cn(
                "flex flex-col min-h-screen relative z-10 transition-all duration-300",
                isSidebarOpen ? "lg:pl-64" : "lg:pl-20"
            )}>
                <AdminHeader 
                    title={pageTitle} 
                    isSidebarOpen={isSidebarOpen} 
                    setIsSidebarOpen={setIsSidebarOpen} 
                />
                <main className="flex-1 p-4 md:p-10 relative">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
