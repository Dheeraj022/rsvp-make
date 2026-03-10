"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function HotelSignup() {
    const [hotelName, setHotelName] = useState("");
    const [managerName, setManagerName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const router = useRouter();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        try {
            // 1. Sign up the user in Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("Signup failed");

            // 2. Call server-side API to insert hotel record (bypasses RLS)
            const res = await fetch("/api/hotel/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    hotelName,
                    managerName,
                    email,
                    userId: authData.user.id,
                }),
            });

            let data: any = {};
            try {
                data = await res.json();
            } catch {
                throw new Error("Server error. Please make sure the SUPABASE_SERVICE_ROLE_KEY is set in .env.local.");
            }
            if (!res.ok) throw new Error(data.error || "Failed to complete signup");

            setSuccessMessage("Signup successful! Please check your email to confirm your account.");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black p-4 text-zinc-900">
            <div className="w-full max-w-md space-y-8 bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Become a Partner
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400">
                        Create an account to manage your event guest lists.
                    </p>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Hotel Name</label>
                            <Input
                                placeholder="e.g. Grand Hyatt Goa"
                                value={hotelName}
                                onChange={(e) => setHotelName(e.target.value)}
                                disabled={loading}
                                required
                                className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 h-11"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Manager Name</label>
                            <Input
                                placeholder="Full Name"
                                value={managerName}
                                onChange={(e) => setManagerName(e.target.value)}
                                disabled={loading}
                                required
                                className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 h-11"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Email Address</label>
                            <Input
                                type="email"
                                placeholder="name@hotel.com"
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

                    <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-lg font-semibold transition-all text-lg mt-2"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Sign Up"}
                    </Button>

                    {error && (
                        <div className="text-sm text-red-500 text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-100 dark:border-red-900/30">
                            {error}
                        </div>
                    )}

                    {successMessage && (
                        <div className="text-sm text-green-600 text-center bg-green-50 dark:bg-green-900/20 p-3 rounded-md border border-green-100 dark:border-green-900/30">
                            {successMessage}
                        </div>
                    )}

                    <div className="text-center text-sm pt-2">
                        <Link href="/hotel/login" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                            Already have an account? <span className="text-blue-600 font-medium">Sign In</span>
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
