"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import withRoleAuth from "@/components/admin/withRoleAuth";
import { Button } from "@/components/ui/button";
import {
    Plus,
    Search,
    Loader2,
    X,
    Trash2,
    Edit2,
    Save,
    MapPin,
    Hotel,
    Calendar,
    LayoutDashboard
} from "lucide-react";
import { Input } from "@/components/ui/input";

// Types
type HotelType = {
    id: string;
    name: string;
    manager_name: string;
    email: string;
    created_at: string;
};

type EventType = {
    id: string;
    name: string;
    assigned_hotel_email?: string;
};

function HotelsPage() {
    const [hotels, setHotels] = useState<HotelType[]>([]);
    const [events, setEvents] = useState<EventType[]>([]);
    const [filteredHotels, setFilteredHotels] = useState<HotelType[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<string | null>(null);

    // Create Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newHotelName, setNewHotelName] = useState("");
    const [newHotelManager, setNewHotelManager] = useState("");
    const [newHotelEmail, setNewHotelEmail] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // Assignment State
    const [editingHotelId, setEditingHotelId] = useState<string | null>(null);
    const [tempAssignment, setTempAssignment] = useState<{ [key: string]: string }>({});

    // Delete Confirmation State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [hotelToDelete, setHotelToDelete] = useState<HotelType | null>(null);
    const [adminPassword, setAdminPassword] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationError, setVerificationError] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const filtered = hotels.filter((h) =>
            h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            h.manager_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            h.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredHotels(filtered);
    }, [searchQuery, hotels]);

    const fetchData = async () => {
        try {
            const [hotelsRes, eventsRes] = await Promise.all([
                supabase.from("hotels").select("*").order("name"),
                supabase.from("events").select("id, name, assigned_hotel_email")
            ]);

            if (hotelsRes.error) throw hotelsRes.error;
            if (eventsRes.error) throw eventsRes.error;

            setHotels(hotelsRes.data || []);
            setEvents(eventsRes.data || []);
        } catch (error: any) {
            console.error("Error fetching data:", error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateHotel = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const { error } = await supabase.from("hotels").insert([
                {
                    name: newHotelName,
                    manager_name: newHotelManager,
                    email: newHotelEmail
                }
            ]);

            if (error) throw error;

            await fetchData();
            setIsCreateModalOpen(false);
            setNewHotelName("");
            setNewHotelManager("");
            setNewHotelEmail("");
            alert("Hotel profile created successfully!");
        } catch (error: any) {
            alert("Failed to create hotel: " + error.message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleSaveAssignment = async (hotelId: string, hotelEmail: string, hotelName: string) => {
        const selectedEventId = tempAssignment[hotelId];
        if (!selectedEventId) return;

        setIsSaving(hotelId);
        try {
            // 1. Clear previous assignments for this hotel email from all events
            await supabase
                .from("events")
                .update({ assigned_hotel_email: null })
                .eq("assigned_hotel_email", hotelEmail);

            // 2. Assign to the new event if one is selected
            if (selectedEventId !== "none") {
                const { error } = await supabase
                    .from("events")
                    .update({ assigned_hotel_email: hotelEmail })
                    .eq("id", selectedEventId);

                if (error) throw error;
            }

            await fetchData();
            setEditingHotelId(null);
            alert(`Assignment updated for ${hotelName}`);
        } catch (error: any) {
            alert("Failed to update assignment: " + error.message);
        } finally {
            setIsSaving(null);
        }
    };

    const handleDeleteHotel = (hotel: any, name: string) => {
        setHotelToDelete(hotel);
        setIsDeleteModalOpen(true);
        setAdminPassword("");
        setVerificationError("");
    };

    const confirmDeletion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hotelToDelete) return;

        setIsVerifying(true);
        setVerificationError("");

        try {
            // Simple verification check with administrative logic
            // In a real app, you'd call an API to verify the admin password
            if (adminPassword !== "admin123") { // This should be a secure API call
                throw new Error("Invalid administrative password");
            }

            // Unassign from events first
            await supabase
                .from("events")
                .update({ assigned_hotel_email: null })
                .eq("assigned_hotel_email", hotelToDelete.email);

            // Delete the hotel
            const { error } = await supabase
                .from("hotels")
                .delete()
                .eq("id", hotelToDelete.id);

            if (error) throw error;

            await fetchData();
            setIsDeleteModalOpen(false);
            alert("Hotel deleted successfully.");
        } catch (error: any) {
            setVerificationError(error.message);
        } finally {
            setIsVerifying(false);
        }
    };

    const getAssignmentStatus = (email: string) => {
        const event = events.find(e => e.assigned_hotel_email === email);
        return {
            status: event ? "Assigned" : "Unassigned",
            event: event
        };
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto px-1 sm:px-0 pb-20">
            {/* Header Section */}
            <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-4 py-2">
                <div className="overflow-hidden">
                    <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Hotel Management</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Manage registered hotels and their assignment locations.</p>
                </div>
                <Button
                    className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl px-5 h-10 transition-all font-bold text-xs uppercase tracking-widest gap-2 shrink-0 shadow-lg shadow-zinc-900/10 active:scale-95"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    <Hotel size={16} />
                    <span>Add New Hotel</span>
                </Button>
            </div>

            {/* Search Bar */}
            <div className="bg-white dark:bg-white/5 rounded-[2rem] sm:rounded-[2.5rem] border border-zinc-200 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="p-5 sm:p-8 border-b border-zinc-100 dark:border-white/5">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div className="relative group max-w-md w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <Input
                                placeholder="Search by name, manager, or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 bg-zinc-50 dark:bg-white/5 border-none dark:border dark:border-white/10 rounded-2xl h-12 focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 size={32} className="animate-spin text-zinc-300 dark:text-zinc-700" />
                            <span className="text-zinc-400 dark:text-zinc-600 font-black uppercase tracking-[0.2em] text-[10px]">Loading Hotels...</span>
                        </div>
                    </div>
                ) : filteredHotels.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="w-20 h-20 bg-zinc-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-200 dark:text-zinc-800">
                            <Hotel size={40} />
                        </div>
                        <h4 className="text-xl font-black text-zinc-900 dark:text-zinc-100">No hotels found</h4>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium">Try adjusting your search or add a new hotel.</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop View */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#f8f9fa] dark:bg-white/5">
                                    <tr className="text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-white/5">
                                        <th className="px-10 py-6">Hotel Info</th>
                                        <th className="px-6 py-6">Assignment</th>
                                        <th className="px-6 py-6">Status</th>
                                        <th className="px-10 py-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                                    {filteredHotels.map((hotel) => {
                                        const { status, event } = getAssignmentStatus(hotel.email);
                                        const isEditing = editingHotelId === hotel.id;

                                        return (
                                            <tr key={hotel.id} className="group hover:bg-zinc-50/50 dark:hover:bg-white/5 transition-colors">
                                                <td className="px-10 py-8">
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-zinc-900 dark:text-zinc-100 text-base">{hotel.name}</span>
                                                        <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 mt-1 uppercase tracking-tight">{hotel.manager_name} • {hotel.email}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-8">
                                                    {isEditing ? (
                                                        <select
                                                            value={tempAssignment[hotel.id] || ""}
                                                            onChange={(e) => setTempAssignment({ ...tempAssignment, [hotel.id]: e.target.value })}
                                                            className="h-10 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-none dark:border dark:border-white/10 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 text-zinc-900 dark:text-zinc-100 min-w-[200px]"
                                                        >
                                                            <option value="none">Unassigned</option>
                                                            {events.map((ev) => (
                                                                <option key={ev.id} value={ev.id}>
                                                                    {ev.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn("px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border", 
                                                                event ? "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900" 
                                                                      : "bg-zinc-50 text-zinc-400 border-zinc-100 dark:bg-white/5 dark:text-zinc-600 dark:border-white/5 italic")}>
                                                                {event ? event.name : "None"}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-8">
                                                    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                                        status === "Assigned" 
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900" 
                                                            : "bg-zinc-50 text-zinc-400 border-zinc-100 dark:bg-white/5 dark:text-zinc-600 dark:border-white/5")}>
                                                        {status}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-8 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        {isEditing ? (
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    size="icon"
                                                                    className="h-10 w-10 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 active:scale-95"
                                                                    onClick={() => handleSaveAssignment(hotel.id, hotel.email, hotel.name)}
                                                                    disabled={isSaving === hotel.id}
                                                                >
                                                                    {isSaving === hotel.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={18} />}
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-10 w-10 rounded-xl text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5"
                                                                    onClick={() => setEditingHotelId(null)}
                                                                >
                                                                    <X size={18} />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-10 w-10 rounded-xl text-zinc-300 dark:text-zinc-600 hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white transition-all shadow-sm active:scale-95"
                                                                    onClick={() => {
                                                                        setEditingHotelId(hotel.id);
                                                                        setTempAssignment({ ...tempAssignment, [hotel.id]: event?.id || "none" });
                                                                    }}
                                                                >
                                                                    <Edit2 size={18} />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-10 w-10 rounded-xl text-zinc-300 dark:text-zinc-600 hover:bg-red-500 dark:hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95"
                                                                    onClick={() => handleDeleteHotel(hotel, hotel.name)}
                                                                >
                                                                    <Trash2 size={18} />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View */}
                        <div className="lg:hidden divide-y divide-zinc-100 dark:divide-white/5">
                            {filteredHotels.map((hotel) => {
                                const { status, event } = getAssignmentStatus(hotel.email);
                                const isEditing = editingHotelId === hotel.id;

                                return (
                                    <div key={hotel.id} className="p-6 space-y-5 hover:bg-zinc-50/50 dark:hover:bg-white/5 transition-colors">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-black text-zinc-900 dark:text-zinc-100 text-base truncate">{hotel.name}</span>
                                                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mt-0.5">{hotel.manager_name}</span>
                                            </div>
                                            <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shrink-0",
                                                status === "Assigned" 
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900" 
                                                    : "bg-zinc-50 text-zinc-400 border-zinc-100 dark:bg-white/5 dark:text-zinc-600 dark:border-white/5")}>
                                                {status}
                                            </span>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black text-zinc-300 dark:text-zinc-700 uppercase tracking-[0.2em]">Contact Email</span>
                                            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 break-all">{hotel.email}</span>
                                        </div>

                                        <div className="pt-2">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-[9px] font-black text-zinc-300 dark:text-zinc-700 uppercase tracking-[0.2em]">Assignment</span>
                                                {isEditing ? (
                                                    <div className="flex flex-col gap-3">
                                                        <select
                                                            value={tempAssignment[hotel.id] || ""}
                                                            onChange={(e) => setTempAssignment({ ...tempAssignment, [hotel.id]: e.target.value })}
                                                            className="w-full h-11 px-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-none dark:border dark:border-white/10 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 text-zinc-900 dark:text-zinc-100"
                                                        >
                                                            <option value="none">Unassigned</option>
                                                            {events.map((ev) => (
                                                                <option key={ev.id} value={ev.id}>
                                                                    {ev.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600 h-11 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20"
                                                                onClick={() => handleSaveAssignment(hotel.id, hotel.email, hotel.name)}
                                                                disabled={isSaving === hotel.id}
                                                            >
                                                                {isSaving === hotel.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={18} className="mr-2" />}
                                                                Save
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                className="flex-1 h-11 rounded-xl text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest text-[10px]"
                                                                onClick={() => setEditingHotelId(null)}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/10">
                                                        <span className={cn("text-xs font-black uppercase tracking-tight", 
                                                            event ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 dark:text-zinc-600 italic")}>
                                                            {event ? event.name : "None assigned"}
                                                        </span>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-9 w-9 text-zinc-300 hover:text-blue-600"
                                                                onClick={() => {
                                                                    setEditingHotelId(hotel.id);
                                                                    setTempAssignment({ ...tempAssignment, [hotel.id]: event?.id || "none" });
                                                                }}
                                                            >
                                                                <Edit2 size={16} />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-9 w-9 text-zinc-300 hover:text-red-500"
                                                                onClick={() => handleDeleteHotel(hotel, hotel.name)}
                                                            >
                                                                <Trash2 size={16} />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {!loading && filteredHotels.length > 0 && (
                    <div className="p-6 text-center bg-zinc-50/30 dark:bg-white/5 border-t border-zinc-100 dark:border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-600 flex items-center justify-center gap-3">
                            <Hotel size={12} />
                            Total Registered Hotels: {filteredHotels.length}
                        </span>
                    </div>
                )}
            </div>

            {/* Create Hotel Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-950 rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 sm:p-10 animate-in zoom-in-95 duration-300 border border-zinc-200 dark:border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500" />
                        
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Add Hotel</h3>
                                <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1 font-medium">Create a new hotel profile for assignments.</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsCreateModalOpen(false)} className="h-10 w-10 text-zinc-400 dark:text-zinc-600 rounded-full hover:bg-zinc-100 dark:hover:bg-white/5 transition-all">
                                <X size={20} />
                            </Button>
                        </div>

                        <form onSubmit={handleCreateHotel} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Hotel Name</label>
                                <Input
                                    required
                                    placeholder="e.g. Grand Hyatt Goa"
                                    value={newHotelName}
                                    onChange={(e) => setNewHotelName(e.target.value)}
                                    className="h-12 bg-zinc-50 dark:bg-white/5 border-none dark:border dark:border-white/10 rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all font-bold text-zinc-900 dark:text-zinc-50"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Manager Name</label>
                                <Input
                                    required
                                    placeholder="Full Name"
                                    value={newHotelManager}
                                    onChange={(e) => setNewHotelManager(e.target.value)}
                                    className="h-12 bg-zinc-50 dark:bg-white/5 border-none dark:border dark:border-white/10 rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all font-bold text-zinc-900 dark:text-zinc-50"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Email ID</label>
                                <Input
                                    required
                                    type="email"
                                    placeholder="hotel@example.com"
                                    value={newHotelEmail}
                                    onChange={(e) => setNewHotelEmail(e.target.value)}
                                    className="h-12 bg-zinc-50 dark:bg-white/5 border-none dark:border dark:border-white/10 rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all font-bold text-zinc-900 dark:text-zinc-50"
                                />
                            </div>
                            <div className="pt-4">
                                <Button
                                    type="submit"
                                    className="w-full bg-zinc-900 dark:bg-white dark:text-zinc-950 text-white hover:opacity-90 h-14 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-zinc-900/10 active:scale-[0.98] transition-all"
                                    disabled={isCreating}
                                >
                                    {isCreating ? <Loader2 size={18} className="animate-spin" /> : "Confirm & Create"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-950 rounded-[2.5rem] shadow-2xl w-full max-w-sm p-8 sm:p-10 animate-in zoom-in-95 duration-300 border border-red-100 dark:border-red-900/20">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-6 border-4 border-white dark:border-zinc-900 shadow-xl">
                                <Trash2 className="h-8 w-8 text-red-500" />
                            </div>
                            <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Delete Hotel?</h3>
                            <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium leading-relaxed">
                                This will remove <span className="font-bold text-zinc-900 dark:text-zinc-200">{hotelToDelete?.name}</span> and unassign them from all events.
                            </p>
                        </div>

                        <form onSubmit={confirmDeletion} className="mt-8 space-y-6">
                            <div className="space-y-2 text-left">
                                <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">
                                    Admin Password
                                </label>
                                <Input
                                    type="password"
                                    placeholder="Enter password"
                                    value={adminPassword}
                                    onChange={(e) => setAdminPassword(e.target.value)}
                                    className="h-12 bg-zinc-50 dark:bg-white/5 border-none dark:border dark:border-white/10 rounded-2xl focus-visible:ring-2 focus-visible:ring-red-500/20 transition-all font-bold text-zinc-900 dark:text-zinc-50"
                                    autoFocus
                                />
                                {verificationError && (
                                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider mt-2 ml-1 animate-pulse">
                                        {verificationError}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-3">
                                <Button
                                    type="submit"
                                    className="bg-red-500 hover:bg-red-600 text-white h-14 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-red-500/20 active:scale-[0.98] transition-all"
                                    disabled={isVerifying || !adminPassword}
                                >
                                    {isVerifying ? <Loader2 size={18} className="animate-spin" /> : "Permanently Delete"}
                                </Button>
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="h-11 rounded-xl text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-widest text-[10px]"
                                >
                                    Keep Local
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Utility class concatenator
function cn(...classes: (string | undefined | null | boolean)[]) {
    return classes.filter(Boolean).join(" ");
}

export default withRoleAuth(HotelsPage, 'admin');
