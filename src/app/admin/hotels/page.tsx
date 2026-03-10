"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import withAuth from "@/components/admin/withAuth";
import { Button } from "@/components/ui/button";
import {
    Plus,
    Search,
    ChevronRight,
    Edit2,
    Loader2,
    X,
    Check,
    Trash2
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";

// Types
type Hotel = {
    id: string;
    name: string;
    manager_name: string;
    email: string;
};

type Event = {
    id: string;
    name: string;
    assigned_hotel_email?: string;
};

function HotelsPage() {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [filteredHotels, setFilteredHotels] = useState<Hotel[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    // Editing state for assignments
    const [editingHotelId, setEditingHotelId] = useState<string | null>(null);
    const [tempAssignment, setTempAssignment] = useState<Record<string, string>>({}); // hotelId -> eventId
    const [isSaving, setIsSaving] = useState<string | null>(null); // hotelId

    // Create Hotel Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newHotelName, setNewHotelName] = useState("");
    const [newHotelManager, setNewHotelManager] = useState("");
    const [newHotelEmail, setNewHotelEmail] = useState("");
    const [newHotelPassword, setNewHotelPassword] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // Delete Verification State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [hotelToDelete, setHotelToDelete] = useState<{ id: string, name: string } | null>(null);
    const [adminPassword, setAdminPassword] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationError, setVerificationError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const filtered = hotels.filter((h) =>
            h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            h.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            h.manager_name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredHotels(filtered);
    }, [searchQuery, hotels]);

    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch all registered hotels
            const { data: hotelsData, error: hotelsError } = await supabase
                .from("hotels")
                .select("*")
                .order("name", { ascending: true });

            if (hotelsError) throw hotelsError;

            // 2. Fetch all events (to check assignments)
            const { data: eventsData, error: eventsError } = await supabase
                .from("events")
                .select("id, name, assigned_hotel_email")
                .eq("admin_id", user.id);

            if (eventsError) throw eventsError;

            setHotels(hotelsData || []);
            setEvents(eventsData || []);

            // Initialize temp assignments from existing event data
            const initialAssignments: Record<string, string> = {};
            (hotelsData || []).forEach(h => {
                const assignedEvent = (eventsData || []).find(e => e.assigned_hotel_email === h.email);
                if (assignedEvent) {
                    initialAssignments[h.id] = assignedEvent.id;
                }
            });
            setTempAssignment(initialAssignments);

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateHotel = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Note: Creating an auth user from the frontend usually signs out the current user.
            // To avoid this, we'll suggest the admin creates the hotel metadata first, 
            // and the hotel signs up or uses a reset flow.
            // HOWEVER, if the user explicitly wants a password field here, we'll try to use signUp.
            // Since this is a pair programming session, I'll implement it and warn about the session.

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: newHotelEmail,
                password: newHotelPassword,
            });

            if (authError) throw authError;

            const { error } = await supabase
                .from("hotels")
                .insert({
                    name: newHotelName,
                    manager_name: newHotelManager,
                    email: newHotelEmail,
                    admin_id: user.id,
                    user_id: authData.user?.id
                });

            if (error) throw error;

            await fetchData();
            setIsCreateModalOpen(false);
            setNewHotelName("");
            setNewHotelManager("");
            setNewHotelEmail("");
            setNewHotelPassword("");
            alert("Hotel profile created successfully! If you were logged out, please log back in.");
        } catch (error: any) {
            alert("Failed to create hotel: " + error.message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleSaveAssignment = async (hotelId: string, hotelEmail: string, hotelName: string) => {
        const newEventId = tempAssignment[hotelId];
        setIsSaving(hotelId);

        try {
            // Logic:
            // 1. Find if this hotel was previously assigned to any other event and remove it? 
            //    Actually, we just update the specific events.

            // To be thorough:
            // A. Remove this hotel email from ANY event it was previously assigned to
            await supabase
                .from("events")
                .update({ assigned_hotel_email: null, assigned_hotel_name: null })
                .eq("assigned_hotel_email", hotelEmail);

            // B. If a new event is selected, assign it
            if (newEventId && newEventId !== "none") {
                const { error } = await supabase
                    .from("events")
                    .update({
                        assigned_hotel_email: hotelEmail,
                        assigned_hotel_name: hotelName
                    })
                    .eq("id", newEventId);

                if (error) throw error;
            }

            await fetchData();
            setEditingHotelId(null);
        } catch (error: any) {
            alert("Failed to save assignment: " + error.message);
        } finally {
            setIsSaving(null);
        }
    };

    const handleDeleteHotel = (hotelId: string, hotelName: string) => {
        setHotelToDelete({ id: hotelId, name: hotelName });
        setAdminPassword("");
        setVerificationError(null);
        setIsDeleteModalOpen(true);
    };

    const confirmDeletion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hotelToDelete) return;

        setIsVerifying(true);
        setVerificationError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !user.email) throw new Error("Not authenticated");

            // Verify password by attempting to sign in again
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: adminPassword,
            });

            if (signInError) throw new Error("Invalid admin password");

            // If password is correct, call the server-side delete API
            const res = await fetch("/api/hotel/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    hotelId: hotelToDelete.id,
                    hotelEmail: hotels.find(h => h.id === hotelToDelete.id)?.email
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to delete hotel");

            setHotels(prev => prev.filter(h => h.id !== hotelToDelete.id));
            setIsDeleteModalOpen(false);
            setHotelToDelete(null);
            setAdminPassword("");
        } catch (error: any) {
            setVerificationError(error.message);
        } finally {
            setIsVerifying(false);
        }
    };

    const getAssignmentStatus = (hotelEmail: string) => {
        const assignedEvent = events.find(e => e.assigned_hotel_email === hotelEmail);
        return assignedEvent ? { status: "Assigned", event: assignedEvent } : { status: "Unassigned", event: null };
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto px-1 sm:px-0">
            {/* Header Section */}
            <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-4 py-2">
                <div className="overflow-hidden">
                    <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 tracking-tight truncate">Hotels Dashboard</h2>
                    <p className="text-zinc-500 mt-1 text-sm md:text-base truncate">Manage all registered hotels and assignments.</p>
                </div>
                <Button
                    className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg px-4 md:px-5 h-10 transition-all font-medium gap-2 shrink-0"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    <Plus size={18} />
                    <span className="hidden xs:inline">Create Hotel</span>
                    <span className="xs:hidden">Add</span>
                </Button>
            </div>

            {/* Search Bar */}
            <div className="relative group max-w-full bg-white rounded-lg border border-zinc-200">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-600 transition-colors" size={18} />
                <Input
                    placeholder="Search by hotel name, manager, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 bg-transparent border-none rounded-lg h-12 box-shadow-none focus-visible:ring-0 text-zinc-600 w-full"
                />
            </div>

            {/* Content Table */}
            <div className="bg-[#fcfcfc] rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left bg-white">
                        <thead>
                            <tr className="bg-[#f8f9fa] text-zinc-700 text-[10px] md:text-xs font-black uppercase tracking-widest border-b border-zinc-100">
                                <th className="px-4 md:px-6 py-4">Hotel Name</th>
                                <th className="hidden md:table-cell px-6 py-4">Event Assigned</th>
                                <th className="hidden lg:table-cell px-6 py-4">Hotel Email ID</th>
                                <th className="hidden sm:table-cell px-6 py-4 text-center">Status</th>
                                <th className="px-4 md:px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center bg-white">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-600 rounded-full animate-spin" />
                                            <span className="text-zinc-500 font-medium">Loading hotels...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredHotels.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center bg-white">
                                        <h4 className="text-lg font-semibold text-zinc-900">No hotels registered</h4>
                                        <p className="text-zinc-500 mt-2">New hotels will appear here once they sign up.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredHotels.map((hotel) => {
                                    const { status, event } = getAssignmentStatus(hotel.email);
                                    const isEditing = editingHotelId === hotel.id;

                                    return (
                                        <tr key={hotel.id} className="hover:bg-zinc-50/50 transition-colors group">
                                            <td className="px-4 md:px-6 py-5">
                                                <div className="font-bold text-zinc-900 text-sm md:text-base">{hotel.name}</div>
                                                <div className="text-[10px] md:text-xs text-zinc-500 mt-0.5">{hotel.manager_name} (Manager)</div>
                                                <div className="md:hidden mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-600">
                                                    {status}
                                                </div>
                                            </td>
                                            <td className="hidden md:table-cell px-6 py-5">
                                                {isEditing ? (
                                                    <select
                                                        value={tempAssignment[hotel.id] || ""}
                                                        onChange={(e) => setTempAssignment({ ...tempAssignment, [hotel.id]: e.target.value })}
                                                        className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
                                                    >
                                                        <option value="none">Select Event</option>
                                                        {events.map((ev) => (
                                                            <option key={ev.id} value={ev.id}>
                                                                {ev.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div className="text-zinc-600 font-medium">
                                                        {event ? event.name : <span className="text-zinc-400 italic">Unassigned</span>}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="hidden lg:table-cell px-6 py-5 text-zinc-500 text-sm">
                                                <a href={`mailto:${hotel.email}`} className="text-blue-600 hover:underline">
                                                    {hotel.email}
                                                </a>
                                            </td>
                                            <td className="hidden sm:table-cell px-6 py-5 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${status === "Assigned"
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-zinc-100 text-zinc-600"
                                                    }`}>
                                                    {status}
                                                </span>
                                            </td>
                                            <td className="px-4 md:px-6 py-5">
                                                {isEditing ? (
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            className="h-8 bg-zinc-900 text-white px-3"
                                                            onClick={() => handleSaveAssignment(hotel.id, hotel.email, hotel.name)}
                                                            disabled={isSaving === hotel.id}
                                                        >
                                                            {isSaving === hotel.id ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0"
                                                            onClick={() => {
                                                                setEditingHotelId(null);
                                                                // Revert temp assignment
                                                                const currentEvent = events.find(e => e.assigned_hotel_email === hotel.email);
                                                                setTempAssignment({ ...tempAssignment, [hotel.id]: currentEvent?.id || "none" });
                                                            }}
                                                        >
                                                            <X size={14} />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 text-zinc-600 border-zinc-200 gap-1.5 hover:bg-zinc-50"
                                                            onClick={() => {
                                                                setEditingHotelId(hotel.id);
                                                                const currentEvent = events.find(e => e.assigned_hotel_email === hotel.email);
                                                                setTempAssignment({ ...tempAssignment, [hotel.id]: currentEvent?.id || "none" });
                                                            }}
                                                        >
                                                            <Edit2 size={13} />
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                            onClick={() => handleDeleteHotel(hotel.id, hotel.name)}
                                                        >
                                                            <Trash2 size={15} />
                                                        </Button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                    {!loading && hotels.length > 0 && (
                        <div className="p-4 text-center bg-[#fcfcfc] border-t border-zinc-100">
                            <span className="text-sm text-zinc-500">
                                Total Registered Hotels: {hotels.length}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Hotel Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200 border border-zinc-200">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-zinc-900 mb-1">Create Hotel Profile</h3>
                                <p className="text-zinc-500 text-sm">
                                    Add a new hotel partner to the system.
                                </p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsCreateModalOpen(false)} className="h-8 w-8 text-zinc-500 rounded-full shrink-0 -mt-1 -mr-1">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <form onSubmit={handleCreateHotel} className="space-y-4 mb-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-900">
                                    Hotel Name
                                </label>
                                <Input
                                    required
                                    placeholder="e.g. Grand Hyatt Goa"
                                    value={newHotelName}
                                    onChange={(e) => setNewHotelName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-900">
                                    Manager Name
                                </label>
                                <Input
                                    required
                                    placeholder="Full Name"
                                    value={newHotelManager}
                                    onChange={(e) => setNewHotelManager(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-900">
                                    Hotel Email Address
                                </label>
                                <Input
                                    required
                                    type="email"
                                    placeholder="hotel@example.com"
                                    value={newHotelEmail}
                                    onChange={(e) => setNewHotelEmail(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-900">
                                    Set Password
                                </label>
                                <Input
                                    required
                                    type="password"
                                    placeholder="••••••••"
                                    value={newHotelPassword}
                                    onChange={(e) => setNewHotelPassword(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isCreating}>
                                    {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Create Profile"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 text-left">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200 border border-zinc-200">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-red-600 mb-1">Confirm Deletion</h3>
                                <p className="text-zinc-500 text-sm">
                                    Are you sure you want to delete <span className="font-bold">"{hotelToDelete?.name}"</span>? This action cannot be undone.
                                </p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsDeleteModalOpen(false)} className="h-8 w-8 text-zinc-500 rounded-full shrink-0 -mt-1 -mr-1">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <form onSubmit={confirmDeletion} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-900">
                                    Enter Admin Password to Confirm
                                </label>
                                <Input
                                    required
                                    type="password"
                                    placeholder="Enter your admin password"
                                    value={adminPassword}
                                    onChange={(e) => setAdminPassword(e.target.value)}
                                    className={verificationError ? "border-red-500" : ""}
                                    autoFocus
                                />
                                {verificationError && (
                                    <p className="text-xs text-red-500 font-medium">
                                        {verificationError}
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    disabled={isVerifying || !adminPassword}
                                >
                                    {isVerifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Delete Hotel"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default withAuth(HotelsPage);

