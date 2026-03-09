"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function CoordinatorLogin() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Coordinator dummy email logic: username@rsvp.com
            const email = `${username.toLowerCase()}@rsvp.com`;

            const { error: loginError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (loginError) throw loginError;

            // Verify if user is actually a coordinator and is active
            const { data: coordinator, error: coordError } = await supabase
                .from("coordinators")
                .select("id, is_active")
                .eq("username", username)
                .single();

            if (coordError || !coordinator) {
                await supabase.auth.signOut();
                throw new Error("Unauthorized access.");
            }

            if (coordinator.is_active === false) {
                await supabase.auth.signOut();
                throw new Error("Your account has been disabled. Please contact the administrator.");
            }

            router.push("/coordinator/dashboard");
        } catch (err: any) {
            setError(err.message || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black p-4">
            <div className="w-full max-w-sm space-y-8 bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <User className="text-blue-600 dark:text-blue-400" size={24} />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Coordinator Login
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Enter your username to access your dashboard.
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={loading}
                            required
                            className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 h-11"
                        />
                        <Input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            required
                            className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 h-11"
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-md">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-lg font-medium transition-all shadow-lg shadow-blue-500/10"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
