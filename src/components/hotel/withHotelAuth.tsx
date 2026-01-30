"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function withHotelAuth(WrappedComponent: any) {
    return function ProtectedRoute(props: any) {
        const router = useRouter();
        const [loading, setLoading] = useState(true);
        const [authenticated, setAuthenticated] = useState(false);

        useEffect(() => {
            const checkAuth = async () => {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    router.push("/hotel/login");
                } else {
                    setAuthenticated(true);
                }
                setLoading(false);
            };

            checkAuth();
        }, [router]);

        if (loading) {
            return (
                <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-blue-600"></div>
                </div>
            );
        }

        if (!authenticated) {
            return null;
        }

        return <WrappedComponent {...props} />;
    };
}
