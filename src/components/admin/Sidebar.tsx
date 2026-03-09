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
} from "lucide-react";
import { useState } from "react";

const menuItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Events", href: "/admin/events", icon: Calendar },
    { name: "Hotels", href: "/admin/hotels", icon: Hotel },
    { name: "Coordinators", href: "/admin/coordinators", icon: UserCog },
    { name: "Settings", href: "/admin/settings", icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(true);

    return (
        <>
            {/* Mobile Toggle */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden fixed bottom-4 right-4 z-50 p-3 rounded-full bg-black text-white shadow-lg"
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 z-40 h-screen transition-transform bg-zinc-950 text-zinc-400 border-r border-zinc-800",
                    isOpen ? "translate-x-0 w-64" : "-translate-x-full w-0 lg:translate-x-0 lg:w-20"
                )}
            >
                <div className="flex flex-col h-full bg-gradient-to-b from-zinc-900 via-zinc-950 to-black">
                    {/* Logo / Brand */}
                    <div className="px-6 py-8 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                            R
                        </div>
                        {isOpen && (
                            <span className="font-bold text-white text-lg tracking-tight">
                                RSVP Admin
                            </span>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 space-y-1.5 mt-4">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                                        isActive
                                            ? "bg-blue-600/10 text-blue-400 font-medium"
                                            : "hover:bg-zinc-800/50 hover:text-zinc-200"
                                    )}
                                >
                                    <Icon
                                        size={20}
                                        className={cn(
                                            "transition-colors",
                                            isActive ? "text-blue-500" : "group-hover:text-zinc-200"
                                        )}
                                    />
                                    {isOpen && <span className="text-sm">{item.name}</span>}

                                    {isActive && (
                                        <div className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full" />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Bottom section */}
                    <div className="p-4 border-t border-zinc-800/50">
                        {isOpen ? (
                            <div className="bg-zinc-900/50 rounded-2xl p-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 border border-zinc-700">
                                    <UserCog size={20} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold text-zinc-200">Admin</span>
                                    <span className="text-[10px] text-zinc-500">Premium User</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-center">
                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
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
