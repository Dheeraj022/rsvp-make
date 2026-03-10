"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function AdminSignup() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [adminCode, setAdminCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        // Validate Admin Code
        if (adminCode !== "SHAADI2025") {
            setError("Invalid Admin Code. Please enter the correct code to create an account.");
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        role: 'admin'
                    }
                }
            });

            if (error) throw error;

            if (data.session) {
                router.push("/admin/dashboard");
            } else {
                setMessage("Account created! Please check your email to confirm your account.");
            }
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
                        Create Admin Account
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Setup your admin credentials.
                    </p>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-4">
                        <Input
                            type="text"
                            placeholder="Full Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={loading}
                            required
                        />
                        <Input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            required
                        />
                        <Input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            required
                        />
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Admin Code</label>
                            <Input
                                type="text"
                                placeholder="Enter admin code"
                                value={adminCode}
                                onChange={(e) => setAdminCode(e.target.value)}
                                disabled={loading}
                                required
                                className="border-blue-100 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-md">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="text-sm text-green-600 text-center bg-green-50 dark:bg-green-900/20 p-2 rounded-md">
                            {message}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign Up"}
                    </Button>

                    <div className="text-center text-sm">
                        <Link href="/admin/login" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline">
                            Already have an account? Sign In
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
