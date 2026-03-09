"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import withAuth from "@/components/admin/withAuth";
import { Button } from "@/components/ui/button";
import {
    Plus,
    Search,
    UserCog,
    Loader2,
    X,
    Mail,
    User
} from "lucide-react";
import { Input } from "@/components/ui/input";

// Types
type Coordinator = {
    id: string;
    name: string;
    username: string;
    created_at: string;
};

function CoordinatorsPage() {
    const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
    const [filteredCoordinators, setFilteredCoordinators] = useState<Coordinator[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    // Create Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newUsername, setNewUsername] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        fetchCoordinators();
    }, []);

    useEffect(() => {
        const filtered = coordinators.filter((c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.username.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredCoordinators(filtered);
    }, [searchQuery, coordinators]);

    const fetchCoordinators = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("coordinators")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setCoordinators(data || []);
        } catch (error: any) {
            console.error("Error fetching coordinators:", error.message || error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCoordinator = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // 1. Create Auth User using a dummy email from username
            // Supabase Auth requires an email, so we generate a consistent one
            const dummyEmail = `${newUsername.toLowerCase()}@rsvp.com`;

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: dummyEmail,
                password: newPassword,
            });

            if (authError) throw authError;

            // 2. Insert Metadata
            const { error } = await supabase
                .from("coordinators")
                .insert({
                    name: newName,
                    username: newUsername,
                    admin_id: user.id,
                    user_id: authData.user?.id
                });

            if (error) throw error;

            await fetchCoordinators();
            setIsCreateModalOpen(false);
            setNewName("");
            setNewUsername("");
            setNewPassword("");
            alert("Coordinator created successfully! If you were logged out, please log back in.");
        } catch (error: any) {
            alert("Failed to create coordinator: " + error.message);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-2">
                <div>
                    <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Coordinators</h2>
                    <p className="text-zinc-500 mt-1">Manage event coordinators and their access.</p>
                </div>
                <Button
                    className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg px-5 h-10 transition-all font-medium gap-2"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    <Plus size={18} />
                    Create Coordinator
                </Button>
            </div>

            {/* Search */}
            <div className="relative group max-w-full bg-white rounded-lg border border-zinc-200">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-600 transition-colors" size={18} />
                <Input
                    placeholder="Search by name or username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 bg-transparent border-none rounded-lg h-12 box-shadow-none focus-visible:ring-0 text-zinc-600 w-full"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#f8f9fa] text-zinc-700 text-[15px] font-semibold border-b border-zinc-100">
                                <th className="px-6 py-4">Coordinator Info</th>
                                <th className="px-6 py-4">Username</th>
                                <th className="px-6 py-4">Created Date</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 size={24} className="animate-spin text-zinc-400" />
                                            <span className="text-zinc-500 font-medium">Loading...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredCoordinators.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-20 text-center">
                                        <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-300">
                                            <UserCog size={32} />
                                        </div>
                                        <h4 className="text-lg font-semibold text-zinc-900">No coordinators found</h4>
                                        <p className="text-zinc-500 mt-1 uppercase text-xs font-bold tracking-wider">Start by creating your first coordinator</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredCoordinators.map((c) => (
                                    <tr key={c.id} className="hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 border border-zinc-200">
                                                    <User size={18} />
                                                </div>
                                                <span className="font-semibold text-zinc-900">{c.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 text-zinc-600">
                                                <User size={14} className="text-zinc-400" />
                                                <span className="text-sm font-medium">{c.username}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-sm text-zinc-500">
                                            {new Date(c.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-900">
                                                Manage access
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200 border border-zinc-200">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-zinc-900 mb-1">Create Coordinator</h3>
                                <p className="text-zinc-500 text-sm">Register a new coordinator for your events.</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsCreateModalOpen(false)} className="h-8 w-8 text-zinc-500 rounded-full shrink-0 -mt-1 -mr-1">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <form onSubmit={handleCreateCoordinator} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-900">Full Name</label>
                                <Input
                                    required
                                    placeholder="Enter name"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-900">Username</label>
                                <Input
                                    required
                                    placeholder="Enter username"
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-900">Password</label>
                                <Input
                                    required
                                    type="password"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isCreating} className="bg-zinc-900 text-white hover:bg-zinc-800">
                                    {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Create Coordinator"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default withAuth(CoordinatorsPage);
