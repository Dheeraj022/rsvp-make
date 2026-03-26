"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import withAuth from "@/components/auth/withAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Settings,
    Lock,
    UserCog,
    Loader2,
    Check,
    X,
    Shield,
    Users,
    Power
} from "lucide-react";
import { cn } from "@/lib/utils";

type Coordinator = {
    id: string;
    name: string;
    username: string;
    is_active: boolean;
};

function SettingsPage() {
    const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingPassword, setUpdatingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchCoordinators();
    }, []);

    const fetchCoordinators = async () => {
        try {
            const { data, error } = await supabase
                .from("coordinators")
                .select("id, name, username, is_active")
                .order("name", { ascending: true });

            if (error) throw error;
            setCoordinators(data || []);
        } catch (error: any) {
            console.error("Error fetching coordinators:", error.message || error);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: "Passwords do not match." });
            return;
        }

        setUpdatingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;
            setPasswordMessage({ type: 'success', text: "Password updated successfully!" });
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            setPasswordMessage({ type: 'error', text: error.message });
        } finally {
            setUpdatingPassword(false);
        }
    };

    const toggleCoordinatorStatus = async (coordId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from("coordinators")
                .update({ is_active: !currentStatus })
                .eq("id", coordId);

            if (error) throw error;

            setCoordinators(prev =>
                prev.map(c => c.id === coordId ? { ...c, is_active: !currentStatus } : c)
            );
        } catch (error) {
            console.error("Error toggling status:", error);
            alert("Failed to update status.");
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Settings</h2>
                <p className="text-zinc-500 mt-1">Manage your account and coordinator access.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Password Change Section */}
                <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden p-8 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Lock size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-zinc-900">Security</h3>
                    </div>

                    <form onSubmit={handlePasswordUpdate} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700">New Password</label>
                            <Input
                                type="password"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="rounded-xl h-11"
                                placeholder="••••••••"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700">Confirm Password</label>
                            <Input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="rounded-xl h-11"
                                placeholder="••••••••"
                            />
                        </div>

                        {passwordMessage && (
                            <p className={cn(
                                "text-sm p-3 rounded-xl",
                                passwordMessage.type === 'success' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                            )}>
                                {passwordMessage.text}
                            </p>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-zinc-900 text-white hover:bg-zinc-800 h-11 rounded-xl"
                            disabled={updatingPassword}
                        >
                            {updatingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Update Password"}
                        </Button>
                    </form>
                </div>

                {/* Coordinator Access Management */}
                <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden p-8 space-y-6 flex flex-col">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                <Users size={20} />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900">Coordinator Access</h3>
                        </div>
                        <span className="text-xs font-bold text-zinc-400 bg-zinc-50 px-2 py-1 rounded-lg">
                            {coordinators.length} TOTAL
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[300px] space-y-3 pr-2 scrollbar-thin scrollbar-thumb-zinc-200">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-10 opacity-50">
                                <Loader2 className="animate-spin mb-2" size={20} />
                                <span className="text-sm">Fetching...</span>
                            </div>
                        ) : coordinators.length === 0 ? (
                            <p className="text-center py-10 text-zinc-400 text-sm italic">No coordinators found.</p>
                        ) : (
                            coordinators.map((c) => (
                                <div key={c.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100 group transition-all hover:border-zinc-200">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-zinc-900">{c.name}</span>
                                        <span className="text-xs text-zinc-500">@{c.username}</span>
                                    </div>
                                    <button
                                        onClick={() => toggleCoordinatorStatus(c.id, c.is_active)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                                            c.is_active
                                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                                : "bg-red-100 text-red-700 hover:bg-red-200"
                                        )}
                                    >
                                        <Power size={14} />
                                        {c.is_active ? "ACTIVE" : "DISABLED"}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Summary Section */}
            <div className="bg-zinc-900 rounded-[2rem] p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative grayscale-[0.5] hover:grayscale-0 transition-all">
                <div className="relative z-10 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-md">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold">Admin Privileges</h4>
                        <p className="text-zinc-400 text-sm">You have full control over all modules and user access.</p>
                    </div>
                </div>
                <div className="relative z-10 text-right">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-bold mb-1">System Status</p>
                    <p className="text-emerald-400 font-bold flex items-center gap-2 justify-end">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        SECURE & ACTIVE
                    </p>
                </div>
                {/* Decorative circles */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl" />
            </div>
        </div>
    );
}

export default withAuth(SettingsPage);
