"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import withRoleAuth from "@/components/admin/withRoleAuth";
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
    Pencil,
    UserCheck,
    CheckCircle,
    Calendar
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { Input } from "@/components/ui/input";

// Types
type Coordinator = {
    id: string;
    name: string;
    username: string;
    email?: string;
    coordinator_events?: {
        event_id: string;
        events: {
            name: string;
            date?: string;
        };
    }[];
    created_at: string;
    is_active: boolean;
};

type Event = {
    id: string;
    name: string;
    date?: string;
};

function CoordinatorsPage() {
    const toast = useToast();
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
    const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCoordinator, setEditingCoordinator] = useState<Coordinator | null>(null);
    const [editEventIds, setEditEventIds] = useState<string[]>([]);
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
            const { data: { user } = {} } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("coordinators")
                .select(`
                    *,
                    coordinator_events (
                        event_id,
                        events (
                            name
                        )
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
            const { data: { user } = {} } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const response = await fetch("/api/admin/create-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: 'coordinator',
                    email: newEmail,
                    password: newPassword,
                    name: newName,
                    username: newUsername,
                    eventIds: selectedEventIds,
                    adminId: user.id
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Failed to create coordinator");

            await fetchCoordinators();
            setIsCreateModalOpen(false);
            setNewName("");
            setNewUsername("");
            setNewEmail("");
            setNewPassword("");
            setSelectedEventIds([]);
            toast.success("Coordinator created successfully!");
        } catch (error: any) {
            toast.error("Failed to create coordinator: " + error.message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleToggleActivation = async (id: string, currentStatus: boolean, name: string) => {
        try {
            const { error } = await supabase
                .from("coordinators")
                .update({ is_active: !currentStatus })
                .eq("id", id);

            if (error) throw error;

            setCoordinators(prev => prev.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
            toast.success(`Coordinator "${name}" ${!currentStatus ? 'activated' : 'deactivated'} successfully.`);
        } catch (error: any) {
            console.error("Error toggling activation:", error.message || error);
            toast.error("Failed to update activation status: " + error.message);
        }
    };

    const handleDeleteCoordinator = async (id: string, name: string) => {
        const confirmed = await toast.confirm("Delete Coordinator", `Are you sure you want to delete coordinator "${name}"? This action cannot be undone.`);
        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from("coordinators")
                .delete()
                .eq("id", id);

            if (error) throw error;

            setCoordinators(prev => prev.filter(c => c.id !== id));
            toast.success("Coordinator deleted successfully.");
        } catch (error: any) {
            console.error("Error deleting coordinator:", error.message || error);
            toast.error("Failed to delete coordinator: " + error.message);
        }
    };

    const handleUpdateEvent = async () => {
        if (!editingCoordinator) return;
        setIsUpdating(true);

        try {
            const response = await fetch("/api/admin/coordinators/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    coordinatorId: editingCoordinator.id,
                    eventIds: editEventIds,
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Failed to update coordinator");

            await fetchCoordinators();
            setIsEditModalOpen(false);
            toast.success("Event assigned successfully!");
        } catch (error: any) {
            toast.error("Failed to assign event: " + error.message);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto px-1 sm:px-0">
            {/* Header */}
            <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-4 py-2">
                <div className="overflow-hidden">
                    <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight truncate">Coordinators</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm md:text-base truncate">Manage event coordinators and access.</p>
                </div>
                <Button
                    className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg px-4 md:px-5 h-10 transition-all font-medium gap-2 shrink-0"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    <Plus size={18} />
                    <span className="hidden xs:inline">Create Coordinator</span>
                    <span className="xs:hidden">Add</span>
                </Button>
            </div>

            {/* Search */}
            <div className="relative group max-w-full bg-white dark:bg-white/5 rounded-lg border border-zinc-200 dark:border-white/10">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-600 transition-colors" size={18} />
                <Input
                    placeholder="Search by name or username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 bg-transparent border-none rounded-lg h-12 box-shadow-none focus-visible:ring-0 text-zinc-900 dark:text-zinc-50 w-full placeholder:text-zinc-400"
                />
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 size={24} className="animate-spin text-zinc-400" />
                            <span className="text-zinc-500 dark:text-zinc-400 font-medium tracking-wider text-xs uppercase font-black">Loading...</span>
                        </div>
                    </div>
                ) : filteredCoordinators.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="w-16 h-16 bg-zinc-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-300 dark:text-zinc-500">
                            <UserCog size={32} />
                        </div>
                        <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">No coordinators found</h4>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-1 uppercase text-xs font-bold tracking-wider">Start by creating your first coordinator</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop View */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-zinc-50/50 dark:bg-white/5">
                                    <tr className="text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-white/5">
                                        <th className="px-4 md:px-6 py-4">Coordinator Info</th>
                                        <th className="px-6 py-4">Credentials</th>
                                        <th className="px-6 py-4 text-left">Assigned Event</th>
                                        <th className="px-6 py-4 text-left">Status</th>
                                        <th className="hidden xl:table-cell px-6 py-4 text-left">Created Date</th>
                                        <th className="px-4 md:px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                                    {filteredCoordinators.map((c) => (
                                        <tr key={c.id} className="hover:bg-zinc-50/50 dark:hover:bg-white/5 transition-colors group">
                                            <td className="px-4 md:px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-white/10">
                                                        <User size={16} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-zinc-900 dark:text-zinc-50 text-sm">{c.name}</span>
                                                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{c.username}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                                                        <User size={14} className="text-zinc-400 dark:text-zinc-500" />
                                                        <span className="text-sm font-medium">{c.username}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                                                        <Mail size={14} className="text-zinc-400 dark:text-zinc-500" />
                                                        <span className="text-xs">{c.email || "N/A"}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
                                                    {c.coordinator_events && c.coordinator_events.length > 0 ? (
                                                        c.coordinator_events.map((ce, i) => (
                                                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50">
                                                                {ce.events?.name}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-zinc-400 text-xs italic">No event assigned</span>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${c.is_active
                                                    ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-100 dark:border-green-900"
                                                    : "bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-100 dark:border-yellow-900"
                                                    }`}>
                                                    {c.is_active ? "Active" : "Pending"}
                                                </span>
                                            </td>
                                            <td className="hidden xl:table-cell px-6 py-5 text-sm text-zinc-600 dark:text-zinc-400">
                                                {new Date(c.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 md:px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {!c.is_active && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
                                                            title="Activate Coordinator"
                                                            onClick={() => handleToggleActivation(c.id, c.is_active, c.name)}
                                                        >
                                                            <UserCheck size={18} />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
                                                        onClick={() => {
                                                            setEditingCoordinator(c);
                                                            setEditEventIds(c.coordinator_events?.map(ce => ce.event_id) || []);
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
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View */}
                        <div className="lg:hidden divide-y divide-zinc-100 dark:divide-white/5 overflow-hidden">
                            {filteredCoordinators.map((c) => (
                                <div key={c.id} className="p-5 space-y-4 hover:bg-zinc-50/50 dark:hover:bg-white/5 transition-colors">
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-white/5 flex items-center justify-center text-zinc-400 dark:text-zinc-500 border border-zinc-100 dark:border-white/10 shrink-0">
                                                <User size={18} />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-zinc-900 dark:text-zinc-50 text-sm truncate">{c.name}</span>
                                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">{c.username}</span>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shrink-0 ${c.is_active
                                            ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-100 dark:border-green-900"
                                            : "bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-100 dark:border-yellow-900"
                                            }`}>
                                            {c.is_active ? "Active" : "Pending"}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 py-1">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Email Address</span>
                                            <span className="text-xs text-zinc-600 dark:text-zinc-300 font-medium truncate">{c.email || "N/A"}</span>
                                        </div>
                                        <div className="flex flex-col gap-1 items-end text-right">
                                            <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Assigned Events</span>
                                            <div className="flex flex-wrap justify-end gap-1">
                                                {c.coordinator_events && c.coordinator_events.length > 0 ? (
                                                    c.coordinator_events.slice(0, 2).map((ce, i) => (
                                                        <span key={i} className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{ce.events?.name}</span>
                                                    ))
                                                ) : (
                                                    <span className="text-[10px] text-zinc-400 italic">Unassigned</span>
                                                )}
                                                {c.coordinator_events && c.coordinator_events.length > 2 && (
                                                    <span className="text-[10px] text-zinc-400">+{c.coordinator_events.length - 2} more</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-zinc-50 dark:border-white/5">
                                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium italic">Added: {new Date(c.created_at).toLocaleDateString()}</span>
                                        <div className="flex items-center gap-2">
                                            {!c.is_active && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-green-600 border-green-100 hover:bg-green-50 dark:border-green-900 dark:hover:bg-green-950 px-3 gap-1.5"
                                                    onClick={() => handleToggleActivation(c.id, c.is_active, c.name)}
                                                >
                                                    <UserCheck size={14} />
                                                    <span className="text-[10px] font-bold uppercase">Activate</span>
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
                                                onClick={() => {
                                                    setEditingCoordinator(c);
                                                    setEditEventIds(c.coordinator_events?.map(ce => ce.event_id) || []);
                                                    setIsEditModalOpen(true);
                                                }}
                                            >
                                                <Pencil size={15} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-zinc-400 hover:text-red-600"
                                                onClick={() => handleDeleteCoordinator(c.id, c.name)}
                                            >
                                                <Trash2 size={15} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-950 rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 sm:p-10 animate-in zoom-in-95 duration-300 border border-zinc-200 dark:border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-500" />
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Create Coordinator</h3>
                                <p className="text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Register a new coordinator for your events.</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsCreateModalOpen(false)} className="h-10 w-10 text-zinc-400 dark:text-zinc-600 rounded-full hover:bg-zinc-100 dark:hover:bg-white/5 transition-all">
                                <X size={20} />
                            </Button>
                        </div>

                        <form onSubmit={handleCreateCoordinator} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Full Name</label>
                                <Input
                                    required
                                    placeholder="Enter name"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder-zinc-400"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Username</label>
                                <Input
                                    required
                                    placeholder="Enter username"
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    className="dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder-zinc-400"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Email ID</label>
                                <Input
                                    required
                                    type="email"
                                    placeholder="Enter email address"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder-zinc-400"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Password</label>
                                <Input
                                    required
                                    type="password"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="h-12 bg-zinc-50 dark:bg-white/5 border-none dark:border dark:border-white/10 rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all font-bold text-zinc-900 dark:text-zinc-50"
                                />
                            </div>

                            <div className="space-y-3 pt-2">
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-50 flex items-center gap-2">
                                    Assigned Events
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">(Select Multiple)</span>
                                </label>
                                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-3 bg-zinc-50 dark:bg-white/5 rounded-2xl border border-zinc-100 dark:border-white/10 custom-scrollbar">
                                    {events.length === 0 ? (
                                        <div className="py-8 text-center">
                                            <Calendar className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700 mb-2" />
                                            <div className="text-xs text-zinc-400 font-medium">No events found</div>
                                        </div>
                                    ) : (
                                        events.map((event) => {
                                            const isSelected = selectedEventIds.includes(event.id);
                                            return (
                                                <label 
                                                    key={event.id} 
                                                    className={cn(
                                                        "flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border group relative overflow-hidden",
                                                        isSelected 
                                                            ? "bg-blue-50/50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30" 
                                                            : "bg-white dark:bg-white/5 border-zinc-100 dark:border-white/10 hover:border-zinc-200 dark:hover:border-white/20"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                                        isSelected ? "bg-blue-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700"
                                                    )}>
                                                        <Calendar size={18} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className={cn(
                                                            "text-sm font-bold block truncate transition-colors",
                                                            isSelected ? "text-blue-600 dark:text-blue-400" : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900"
                                                        )}>
                                                            {event.name}
                                                        </span>
                                                        {event.date && (
                                                            <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                                                                {format(new Date(event.date), "MMM dd, yyyy")}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedEventIds([...selectedEventIds, event.id]);
                                                            } else {
                                                                setSelectedEventIds(selectedEventIds.filter(id => id !== event.id));
                                                            }
                                                        }}
                                                        className="w-5 h-5 rounded-lg border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500/20 transition-all cursor-pointer accent-blue-600"
                                                    />
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            <div className="pt-6">
                                <Button
                                    type="submit"
                                    className="w-full bg-zinc-900 dark:bg-white dark:text-zinc-950 text-white hover:opacity-90 h-14 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-zinc-900/10 active:scale-[0.98] transition-all"
                                    disabled={isCreating}
                                >
                                    {isCreating ? <Loader2 size={18} className="animate-spin" /> : "Confirm & Create"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Edit/Assign Event Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-950 rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 sm:p-10 animate-in zoom-in-95 duration-300 border border-zinc-200 dark:border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-500" />
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Assign Event</h3>
                                <p className="text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Assign an event to {editingCoordinator?.name}.</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsEditModalOpen(false)} className="h-10 w-10 text-zinc-400 dark:text-zinc-600 rounded-full hover:bg-zinc-100 dark:hover:bg-white/5 transition-all">
                                <X size={20} />
                            </Button>
                        </div>

                        <div className="space-y-6">
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                                This will grant them access to all guests of that event.
                            </p>
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-50 flex items-center gap-2">
                                    Assign Events
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">(Select Multiple)</span>
                                </label>
                                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-3 bg-zinc-50 dark:bg-white/5 rounded-2xl border border-zinc-100 dark:border-white/10 custom-scrollbar">
                                    {events.length === 0 ? (
                                        <div className="py-8 text-center">
                                            <Calendar className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700 mb-2" />
                                            <div className="text-xs text-zinc-400 font-medium">No events found</div>
                                        </div>
                                    ) : (
                                        events.map((event) => {
                                            const isSelected = editEventIds.includes(event.id);
                                            return (
                                                <label 
                                                    key={event.id} 
                                                    className={cn(
                                                        "flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border group relative overflow-hidden",
                                                        isSelected 
                                                            ? "bg-blue-50/50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30" 
                                                            : "bg-white dark:bg-white/5 border-zinc-100 dark:border-white/10 hover:border-zinc-200 dark:hover:border-white/20"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                                        isSelected ? "bg-blue-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700"
                                                    )}>
                                                        <Calendar size={18} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className={cn(
                                                            "text-sm font-bold block truncate transition-colors",
                                                            isSelected ? "text-blue-600 dark:text-blue-400" : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900"
                                                        )}>
                                                            {event.name}
                                                        </span>
                                                        {event.date && (
                                                            <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                                                                {format(new Date(event.date), "MMM dd, yyyy")}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setEditEventIds([...editEventIds, event.id]);
                                                            } else {
                                                                setEditEventIds(editEventIds.filter(id => id !== event.id));
                                                            }
                                                        }}
                                                        className="w-5 h-5 rounded-lg border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500/20 transition-all cursor-pointer accent-blue-600"
                                                    />
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            <div className="pt-6">
                                <Button
                                    onClick={handleUpdateEvent}
                                    disabled={isUpdating}
                                    className="w-full bg-zinc-900 dark:bg-white dark:text-zinc-950 text-white hover:opacity-90 h-14 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-zinc-900/10 active:scale-[0.98] transition-all"
                                >
                                    {isUpdating ? <Loader2 size={18} className="animate-spin" /> : "Save Changes"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default withRoleAuth(CoordinatorsPage, 'admin');
