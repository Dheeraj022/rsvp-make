"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export default function withAuth(Component: any, options: { loginPath?: string, requiredRole?: string } = {}) {
    const { loginPath = "/admin/login", requiredRole } = options;

    return function ProtectedRoute(props: any) {
        const toast = useToast();
        const router = useRouter();
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            const checkAuth = async () => {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    router.replace(loginPath);
                    return;
                }

                // Check user status and role from public.users table for real-time enforcement
                const { data: userData, error } = await supabase
                    .from("users")
                    .select("status, role")
                    .eq("id", session.user.id)
                    .single();

                if (error || !userData || userData.status === 'inactive' || (requiredRole && userData.role !== requiredRole)) {
                    if (userData?.status === 'inactive') {
                        toast.error("Your account has been disabled. Please contact the administrator.");
                    }
                    await supabase.auth.signOut();
                    router.replace(loginPath);
                    return;
                }

                setLoading(false);
            };
            checkAuth();
        }, [router]);

        if (loading) {
            return (
                <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                </div>
            );
        }

        return <Component {...props} />;
    };
}
