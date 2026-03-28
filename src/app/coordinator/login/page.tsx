"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, User, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function CoordinatorLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<"login" | "forgot">("login");
    const [resetEmail, setResetEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [resetStep, setResetStep] = useState<"email" | "otp">("email");
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

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: `${window.location.origin}/coordinator/reset-password`,
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
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    required
                                    className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 h-11 pr-10"
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
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-lg font-medium transition-all shadow-lg shadow-blue-500/10"
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
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-lg font-medium transition-all shadow-lg shadow-blue-500/10"
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
