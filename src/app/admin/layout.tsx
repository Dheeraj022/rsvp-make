"use client";

import Sidebar from "@/components/admin/Sidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { usePathname } from "next/navigation";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    // Decide page title based on pathname
    let pageTitle = "Admin Dashboard";
    if (pathname.includes("/admin/events")) pageTitle = "Events Management";
    if (pathname.includes("/admin/hotels")) pageTitle = "Hotels & Accommodation";
    if (pathname.includes("/admin/coordinators")) pageTitle = "Coordinator Management";
    if (pathname.includes("/admin/settings")) pageTitle = "Settings";

    // Check if we are on login/signup pages where we don't want the sidebar/header
    const isAuthPage = pathname === "/admin/login" || pathname === "/admin/signup";

    if (isAuthPage) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-zinc-50/50">
            <Sidebar />
            <div className="lg:pl-64 flex flex-col min-h-screen transition-all duration-300">
                <AdminHeader title={pageTitle} />
                <main className="flex-1 p-6 relative">
                    {children}
                </main>
            </div>
        </div>
    );
}
