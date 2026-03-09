"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
    Search,
    LogOut,
    CheckCircle2,
    XCircle,
    Loader2,
    User,
    Calendar,
    Bus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Types
type Guest = {
    id: string;
    name: string;
    check_in_status: string;
    seat_number?: string;
    assignment_label?: string;
    event_id: string;
    events?: {
        name: string;
        date: string;
    };
};

export default function CoordinatorDashboard() {
    const [guests, setGuests] = useState<Guest[]>([]);
    const [filteredGuests, setFilteredGuests] = useState<Guest[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [coordinator, setCoordinator] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        fetchCoordinatorAndGuests();
    }, []);

    useEffect(() => {
        const filtered = guests.filter((g) =>
            g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            g.seat_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            g.assignment_label?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredGuests(filtered);
    }, [searchQuery, guests]);

    const fetchCoordinatorAndGuests = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/coordinator/login");
                return;
            }

            // Fetch coordinator metadata
            const { data: coordData, error: coordError } = await supabase
                .from("coordinators")
                .select("*")
                .eq("user_id", user.id)
                .single();

            if (coordError || !coordData) throw new Error("Coordinator not found");
            setCoordinator(coordData);

            // Fetch guests assigned to this coordinator
            // We join with events to get the event date
            const { data: guestsData, error: guestsError } = await supabase
                .from("guests")
                .select(`
                    id, name, check_in_status, seat_number, assignment_label, event_id,
                    events ( name, date )
                `)
                .eq("coordinator_id", coordData.id)
                .order("name", { ascending: true });

            if (guestsError) throw guestsError;

            const formattedGuests = (guestsData || []).map((guest: any) => ({
                ...guest,
                events: Array.isArray(guest.events) ? guest.events[0] : guest.events
            }));

            setGuests(formattedGuests);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async (guestId: string, currentStatus: string) => {
        const newStatus = currentStatus === "arrived" ? "pending" : "arrived";
        try {
            const { error } = await supabase
                .from("guests")
                .update({ check_in_status: newStatus })
                .eq("id", guestId);

            if (error) throw error;

            setGuests(prev =>
                prev.map(g => g.id === guestId ? { ...g, check_in_status: newStatus } : g)
            );
        } catch (error) {
            console.error("Error updating check-in status:", error);
            alert("Failed to update status. Please try again.");
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/coordinator/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black gap-4">
                <Loader2 className="animate-spin text-blue-600" size={32} />
                <p className="text-zinc-500 font-medium">Loading Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f0f7ff] dark:bg-black p-4 sm:p-8 font-sans">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Dashboard Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl shadow-blue-500/5 overflow-hidden border border-white/20">

                    {/* Header */}
                    <div className="p-6 sm:p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-[#1e293b] dark:text-zinc-50">
                                Guest Check-in Dashboard
                            </h1>
                            <div className="flex items-center gap-2 mt-2 text-zinc-500 font-medium">
                                <Bus size={18} className="text-blue-500" />
                                <span>Assignment: {coordinator?.name}</span>
                                {guests.length > 0 && guests[0].assignment_label && (
                                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg text-xs ml-2">
                                        Ref: {guests[0].assignment_label}
                                    </span>
                                )}
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="rounded-xl px-4 py-2 text-blue-600 border-blue-100 hover:bg-blue-50 gap-2"
                            onClick={handleLogout}
                        >
                            <LogOut size={16} />
                            <span className="hidden sm:inline">Logout</span>
                        </Button>
                    </div>

                    {/* Search Bar */}
                    <div className="px-6 sm:px-8 py-6 bg-[#f8fbff] dark:bg-zinc-800/50">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                            <Input
                                placeholder="Search guest name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 h-14 rounded-2xl shadow-sm focus-visible:ring-blue-500/20 text-lg"
                            />
                        </div>
                    </div>

                    {/* Table Area */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white dark:bg-zinc-900 text-[#64748b] text-sm font-bold uppercase tracking-wider border-b border-zinc-50 dark:border-zinc-800">
                                    <th className="px-8 py-5">Guest Name</th>
                                    <th className="px-6 py-5">Event Date</th>
                                    <th className="px-6 py-5">Arrived</th>
                                    <th className="px-8 py-5 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                                {filteredGuests.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-20 text-center">
                                            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-300">
                                                <User size={32} />
                                            </div>
                                            <p className="text-zinc-500 font-medium">No guests found for check-in.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredGuests.map((guest) => (
                                        <tr key={guest.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-[#1e293b] dark:text-zinc-50 text-lg">{guest.name}</span>
                                                    {guest.seat_number && (
                                                        <span className="text-xs font-bold text-blue-500 bg-blue-50 w-fit px-2 py-0.5 rounded mt-1">
                                                            SEAT: {guest.seat_number}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex items-center gap-2 text-[#475569] dark:text-zinc-400">
                                                    <Calendar size={14} className="text-zinc-400" />
                                                    <span className="text-sm font-medium">
                                                        {guest.events?.date ? format(new Date(guest.events.date), "MMM d, yyyy") : "-"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                {guest.check_in_status === "arrived" ? (
                                                    <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 w-fit px-3 py-1.5 rounded-full text-sm">
                                                        <CheckCircle2 size={16} />
                                                        <span>Yes</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-orange-600 font-bold bg-orange-50 w-fit px-3 py-1.5 rounded-full text-sm">
                                                        <XCircle size={16} />
                                                        <span>No</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-8 py-6">
                                                <Button
                                                    onClick={() => handleCheckIn(guest.id, guest.check_in_status)}
                                                    className={cn(
                                                        "w-full rounded-2xl h-12 font-bold transition-all shadow-lg active:scale-95",
                                                        guest.check_in_status === "arrived"
                                                            ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
                                                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                                                    )}
                                                >
                                                    {guest.check_in_status === "arrived" ? (
                                                        <CheckCircle2 size={24} />
                                                    ) : (
                                                        "Check-In"
                                                    )}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Info */}
                <p className="text-center text-zinc-400 text-sm">
                    Logged in as <span className="font-semibold text-zinc-600">{coordinator?.username}</span>
                </p>
            </div>
        </div>
    );
}
