"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Calendar,
    Hotel,
    Users,
    UserCog,
    Settings,
    Menu,
    X,
    MessageCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

const menuItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Events", href: "/admin/events", icon: Calendar },
    { name: "Hotels", href: "/admin/hotels", icon: Hotel },
    { name: "Coordinators", href: "/admin/coordinators", icon: UserCog },
    { name: "WhatsApp Status", href: "/admin/whatsapp-status", icon: MessageCircle },
    { name: "Team Management", href: "/admin/team", icon: Users, adminOnly: true },
    { name: "Settings", href: "/admin/settings", icon: Settings },
];

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
    const pathname = usePathname();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userName, setUserName] = useState("User");

    // Auto-close sidebar on mobile when pathname changes
    useEffect(() => {
        if (window.innerWidth < 1024) {
            setIsOpen(false);
        }
    }, [pathname, setIsOpen]);

    useEffect(() => {
        const fetchUserRole = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data } = await supabase
                    .from("users")
                    .select("role, full_name")
                    .eq("id", session.user.id)
                    .single();
                if (data) {
                    setUserRole(data.role);
                    setUserName(data.full_name || "User");
                }
            }
        };
        fetchUserRole();
    }, []);

    const filteredMenuItems = menuItems.filter(item => !item.adminOnly || userRole === 'admin');

    return (
        <>
            {/* Sidebar Overlay for Mobile */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
                        onClick={() => setIsOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 z-40 h-screen transition-all duration-500 bg-zinc-950 text-zinc-400 border-r border-white/5",
                    isOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full w-0 lg:translate-x-0 lg:w-20"
                )}
            >
                <div className="flex flex-col h-full bg-[#09090b] relative overflow-hidden">
                    {/* Subtle Side Glow */}
                    <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-blue-500/20 to-transparent" />

                    {/* Logo / Brand */}
                    <div className="px-6 py-10 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <Calendar size={20} />
                        </div>
                        {isOpen && (
                            <span className="font-bold text-white text-lg tracking-tight">
                                RSVP<span className="text-blue-500">ADMIN</span>
                            </span>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 space-y-2 mt-6">
                        {filteredMenuItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group relative",
                                        isActive
                                            ? "bg-blue-500/10 text-blue-400 font-semibold"
                                            : "hover:bg-white/5 hover:text-zinc-200"
                                    )}
                                >
                                    <Icon
                                        size={20}
                                        className={cn(
                                            "transition-all duration-300",
                                            isActive ? "text-blue-500 scale-110" : "group-hover:text-zinc-200"
                                        )}
                                    />
                                    {isOpen && <span className="text-sm tracking-wide">{item.name}</span>}

                                    {isActive && (
                                        <>
                                            <div className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
                                            {/* Glow behind icon */}
                                            <div className="absolute left-4 w-4 h-4 bg-blue-500/20 blur-xl pointer-events-none" />
                                        </>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Bottom section */}
                    <div className="p-4 border-t border-white/5">
                        {isOpen ? (
                            <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 border border-white/10 group-hover:border-white/20 transition-all shrink-0">
                                    <span className="font-black text-xs uppercase">{userName[0]}</span>
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-zinc-100 uppercase tracking-tighter truncate">{userName}</span>
                                    <span className="text-[10px] text-zinc-500 font-medium capitalize">{userRole || "User"}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-center">
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                                    <UserCog size={20} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
}
