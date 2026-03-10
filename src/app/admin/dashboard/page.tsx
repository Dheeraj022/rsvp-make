"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import withAuth from "@/components/admin/withAuth";
import { Button } from "@/components/ui/button";
import {
    Plus,
    Calendar,
    Users,
    MapPin,
    Hotel,
    UserCog,
    Search,
    ChevronRight,
    MoreVertical,
    ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

// Types
type Event = {
    id: string;
    name: string;
    date: string;
    location: string;
    slug: string;
    description: string;
    guest_count?: number;
    hotel_count?: number;
};

type Stats = {
    totalEvents: number;
    upcomingEvents: number;
    totalHotels: number;
    totalGuests: number;
    coordinators: number;
};

function AdminDashboard() {
    const [events, setEvents] = useState<Event[]>([]);
    const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stats>({
        totalEvents: 0,
        upcomingEvents: 0,
        totalHotels: 0,
        totalGuests: 0,
        coordinators: 0,
    });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    useEffect(() => {
        const filtered = events.filter((e) =>
            e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.location.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredEvents(filtered);
    }, [searchQuery, events]);

    const fetchDashboardData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: eventsData, error: eventsError } = await supabase
                .from("events")
                .select("*")
                .eq("admin_id", user.id)
                .order("date", { ascending: true });

            if (eventsError) throw eventsError;

            const eventsWithStats = await Promise.all((eventsData || []).map(async (event) => {
                const { count: guestCount } = await supabase
                    .from("guests")
                    .select("*", { count: 'exact', head: true })
                    .eq("event_id", event.id);

                return {
                    ...event,
                    guest_count: guestCount || 0,
                    hotel_count: 0,
                };
            }));

            setEvents(eventsWithStats);

            const { count: hotelCount } = await supabase
                .from("hotels")
                .select("*", { count: 'exact', head: true })
                .eq("admin_id", user.id);

            const { count: coordCount } = await supabase
                .from("coordinators")
                .select("*", { count: 'exact', head: true })
                .eq("admin_id", user.id);

            const totalGuests = eventsWithStats.reduce((sum, e) => sum + (e.guest_count || 0), 0);
            const upcoming = eventsWithStats.filter(e => new Date(e.date) >= new Date()).length;

            setStats({
                totalEvents: eventsWithStats.length,
                upcomingEvents: upcoming,
                totalHotels: hotelCount || 0,
                totalGuests: totalGuests,
                coordinators: coordCount || 0,
            });

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        { label: "Active Events", value: stats.totalEvents, icon: Calendar, color: "text-blue-600", bg: "bg-blue-600/10" },
        { label: "Guest RSVPs", value: stats.totalGuests, icon: Users, color: "text-purple-600", bg: "bg-purple-600/10" },
        { label: "Hotel Partners", value: stats.totalHotels, icon: Hotel, color: "text-emerald-600", bg: "bg-emerald-600/10" },
        { label: "Coordinators", value: stats.coordinators, icon: UserCog, color: "text-orange-600", bg: "bg-orange-600/10" },
    ];

    return (
        <div className="space-y-12 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-black text-zinc-900 tracking-tight">Overview</h1>
                    <p className="text-zinc-500 font-medium mt-2">Welcome back. Here's what's happening today.</p>
                </div>
                <Link href="/admin/events/new">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 h-12 shadow-lg shadow-blue-500/20 gap-2 font-bold transition-all hover:scale-105 active:scale-95">
                        <Plus size={20} />
                        New Event
                    </Button>
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, i) => (
                    <div
                        key={i}
                        className="p-6 rounded-[2rem] border border-white bg-white/40 backdrop-blur-sm shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500 group relative overflow-hidden"
                    >
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-inner transition-transform group-hover:scale-110 duration-500", stat.bg, stat.color)}>
                            <stat.icon size={28} />
                        </div>
                        <div className="relative z-10">
                            <span className="text-4xl font-black text-zinc-900 tracking-tighter">{stat.value}</span>
                            <h4 className="text-xs font-bold text-zinc-500 mt-2 uppercase tracking-widest leading-none">{stat.label}</h4>
                        </div>
                        {/* Mesh Accent */}
                        <div className={cn("absolute -bottom-10 -right-10 w-32 h-32 rounded-full opacity-[0.05] blur-3xl", stat.bg)} />
                    </div>
                ))}
            </div>

            {/* Content Table Area */}
            <div className="rounded-[2.5rem] border border-white/60 bg-white/40 backdrop-blur-md shadow-2xl shadow-zinc-200/50 overflow-hidden">
                <div className="p-8 md:p-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Manage Events</h3>
                        <p className="text-sm text-zinc-500 font-medium">Coordinate and track guests across all active events.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                        <div className="relative group min-w-[300px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                            <Input
                                placeholder="Search by name or location..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 bg-white/50 border-white/80 rounded-2xl h-14 focus-visible:ring-4 focus-visible:ring-blue-500/10 transition-all font-medium"
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="p-24 text-center flex flex-col items-center gap-6">
                        <div className="w-12 h-12 border-4 border-zinc-100 border-t-blue-600 rounded-full animate-spin" />
                        <span className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Loading Secure Data</span>
                    </div>
                ) : filteredEvents.length === 0 ? (
                    <div className="p-24 text-center">
                        <div className="w-24 h-24 bg-zinc-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-zinc-200 shadow-inner">
                            <Calendar size={48} />
                        </div>
                        <h4 className="text-2xl font-black text-zinc-900 tracking-tight">No Events Found</h4>
                        <p className="text-zinc-500 mt-3 max-w-sm mx-auto font-medium leading-relaxed">Your event list is currently empty. Start by creating a new experience for your guests.</p>
                        <Link href="/admin/events/new" className="mt-10 inline-block">
                            <Button className="rounded-2xl bg-zinc-900 hover:bg-black text-white px-10 h-14 font-bold shadow-xl shadow-zinc-900/20 transition-all hover:scale-105 active:scale-95">
                                Create New Event
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-50/50 text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] border-y border-zinc-100/50">
                                    <th className="px-6 md:px-10 py-6">Identity</th>
                                    <th className="hidden md:table-cell px-6 py-6 font-black">Timeline</th>
                                    <th className="hidden lg:table-cell px-6 py-6 font-black">Destination</th>
                                    <th className="hidden sm:table-cell px-6 py-6 font-black">Guest List</th>
                                    <th className="px-6 md:px-10 py-6 text-right font-black">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100/50">
                                {filteredEvents.map((event) => (
                                    <tr key={event.id} className="group hover:bg-blue-50/30 transition-all duration-300">
                                        <td className="px-6 md:px-10 py-8">
                                            <div className="flex items-center gap-3 md:gap-5">
                                                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white shadow-sm flex flex-col items-center justify-center border border-zinc-100 group-hover:border-blue-200 group-hover:shadow-blue-500/10 transition-all duration-300 shrink-0">
                                                    <span className="text-[9px] md:text-[10px] uppercase font-black text-zinc-400 group-hover:text-blue-400 transition-colors uppercase tracking-widest">{format(new Date(event.date), "MMM")}</span>
                                                    <span className="text-lg md:text-xl font-black text-zinc-900 group-hover:text-blue-600 transition-colors leading-none mt-1">{format(new Date(event.date), "dd")}</span>
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-base md:text-lg font-bold text-zinc-900 truncate group-hover:text-blue-600 transition-colors">{event.name}</span>
                                                    <span className="text-[10px] md:text-xs font-bold text-zinc-400 mt-1 uppercase tracking-wider">
                                                        {format(new Date(event.date), "MMM d, yyyy")}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden md:table-cell px-6 py-8">
                                            <div className="text-sm font-bold text-zinc-700">
                                                {format(new Date(event.date), "EEE, MMM d, yyyy")}
                                            </div>
                                        </td>
                                        <td className="hidden lg:table-cell px-6 py-8">
                                            <div className="flex items-center gap-2 text-zinc-500 group-hover:text-zinc-700 transition-colors">
                                                <MapPin size={16} className="text-zinc-300 group-hover:text-blue-400 transition-colors" />
                                                <span className="text-sm font-semibold">{event.location}</span>
                                            </div>
                                        </td>
                                        <td className="hidden sm:table-cell px-6 py-8">
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 group-hover:bg-blue-100 text-zinc-600 group-hover:text-blue-700 transition-all duration-300">
                                                <Users size={14} className="opacity-70" />
                                                <span className="text-[13px] font-black">{event.guest_count}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 md:px-10 py-8 text-right">
                                            <div className="flex items-center justify-end gap-3 transition-transform duration-300">
                                                <Link href={`/admin/events/${event.id}`}>
                                                    <Button size="sm" className="bg-zinc-900 text-white hover:bg-black rounded-xl px-4 md:px-5 h-10 text-[10px] md:text-xs font-black gap-2 border-none shadow-lg shadow-zinc-900/10 hover:shadow-zinc-900/20 transition-all">
                                                        <span className="hidden xs:inline">Manage</span>
                                                        <ArrowUpRight size={14} />
                                                    </Button>
                                                </Link>
                                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-zinc-300">
                                                    <MoreVertical size={18} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default withAuth(AdminDashboard);
