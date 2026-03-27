"use client";

import { LogOut, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AdminHeaderProps {
    title: string;
}

export default function AdminHeader({ title }: AdminHeaderProps) {
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/admin/login");
    };

    return (
        <header className="h-16 border-b border-zinc-200/50 dark:border-white/10 bg-white/30 dark:bg-black/20 backdrop-blur-xl sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between shadow-sm dark:shadow-none">
            <div className="flex items-center gap-4 overflow-hidden">
                <span className="text-[10px] md:text-sm font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] truncate">{title}</span>
            </div>

            <div className="flex items-center gap-2 md:gap-3 shrink-0">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-zinc-500 hover:text-red-600 dark:hover:text-red-400 gap-2 h-9 md:h-10 rounded-2xl px-3 md:px-5 text-[10px] md:text-xs font-bold transition-all hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                >
                    <LogOut size={16} />
                    <span className="hidden sm:inline">Sign Out</span>
                </Button>
            </div>
        </header>
    );
}
