"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export default function withRoleAuth(Component: any, allowedRole: string) {
    return function ProtectedRoute(props: any) {
        const toast = useToast();
        const router = useRouter();
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            const checkAuth = async () => {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    router.replace("/admin/login");
                    return;
                }

                // Check real-time role from public.users
                const { data: userData, error } = await supabase
                    .from("users")
                    .select("role, status")
                    .eq("id", session.user.id)
                    .single();

                if (error || !userData) {
                    await supabase.auth.signOut();
                    router.replace("/admin/login");
                    return;
                }

                if (userData.status === 'inactive') {
                    toast.error("Your account has been disabled.");
                    await supabase.auth.signOut();
                    router.replace("/admin/login");
                    return;
                }

                if (userData.role !== allowedRole) {
                    toast.error(`Unauthorized access. Only ${allowedRole}s are allowed.`);
                    router.replace("/admin/dashboard");
                    return;
                }

                setLoading(false);
            };
            checkAuth();
        }, [router]);

        if (loading) {
            return (
                <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-zinc-400" />
                        <span className="text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest text-xs">Verifying access...</span>
                    </div>
                </div>
            );
        }

        return <Component {...props} />;
    };
}
