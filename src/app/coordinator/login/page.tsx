"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function CoordinatorLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<"login" | "forgot">("login");
    const [resetEmail, setResetEmail] = useState("");
    const [resetSent, setResetSent] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({ email, password });

            if (loginError) throw loginError;
            if (!user) throw new Error("Login failed");

            const { data: coordinator, error: coordError } = await supabase
                .from("coordinators")
                .select("id, is_active")
                .eq("user_id", user.id)
                .single();

            if (coordError || !coordinator) {
                await supabase.auth.signOut();
                throw new Error("Unauthorized access.");
            }

            if (coordinator.is_active === false) {
                await supabase.auth.signOut();
                throw new Error("Your account is pending activation. Please contact the administrator.");
            }

            router.push("/coordinator/dashboard");
        } catch (err: any) {
            setError(err.message || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: `${window.location.origin}/coordinator/reset-password`,
            });
            if (error) throw error;
            setResetSent(true);
        } catch (err: any) {
            setError(err.message);
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
                        {mode === "login" ? "Coordinator Login" : "Reset Password"}
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {mode === "login"
                            ? "Enter your credentials to access your dashboard."
                            : "Enter your email to receive a reset link."}
                    </p>
                </div>

                {mode === "login" ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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
                            <div className="text-right">
                                <button
                                    type="button"
                                    onClick={() => { setMode("forgot"); setError(null); }}
                                    className="text-xs text-blue-600 hover:underline font-medium"
                                >
                                    Forgot Password?
                                </button>
                            </div>
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

                        <div className="text-center text-sm pt-1">
                            <Link href="/coordinator/signup" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                                Don&apos;t have an account?{" "}
                                <span className="text-blue-600 font-medium">Create Account</span>
                            </Link>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        {resetSent ? (
                            <div className="text-sm text-green-600 text-center bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-900/30">
                                ✅ Password reset link sent! Please check your email inbox.
                            </div>
                        ) : (
                            <form onSubmit={handleForgotPassword} className="space-y-4">
                                <Input
                                    type="email"
                                    placeholder="Your email address"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    disabled={loading}
                                    required
                                    className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 h-11"
                                />

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
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Send Reset Link"}
                                </Button>
                            </form>
                        )}

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => { setMode("login"); setError(null); setResetSent(false); }}
                                className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                            >
                                ← Back to Sign In
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
