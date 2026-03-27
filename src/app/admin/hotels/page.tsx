"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import withRoleAuth from "@/components/admin/withRoleAuth";
import { Button } from "@/components/ui/button";
import {
    Plus,
    Search,
    ChevronRight,
    Edit2,
    Loader2,
    X,
    Check,
    Save,
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
            (h.manager_name && h.manager_name.toLowerCase().includes(searchQuery.toLowerCase()))
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
                .select("id, name, assigned_hotel_email");

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

            const response = await fetch("/api/admin/create-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: 'hotel',
                    email: newHotelEmail,
                    password: newHotelPassword,
                    name: newHotelName,
                    managerName: newHotelManager,
                    adminId: user.id
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Failed to create hotel");

            await fetchData();
            setIsCreateModalOpen(false);
            setNewHotelName("");
            setNewHotelManager("");
            setNewHotelEmail("");
            setNewHotelPassword("");
            alert("Hotel profile created successfully!");
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

            // Verify password
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: adminPassword,
            });

            if (signInError) throw new Error("Invalid admin password");

            // Delete API call
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
                {loading ? (
                    <div className="p-20 text-center bg-white">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-600 rounded-full animate-spin" />
                            <span className="text-zinc-500 font-medium">Loading hotels...</span>
                        </div>
                    </div>
                ) : filteredHotels.length === 0 ? (
                    <div className="p-20 text-center bg-white">
                        <h4 className="text-lg font-semibold text-zinc-900">No hotels registered</h4>
                        <p className="text-zinc-500 mt-2">New hotels will appear here once they sign up.</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop View */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-left bg-white">
                                <thead>
                                    <tr className="bg-[#f8f9fa] text-zinc-700 text-[10px] md:text-xs font-black uppercase tracking-widest border-b border-zinc-100">
                                        <th className="px-4 md:px-6 py-4">Hotel Name</th>
                                        <th className="px-6 py-4">Event Assigned</th>
                                        <th className="px-6 py-4">Hotel Email ID</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-4 md:px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {filteredHotels.map((hotel) => {
                                        const { status, event } = getAssignmentStatus(hotel.email);
                                        const isEditing = editingHotelId === hotel.id;

                                        return (
                                            <tr key={hotel.id} className="hover:bg-zinc-50/50 transition-colors group">
                                                <td className="px-4 md:px-6 py-5">
                                                    <div className="font-bold text-zinc-900 text-sm md:text-base">{hotel.name}</div>
                                                    <div className="text-[10px] md:text-xs text-zinc-500 mt-0.5">{hotel.manager_name} (Manager)</div>
                                                </td>
                                                <td className="px-6 py-5">
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
                                                <td className="px-6 py-5 text-zinc-500 text-sm">
                                                    <a href={`mailto:${hotel.email}`} className="text-blue-600 hover:underline">
                                                        {hotel.email}
                                                    </a>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${status === "Assigned"
                                                        ? "bg-green-100 text-green-800"
                                                        : "bg-zinc-100 text-zinc-600"
                                                        }`}>
                                                        {status}
                                                    </span>
                                                </td>
                                                <td className="px-4 md:px-6 py-5">
                                                    {isEditing ? (
                                                        <div className="flex gap-2 justify-end">
                                                            <Button
                                                                size="sm"
                                                                className="bg-zinc-900 text-white hover:bg-zinc-800 h-8 font-bold text-[10px] uppercase tracking-wider"
                                                                onClick={() => handleSaveAssignment(hotel.id, hotel.email, hotel.name)}
                                                                disabled={isSaving === hotel.id}
                                                            >
                                                                {isSaving === hotel.id ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Save className="w-3 h-3 mr-1.5" />}
                                                                Save
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 font-bold text-[10px] uppercase tracking-wider"
                                                                onClick={() => {
                                                                    setEditingHotelId(null);
                                                                    const currentEvent = events.find(e => e.assigned_hotel_email === hotel.email);
                                                                    setTempAssignment({ ...tempAssignment, [hotel.id]: currentEvent?.id || "none" });
                                                                }}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 text-zinc-600 hover:text-zinc-900 gap-1.5"
                                                                onClick={() => {
                                                                    setEditingHotelId(hotel.id);
                                                                    setTempAssignment({ ...tempAssignment, [hotel.id]: event?.id || "none" });
                                                                }}
                                                            >
                                                                <Edit2 size={14} />
                                                                <span className="font-bold text-[10px] uppercase tracking-wider">Assign</span>
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => handleDeleteHotel(hotel.id, hotel.name)}
                                                            >
                                                                <Trash2 size={14} />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View */}
                        <div className="lg:hidden divide-y divide-zinc-100 bg-white">
                            {filteredHotels.map((hotel) => {
                                const { status, event } = getAssignmentStatus(hotel.email);
                                const isEditing = editingHotelId === hotel.id;

                                return (
                                    <div key={hotel.id} className="p-5 space-y-4 hover:bg-zinc-50/50 transition-colors">
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-zinc-900 text-base truncate">{hotel.name}</span>
                                                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{hotel.manager_name} (Manager)</span>
                                            </div>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${status === "Assigned"
                                                ? "bg-green-50 text-green-700 border border-green-100"
                                                : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                                                }`}>
                                                {status}
                                            </span>
                                        </div>

                                        <div className="flex flex-col gap-1.5 break-all">
                                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Hotel Email</span>
                                            <a href={`mailto:${hotel.email}`} className="text-sm font-medium text-blue-600 hover:underline">
                                                {hotel.email}
                                            </a>
                                        </div>

                                        <div className="space-y-2 pt-2 border-t border-zinc-50">
                                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Event Assignment</span>
                                            {isEditing ? (
                                                <div className="flex flex-col gap-3">
                                                    <select
                                                        value={tempAssignment[hotel.id] || ""}
                                                        onChange={(e) => setTempAssignment({ ...tempAssignment, [hotel.id]: e.target.value })}
                                                        className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-zinc-50 text-sm focus:ring-2 focus:ring-zinc-200 focus:border-zinc-400 outline-none transition-all"
                                                    >
                                                        <option value="none">Select Event</option>
                                                        {events.map((ev) => (
                                                            <option key={ev.id} value={ev.id}>
                                                                {ev.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            className="flex-1 bg-zinc-900 text-white hover:bg-zinc-800 h-10 rounded-lg text-xs font-bold uppercase tracking-wider"
                                                            onClick={() => handleSaveAssignment(hotel.id, hotel.email, hotel.name)}
                                                            disabled={isSaving === hotel.id}
                                                        >
                                                            {isSaving === hotel.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                                            Save
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            className="flex-1 h-10 rounded-lg text-xs font-bold uppercase tracking-wider"
                                                            onClick={() => {
                                                                setEditingHotelId(null);
                                                                const currentEvent = events.find(e => e.assigned_hotel_email === hotel.email);
                                                                setTempAssignment({ ...tempAssignment, [hotel.id]: currentEvent?.id || "none" });
                                                            }}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between gap-4 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                                                    <span className="text-sm font-bold text-zinc-700 truncate">
                                                        {event ? event.name : "Unassigned"}
                                                    </span>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-zinc-400 hover:text-zinc-900"
                                                            onClick={() => {
                                                                setEditingHotelId(hotel.id);
                                                                setTempAssignment({ ...tempAssignment, [hotel.id]: event?.id || "none" });
                                                            }}
                                                        >
                                                            <Edit2 size={14} />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-zinc-400 hover:text-red-600"
                                                            onClick={() => handleDeleteHotel(hotel.id, hotel.name)}
                                                        >
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {!loading && filteredHotels.length > 0 && (
                    <div className="p-4 text-center bg-[#fcfcfc] border-t border-zinc-100">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                            Total Registered Hotels: {filteredHotels.length}
                        </span>
                    </div>
                )}
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
                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    className="w-full bg-zinc-900 text-white hover:bg-zinc-800 h-11"
                                    disabled={isCreating}
                                >
                                    {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Create Hotel"}
                                </Button>
                            </div>
                        </form>

                        <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-100 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center shrink-0 mt-0.5">
                                <Plus size={16} className="text-zinc-600" />
                            </div>
                            <div className="text-xs text-zinc-500 leading-relaxed">
                                Creating a hotel profile will allow you to assign them to events. The hotel manager can then log in using this email address.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 border border-zinc-200">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                                <Trash2 className="h-6 w-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-zinc-900">Delete Hotel?</h3>
                            <p className="text-zinc-500 text-sm mt-1">
                                This will permanently remove <span className="font-bold text-zinc-900">{hotelToDelete?.name}</span> and unassign them from all events.
                            </p>
                        </div>

                        <form onSubmit={confirmDeletion} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                    Admin Password Required
                                </label>
                                <Input
                                    type="password"
                                    placeholder="Enter your admin password"
                                    value={adminPassword}
                                    onChange={(e) => setAdminPassword(e.target.value)}
                                    className="h-11 border-zinc-200 focus:ring-red-100 focus:border-red-300 transition-all"
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

export default withRoleAuth(HotelsPage, 'admin');
