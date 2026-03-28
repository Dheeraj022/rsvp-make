"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useEffect } from "react";

export default function AdminLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<"login" | "forgot">("login");
    const [resetEmail, setResetEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [resetStep, setResetStep] = useState<"email" | "otp">("email");
    const router = useRouter();

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.replace("/admin/dashboard");
            }
        };
        checkSession();
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                throw error;
            }

            router.push("/admin/dashboard");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
            });
            if (error) throw error;
            setResetStep("otp");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.verifyOtp({
                email: resetEmail,
                token: otp,
                type: 'recovery',
            });
            if (error) throw error;
            router.push("/auth/reset-password");
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
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                        {mode === "login" ? "Admin Login" : "Reset Password"}
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {mode === "login"
                            ? "Enter your credentials to access the dashboard."
                            : "Enter your email to receive a 6-digit code."}
                    </p>
                </div>

                {mode === "login" ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                required
                                className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus:ring-blue-500"
                            />
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    required
                                    className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus:ring-blue-500 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
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
                            className="w-full bg-black hover:bg-zinc-800 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200 h-10 rounded-lg font-medium transition-all"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
                        </Button>

                        <div className="text-center space-y-4 pt-2">
                            <Link href="/admin/signup" className="block text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4 transition-colors">
                                First time here? Create an Account
                            </Link>
                            
                            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                <Link 
                                    href="/" 
                                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all group"
                                >
                                    <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
                                    Back to Website
                                </Link>
                            </div>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        {resetStep === "email" ? (
                            <form onSubmit={handleSendOTP} className="space-y-4">
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
                                    className="w-full bg-black hover:bg-zinc-800 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200 h-10 rounded-lg font-medium transition-all"
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Send OTP Code"}
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOTP} className="space-y-4">
                                <div className="space-y-2">
                                    <p className="text-xs text-center text-zinc-500 dark:text-zinc-400">
                                        We sent a verification code to <span className="font-semibold text-zinc-900 dark:text-zinc-100">{resetEmail}</span>
                                    </p>
                                    <Input
                                        type="text"
                                        placeholder="Enter code"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        disabled={loading}
                                        required
                                        maxLength={8}
                                        className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 h-11 text-center font-bold text-lg tracking-widest"
                                    />
                                </div>

                                {error && (
                                    <div className="text-sm text-red-500 text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-md">
                                        {error}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full bg-black hover:bg-zinc-800 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200 h-10 rounded-lg font-medium transition-all"
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify OTP"}
                                </Button>
                                
                                <button
                                    type="button"
                                    onClick={() => setResetStep("email")}
                                    className="w-full text-xs text-blue-600 hover:underline font-medium py-1"
                                >
                                    Change Email
                                </button>
                            </form>
                        )}

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => { setMode("login"); setError(null); setResetStep("email"); }}
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
