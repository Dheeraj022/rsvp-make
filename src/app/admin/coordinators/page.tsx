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
    User,
    Trash2,
    Pencil
} from "lucide-react";
import { Input } from "@/components/ui/input";

// Types
type Coordinator = {
    id: string;
    name: string;
    username: string;
    email?: string;
    event_id?: string;
    created_at: string;
    events?: {
        name: string;
    };
};

type Event = {
    id: string;
    name: string;
};

function CoordinatorsPage() {
    const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
    const [filteredCoordinators, setFilteredCoordinators] = useState<Coordinator[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<Event[]>([]);

    // Create Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newUsername, setNewUsername] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [selectedEventId, setSelectedEventId] = useState<string>("");
    const [isCreating, setIsCreating] = useState(false);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCoordinator, setEditingCoordinator] = useState<Coordinator | null>(null);
    const [editEventId, setEditEventId] = useState<string>("");
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        fetchCoordinators();
        fetchEvents();
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
                .select(`
                    *,
                    events (
                        name
                    )
                `)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setCoordinators(data || []);
        } catch (error: any) {
            console.error("Error fetching coordinators:", error.message || error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEvents = async () => {
        try {
            const { data, error } = await supabase
                .from("events")
                .select("id, name")
                .order("name");

            if (error) throw error;
            setEvents(data || []);
        } catch (error: any) {
            console.error("Error fetching events:", error.message);
        }
    };

    const handleCreateCoordinator = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: newEmail,
                password: newPassword,
            });

            if (authError || !authData.user) throw authError || new Error("Failed to create auth user");

            // 2. Insert Metadata
            const { error: dbError } = await supabase.from("coordinators").insert([
                {
                    name: newName,
                    username: newUsername,
                    email: newEmail,
                    user_id: authData.user.id,
                    event_id: selectedEventId || null,
                    admin_id: user.id,
                },
            ]);
            if (dbError) throw dbError;

            await fetchCoordinators();
            setIsCreateModalOpen(false);
            setNewName("");
            setNewUsername("");
            setNewEmail("");
            setNewPassword("");
            setSelectedEventId("");
            alert("Coordinator created successfully! If you were logged out, please log back in.");
        } catch (error: any) {
            alert("Failed to create coordinator: " + error.message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteCoordinator = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete coordinator "${name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from("coordinators")
                .delete()
                .eq("id", id);

            if (error) throw error;

            setCoordinators(prev => prev.filter(c => c.id !== id));
            alert("Coordinator deleted successfully.");
        } catch (error: any) {
            console.error("Error deleting coordinator:", error.message || error);
            alert("Failed to delete coordinator: " + error.message);
        }
    };

    const handleUpdateEvent = async () => {
        if (!editingCoordinator) return;
        setIsUpdating(true);

        try {
            const { error } = await supabase
                .from("coordinators")
                .update({ event_id: editEventId || null })
                .eq("id", editingCoordinator.id);

            if (error) throw error;

            await fetchCoordinators();
            setIsEditModalOpen(false);
            alert("Event assigned successfully!");
        } catch (error: any) {
            alert("Failed to assign event: " + error.message);
        } finally {
            setIsUpdating(false);
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
                                <th className="px-6 py-4">Credentials</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                    Assigned Event
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                    Created Date
                                </th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 size={24} className="animate-spin text-zinc-400" />
                                            <span className="text-zinc-500 font-medium">Loading...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredCoordinators.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center">
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
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-zinc-600">
                                                    <User size={14} className="text-zinc-400" />
                                                    <span className="text-sm font-medium">{c.username}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-zinc-500">
                                                    <Mail size={14} className="text-zinc-400" />
                                                    <span className="text-xs">{c.email || "N/A"}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                {c.events?.name || "No event"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-sm text-zinc-600">
                                            {new Date(c.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-zinc-400 hover:text-zinc-900 transition-colors"
                                                    onClick={() => {
                                                        setEditingCoordinator(c);
                                                        setEditEventId(c.event_id || "");
                                                        setIsEditModalOpen(true);
                                                    }}
                                                >
                                                    <Pencil size={16} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-zinc-400 hover:text-red-600 transition-colors"
                                                    onClick={() => handleDeleteCoordinator(c.id, c.name)}
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
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
                                <label className="text-sm font-medium text-zinc-900">Email ID</label>
                                <Input
                                    required
                                    type="email"
                                    placeholder="Enter email address"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
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

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
                                    Assigned Event
                                </label>
                                <select
                                    value={selectedEventId}
                                    onChange={(e) => setSelectedEventId(e.target.value)}
                                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all text-sm"
                                >
                                    <option value="">Select an event (Optional)</option>
                                    {events.map((event) => (
                                        <option key={event.id} value={event.id}>
                                            {event.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-zinc-100">
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
            {/* Edit/Assign Event Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                            <h3 className="text-lg font-semibold text-zinc-900">Assign Event</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <p className="text-sm text-zinc-600 mb-4">
                                Assign an event to <span className="font-semibold text-zinc-900">{editingCoordinator?.name}</span>.
                                This will grant them access to all guests of that event.
                            </p>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-700">Select Event</label>
                                <select
                                    value={editEventId}
                                    onChange={(e) => setEditEventId(e.target.value)}
                                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all text-sm"
                                >
                                    <option value="">No Event Assigned</option>
                                    {events.map((event) => (
                                        <option key={event.id} value={event.id}>
                                            {event.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-zinc-100">
                                <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleUpdateEvent}
                                    disabled={isUpdating}
                                    className="bg-zinc-900 text-white hover:bg-zinc-800"
                                >
                                    {isUpdating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        "Save Changes"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default withAuth(CoordinatorsPage);
