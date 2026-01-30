"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function withAuth(Component: any) {
    return function ProtectedRoute(props: any) {
        const router = useRouter();
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            const checkAuth = async () => {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    router.replace("/admin/login");
                } else {
                    setLoading(false);
                }
            };
            checkAuth();
        }, [router]);

        if (loading) {
            return (
                <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-black">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                </div>
            );
        }

        return <Component {...props} />;
    };
}
