"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function CoordinatorSignup() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSignup = async (e: React.FormEvent) => {
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
            // 1. Create the auth user in Supabase
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("Signup failed");

            // 2. Call server-side API to insert coordinator record (bypasses RLS)
            const res = await fetch("/api/coordinator/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    email,
                    userId: authData.user.id,
                }),
            });

            let data: any = {};
            try {
                data = await res.json();
            } catch {
                throw new Error("Server error. Please make sure the SUPABASE_SERVICE_ROLE_KEY is set in .env.local and restart the dev server.");
            }
            if (!res.ok) throw new Error(data.error || "Failed to complete signup");

            setSuccessMessage("Account created! Your account is pending admin activation. You'll be able to log in once it's approved.");
        } catch (err: any) {
            setError(err.message || "Signup failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black p-4 text-zinc-900 dark:text-zinc-50">
            <div className="w-full max-w-md space-y-8 bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <UserPlus className="text-blue-600 dark:text-blue-400" size={24} />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Create Coordinator Account
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Sign up to access the coordinator portal. Your account will be activated by an admin.
                    </p>
                </div>

                {successMessage ? (
                    <div className="text-sm text-green-600 text-center bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-900/30 space-y-3">
                        <p>{successMessage}</p>
                        <Link
                            href="/coordinator/login"
                            className="inline-block text-blue-600 font-semibold hover:underline"
                        >
                            Go to Login →
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Full Name</label>
                                <Input
                                    placeholder="Your full name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={loading}
                                    required
                                    className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 h-11"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Email Address</label>
                                <Input
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                    required
                                    className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 h-11"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Password</label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    required
                                    className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 h-11"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Confirm Password</label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={loading}
                                    required
                                    className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 h-11"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-sm text-red-500 text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-100 dark:border-red-900/30">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-lg font-semibold transition-all shadow-lg shadow-blue-500/10"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Account"}
                        </Button>

                        <div className="text-center text-sm pt-1">
                            <Link href="/coordinator/login" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                                Already have an account?{" "}
                                <span className="text-blue-600 font-medium">Sign In</span>
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
