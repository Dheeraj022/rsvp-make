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
    Bus,
    RefreshCw,
    PlaneLanding,
    Menu,
    X
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
    departure_status?: string;
    seat_number?: string;
    assignment_label?: string;
    event_id: string;
    attending_count: number;
    attendees_data?: any[];
    departure_details?: any;
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
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [coordinator, setCoordinator] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"arrived" | "departure">("arrived");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchCoordinatorAndGuests();
    }, []);

    useEffect(() => {
        const query = searchQuery.toLowerCase();
        const filtered = guests.filter((g) => {
            const matchesPrimary =
                g.name.toLowerCase().includes(query) ||
                g.seat_number?.toLowerCase().includes(query) ||
                g.assignment_label?.toLowerCase().includes(query);

            const matchesSubMember = g.attendees_data?.some((member: any) =>
                member.name?.toLowerCase().includes(query)
            );

            return matchesPrimary || matchesSubMember;
        });
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

            // Fetch guests assigned to this coordinator or their assigned event
            let guestsQuery = supabase
                .from("guests")
                .select(`
                    id, name, check_in_status, seat_number, assignment_label, event_id, attending_count, attendees_data, departure_details,
                    events ( name, date )
                `);

            if (coordData.event_id) {
                // If the coordinator is assigned to an event, show all guests for that event
                guestsQuery = guestsQuery.eq("event_id", coordData.event_id);
            } else {
                // Otherwise only guests directly assigned to the coordinator
                guestsQuery = guestsQuery.eq("coordinator_id", coordData.id);
            }

            const { data: guestsData, error: guestsError } = await guestsQuery.order("name", { ascending: true });

            if (guestsError) throw guestsError;

            const formattedGuests = (guestsData || []).map((guest: any) => ({
                ...guest,
                events: Array.isArray(guest.events) ? guest.events[0] : guest.events
            }));

            setGuests(formattedGuests);
        } catch (error: any) {
            console.error("Error fetching data:", error.message);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchCoordinatorAndGuests();
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

    const handleDepartureCheckIn = async (guestId: string, currentStatus: string | undefined) => {
        const newStatus = currentStatus === "departed" ? "pending" : "departed";
        try {
            const { error } = await supabase
                .from("guests")
                .update({ departure_status: newStatus })
                .eq("id", guestId);

            if (error) throw error;

            setGuests(prev =>
                prev.map(g => g.id === guestId ? { ...g, departure_status: newStatus } : g)
            );
        } catch (error) {
            console.error("Error updating departure status:", error);
            alert("Failed to update status. Please try again.");
        }
    };

    const handleSubMemberCheckIn = async (guestId: string, subMemberIndex: number, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        try {
            const guest = guests.find(g => g.id === guestId);
            if (!guest || !guest.attendees_data) return;

            const updatedAttendees = [...guest.attendees_data];
            updatedAttendees[subMemberIndex] = {
                ...updatedAttendees[subMemberIndex],
                checked_in: newStatus
            };

            const { error } = await supabase
                .from("guests")
                .update({ attendees_data: updatedAttendees })
                .eq("id", guestId);

            if (error) throw error;

            setGuests(prev => prev.map(g =>
                g.id === guestId ? { ...g, attendees_data: updatedAttendees } : g
            ));
        } catch (error: any) {
            console.error("Error updating sub-member check-in:", error.message);
        }
    };

    const handleSubMemberDeparture = async (guestId: string, subMemberIndex: number, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        try {
            const guest = guests.find(g => g.id === guestId);
            if (!guest || !guest.attendees_data) return;

            const updatedAttendees = [...guest.attendees_data];
            updatedAttendees[subMemberIndex] = {
                ...updatedAttendees[subMemberIndex],
                departed: newStatus
            };

            const { error } = await supabase
                .from("guests")
                .update({ attendees_data: updatedAttendees })
                .eq("id", guestId);

            if (error) throw error;

            setGuests(prev => prev.map(g =>
                g.id === guestId ? { ...g, attendees_data: updatedAttendees } : g
            ));
        } catch (error: any) {
            console.error("Error updating sub-member departure:", error.message);
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
        <div className="min-h-screen bg-[#f1f5f9] dark:bg-black font-sans flex">

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-72 bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 flex-col sticky top-0 h-screen">
                <div className="p-8 border-b border-zinc-50 dark:border-zinc-800">
                    <h2 className="text-xl font-black text-blue-600 dark:text-blue-500 tracking-tighter uppercase">Coordinator</h2>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Management Portal</p>
                </div>

                <nav className="flex-1 p-6 space-y-2">
                    <button
                        onClick={() => setActiveTab("arrived")}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all text-sm",
                            activeTab === "arrived"
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 active:scale-95"
                                : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        )}
                    >
                        <CheckCircle2 size={20} />
                        <span>Arrived Guests</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("departure")}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all text-sm",
                            activeTab === "departure"
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 active:scale-95"
                                : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        )}
                    >
                        <PlaneLanding size={20} />
                        <span>Departure List</span>
                    </button>
                </nav>

                <div className="p-6 border-t border-zinc-50 dark:border-zinc-800 space-y-4">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                            <User size={20} />
                        </div>
                        <div className="flex flex-col truncate">
                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">{coordinator?.name}</span>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Coordinator</span>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        onClick={handleLogout}
                        className="w-full rounded-2xl border-zinc-200 text-zinc-600 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 gap-2 h-11"
                    >
                        <LogOut size={16} />
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Mobile Sidebar (Drawer) */}
            {isSidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-all animate-in fade-in">
                    <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-white dark:bg-zinc-900 shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/20">
                            <h2 className="font-black text-blue-600 tracking-tighter uppercase">Menu</h2>
                            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="rounded-full">
                                <X size={20} />
                            </Button>
                        </div>
                        <nav className="p-6 space-y-2 flex-1">
                            <button
                                onClick={() => { setActiveTab("arrived"); setIsSidebarOpen(false); }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold text-sm",
                                    activeTab === "arrived" ? "bg-blue-600 text-white shadow-lg" : "text-zinc-500 bg-zinc-50/50"
                                )}
                            >
                                <CheckCircle2 size={20} />
                                <span>Arrived Guests</span>
                            </button>
                            <button
                                onClick={() => { setActiveTab("departure"); setIsSidebarOpen(false); }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold text-sm",
                                    activeTab === "departure" ? "bg-blue-600 text-white shadow-lg" : "text-zinc-500 bg-zinc-50/50"
                                )}
                            >
                                <PlaneLanding size={20} />
                                <span>Departure List</span>
                            </button>
                        </nav>
                        <div className="p-6 border-t bg-zinc-50/50 dark:bg-zinc-800/20">
                            <Button
                                variant="outline"
                                onClick={handleLogout}
                                className="w-full rounded-2xl font-bold gap-2 h-12 border-zinc-200"
                            >
                                <LogOut size={18} />
                                Logout
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Areas */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">

                {/* Modern Mobile Header */}
                <header className="lg:hidden bg-white dark:bg-zinc-900 border-b p-4 flex items-center justify-between sticky top-0 z-40">
                    <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="rounded-xl bg-zinc-50 shadow-sm">
                        <Menu size={20} />
                    </Button>
                    <h2 className="font-black text-lg tracking-tighter uppercase text-zinc-900 dark:text-zinc-50">
                        {activeTab === "arrived" ? "Arrived" : "Departure"}
                    </h2>
                    <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing} className="rounded-xl shadow-sm h-10 w-10">
                        <RefreshCw size={18} className={cn(isRefreshing && "animate-spin")} />
                    </Button>
                </header>

                <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 space-y-8">
                    <div className="max-w-5xl mx-auto space-y-8">

                        {/* Content Header (Desktop) */}
                        <div className="hidden lg:flex items-center justify-between">
                            <div>
                                <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                                    {activeTab === "arrived" ? "Arrived Dashboard" : "Departure Dashboard"}
                                </h1>
                                <p className="text-zinc-500 font-medium mt-1">Manage guest schedules and status effectively.</p>
                            </div>
                            <Button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="rounded-2xl h-12 px-6 font-bold bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 transition-all shadow-sm gap-2"
                            >
                                <RefreshCw size={18} className={cn(isRefreshing && "animate-spin")} />
                                Refresh Status
                            </Button>
                        </div>

                        {/* Layout Content */}
                        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl shadow-zinc-200/50 dark:shadow-none border border-zinc-100 dark:border-zinc-800 overflow-hidden min-h-[600px] flex flex-col">

                            {/* Stats Ribbon */}
                            <div className="grid grid-cols-2 gap-px bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800">
                                {activeTab === "arrived" ? (
                                    <>
                                        <div className="bg-white dark:bg-zinc-900 p-8 sm:p-10 flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Expecting</span>
                                            <span className="text-4xl font-black text-blue-600">{guests.reduce((acc, g) => acc + (g.attending_count || 1), 0)}</span>
                                        </div>
                                        <div className="bg-white dark:bg-zinc-900 p-8 sm:p-10 flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Arrived Now</span>
                                            <span className="text-4xl font-black text-emerald-500">
                                                {guests.reduce((acc, g) => {
                                                    const mainArrived = g.check_in_status === "arrived" ? 1 : 0;
                                                    const subArrived = (g.attendees_data || []).filter((a: any) => a.checked_in).length;
                                                    return acc + mainArrived + subArrived;
                                                }, 0)}
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="bg-white dark:bg-zinc-900 p-8 sm:p-10 flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">To Depart</span>
                                            <span className="text-4xl font-black text-blue-600">
                                                {guests.reduce((acc, g) => acc + (g.attending_count || 1), 0)}
                                            </span>
                                        </div>
                                        <div className="bg-white dark:bg-zinc-900 p-8 sm:p-10 flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Already Departed</span>
                                            <span className="text-4xl font-black text-indigo-500">
                                                {guests.reduce((acc, g) => {
                                                    const mainDeparted = g.departure_status === "departed" ? 1 : 0;
                                                    const subDeparted = (g.attendees_data || []).filter((a: any) => a.departed).length;
                                                    return acc + mainDeparted + subDeparted;
                                                }, 0)}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Dashboard Search */}
                            <div className="p-6 sm:p-8 bg-zinc-50/50 dark:bg-black/10 border-b border-zinc-100 dark:border-zinc-800">
                                <div className="relative group max-w-2xl">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                    <Input
                                        placeholder={activeTab === "arrived" ? "Search for check-in..." : "Search for departure..."}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-14 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 h-16 rounded-[1.25rem] shadow-sm focus-visible:ring-blue-500/20 text-lg font-medium"
                                    />
                                </div>
                            </div>

                            {/* Dynamic Content View */}
                            <div className="flex-1 overflow-x-auto">
                                {activeTab === "arrived" ? (
                                    /* ARRIVED LIST */
                                    <div className="min-w-[800px] md:min-w-0">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 text-[10px] font-black uppercase tracking-widest border-b border-zinc-100">
                                                    <th className="px-10 py-5">Guest & Companions</th>
                                                    <th className="px-6 py-5">Event</th>
                                                    <th className="px-6 py-5 text-center">Current Status</th>
                                                    <th className="px-10 py-5 text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                                                {filteredGuests.length === 0 ? (
                                                    <tr><td colSpan={4} className="p-32 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs">No guests found</td></tr>
                                                ) : (
                                                    filteredGuests.map((guest) => (
                                                        <tr key={guest.id} className="group hover:bg-blue-50/30 transition-colors align-top">
                                                            <td className="px-10 py-8">
                                                                <div className="flex flex-col gap-6">
                                                                    <div>
                                                                        <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{guest.name}</h4>
                                                                        <div className="flex items-center gap-2 mt-1.5">
                                                                            <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-100/50 px-2 py-0.5 rounded">PRIMARY</span>
                                                                            {guest.seat_number && <span className="text-[10px] font-black text-zinc-400 uppercase">Seat: {guest.seat_number}</span>}
                                                                        </div>
                                                                    </div>
                                                                    {guest.attendees_data && guest.attendees_data.length > 0 && (
                                                                        <div className="grid grid-cols-1 gap-2 pl-4 border-l-2 border-zinc-100">
                                                                            {guest.attendees_data.map((member: any, i) => (
                                                                                <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800">
                                                                                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{member.name}</span>
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant={member.checked_in ? "default" : "outline"}
                                                                                        onClick={() => handleSubMemberCheckIn(guest.id, i, member.checked_in)}
                                                                                        className={cn("h-8 rounded-xl px-4 text-[10px] font-black", member.checked_in ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" : "")}
                                                                                    >
                                                                                        {member.checked_in ? "ARRIVED" : "CHECK-IN"}
                                                                                    </Button>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-10">
                                                                <div className="text-sm font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                                                                    <Calendar size={14} />
                                                                    {guest.events?.date ? format(new Date(guest.events.date), "MMM d") : "-"}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-10 text-center">
                                                                <div className={cn(
                                                                    "inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest",
                                                                    guest.check_in_status === "arrived" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                                                                )}>
                                                                    {guest.check_in_status === "arrived" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                                    {guest.check_in_status === "arrived" ? "Arrived" : "Pending"}
                                                                </div>
                                                            </td>
                                                            <td className="px-10 py-10">
                                                                <Button
                                                                    onClick={() => handleCheckIn(guest.id, guest.check_in_status)}
                                                                    className={cn(
                                                                        "w-full h-12 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                                                                        guest.check_in_status === "arrived" ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-blue-600 text-white shadow-blue-500/20"
                                                                    )}
                                                                >
                                                                    {guest.check_in_status === "arrived" ? "Main Arrived" : "Main Check-in"}
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    /* DEPARTURE LIST */
                                    <div className="min-w-[800px] md:min-w-0">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 text-[10px] font-black uppercase tracking-widest border-b border-zinc-100">
                                                    <th className="px-10 py-5">Guest Name</th>
                                                    <th className="px-6 py-5">Departure Details</th>
                                                    <th className="px-6 py-5 text-center">Status</th>
                                                    <th className="px-10 py-5 text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                                                {filteredGuests.length === 0 ? (
                                                    <tr><td colSpan={4} className="p-32 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs">No departure records</td></tr>
                                                ) : (
                                                    filteredGuests.map((guest) => (
                                                        <tr key={guest.id} className="group hover:bg-indigo-50/30 transition-colors align-top">
                                                            <td className="px-10 py-8">
                                                                <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{guest.name}</h4>
                                                                <span className="text-[10px] font-black uppercase text-indigo-400 mt-1">Guest</span>

                                                                {/* Companions for Departure */}
                                                                {guest.attendees_data && guest.attendees_data.length > 0 && (
                                                                    <div className="mt-4 pt-4 border-t border-zinc-50 space-y-3">
                                                                        {guest.attendees_data.map((member: any, index: number) => (
                                                                            <div key={index} className="flex items-center justify-between pl-4 border-l-2 border-zinc-100">
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{member.name}</span>
                                                                                    <span className="text-[9px] font-black uppercase text-zinc-400">Companion</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-4">
                                                                                    <div className={cn(
                                                                                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter",
                                                                                        member.departed ? "bg-indigo-50 text-indigo-600" : "bg-zinc-50 text-zinc-400"
                                                                                    )}>
                                                                                        {member.departed ? "Departed" : "Ready"}
                                                                                    </div>
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="ghost"
                                                                                        onClick={() => handleSubMemberDeparture(guest.id, index, member.departed)}
                                                                                        className={cn(
                                                                                            "h-7 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                                                                            member.departed ? "text-red-500 hover:text-red-600 hover:bg-red-50" : "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                                                        )}
                                                                                    >
                                                                                        {member.departed ? "Undo" : "Mark"}
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-8">
                                                                <div className="space-y-1.5">
                                                                    <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                                                                        <Calendar size={14} className="text-zinc-400" />
                                                                        {guest.departure_details?.date || "No date set"}
                                                                    </div>
                                                                    <div className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-2 italic">
                                                                        <Bus size={12} />
                                                                        {guest.departure_details?.transport || "Not specified"}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-8 text-center">
                                                                <div className={cn(
                                                                    "inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                                                                    guest.departure_status === "departed" ? "bg-indigo-50 text-indigo-600 scale-105" : "bg-zinc-50 text-zinc-400"
                                                                )}>
                                                                    {guest.departure_status === "departed" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                                    {guest.departure_status === "departed" ? "Departed" : "Ready"}
                                                                </div>
                                                            </td>
                                                            <td className="px-10 py-8 text-center">
                                                                <Button
                                                                    onClick={() => handleDepartureCheckIn(guest.id, guest.departure_status)}
                                                                    className={cn(
                                                                        "w-full h-12 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                                                                        guest.departure_status === "departed" ? "bg-indigo-600 text-white shadow-indigo-600/20" : "bg-white text-zinc-900 border-2 border-zinc-100 hover:border-indigo-100 shadow-sm"
                                                                    )}
                                                                >
                                                                    {guest.departure_status === "departed" ? "Undo Departure" : "Mark Departed"}
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
