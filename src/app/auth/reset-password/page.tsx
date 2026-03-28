"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, KeyRound, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Supabase will automatically handle the session if the user arrives via a reset link
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // If no session, it might be an invalid or expired link
                // For now we'll let them try, Supabase will error if unauthorized
            }
        };
        checkSession();
    }, []);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            setLoading(false);
            return;
        }

        try {
            const { error: resetError } = await supabase.auth.updateUser({
                password: password
            });

            if (resetError) throw resetError;

            setSuccess(true);
            setTimeout(() => {
                // Determine where to redirect based on user role or just to a generic login selection
                router.push("/");
            }, 3000);
        } catch (err: any) {
            setError(err.message || "Failed to update password. Link may be expired.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-zinc-100 p-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600">
                        <CheckCircle size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-zinc-900">Password Updated!</h1>
                    <p className="text-zinc-500">
                        Your password has been reset successfully. Redirecting you to login...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-zinc-100 p-8 space-y-6">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center mx-auto text-white mb-4">
                        <KeyRound size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-zinc-900">Set New Password</h1>
                    <p className="text-zinc-500 text-sm">
                        Please enter your new secure password below.
                    </p>
                </div>

                <form onSubmit={handleReset} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700">New Password</label>
                        <div className="relative">
                            <Input
                                required
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700">Confirm New Password</label>
                        <div className="relative">
                            <Input
                                required
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm font-medium border border-red-100 italic">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-zinc-900 text-white hover:bg-zinc-800 h-10 rounded-lg font-medium transition-all"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            "Reset Password"
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
