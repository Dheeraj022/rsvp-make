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
        <header className="h-16 border-b border-zinc-200 bg-white/50 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
            </div>

            <div className="flex items-center gap-3">
                <div className="w-px h-6 bg-transparent mx-1" />
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-zinc-500 hover:text-zinc-900 gap-2 h-9 rounded-full px-4 text-xs font-medium"
                >
                    <LogOut size={16} />
                    Sign Out
                </Button>
            </div>
        </header>
    );
}
