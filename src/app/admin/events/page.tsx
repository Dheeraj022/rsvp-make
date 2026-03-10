"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import withAuth from "@/components/admin/withAuth";
import { Button } from "@/components/ui/button";
import {
    Plus,
    Calendar,
    Users,
    MapPin,
    Hotel,
    Search,
    ChevronRight,
    MoreVertical,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
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

function EventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
    }, []);

    useEffect(() => {
        const filtered = events.filter((e) =>
            e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.location.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredEvents(filtered);
    }, [searchQuery, events]);

    const fetchEvents = async () => {
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
                };
            }));

            setEvents(eventsWithStats);
        } catch (error) {
            console.error("Error fetching events:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Events Management</h2>
                    <p className="text-zinc-500 mt-1">View and manage all your event details and guest lists.</p>
                </div>
                <Link href="/admin/events/new">
                    <Button className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-full px-6 py-6 shadow-lg shadow-zinc-200 transition-all hover:scale-105 active:scale-95">
                        <Plus className="mr-2" size={20} />
                        Create New Event
                    </Button>
                </Link>
            </div>

            <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-4 md:p-8 border-b border-zinc-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="relative group flex-1 w-full md:max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <Input
                            placeholder="Search events by name or location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 bg-zinc-50 border-none rounded-2xl h-12 focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 text-center flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-zinc-200 border-t-blue-600 rounded-full animate-spin" />
                        <span className="text-zinc-500 font-medium">Loading events...</span>
                    </div>
                ) : filteredEvents.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-300">
                            <Calendar size={40} />
                        </div>
                        <h4 className="text-lg font-semibold text-zinc-900">No events found</h4>
                        <p className="text-zinc-500 mt-2 max-w-sm mx-auto">Try adjusting your search or create a new event.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-zinc-50/50 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                                    <th className="px-4 md:px-8 py-5">Event</th>
                                    <th className="hidden md:table-cell px-6 py-5">Date</th>
                                    <th className="hidden lg:table-cell px-6 py-5">Location</th>
                                    <th className="hidden sm:table-cell px-6 py-5">Guests</th>
                                    <th className="px-4 md:px-8 py-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {filteredEvents.map((event) => (
                                    <tr key={event.id} className="group hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-4 md:px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-zinc-100 flex flex-col items-center justify-center border border-zinc-200 text-zinc-600 group-hover:bg-blue-50 group-hover:border-blue-100 group-hover:text-blue-600 transition-colors shrink-0">
                                                    <span className="text-[9px] uppercase font-bold">{format(new Date(event.date), "MMM")}</span>
                                                    <span className="text-sm md:text-base font-bold leading-none">{format(new Date(event.date), "dd")}</span>
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-zinc-900 truncate group-hover:text-blue-600 transition-colors text-sm md:text-base">{event.name}</span>
                                                    <span className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                                                        {format(new Date(event.date), "MMM d, yyyy")}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden md:table-cell px-6 py-6 text-sm text-zinc-600 font-medium">
                                            {format(new Date(event.date), "MMMM d, yyyy")}
                                        </td>
                                        <td className="hidden lg:table-cell px-6 py-6 text-sm text-zinc-600">
                                            <div className="flex items-center gap-2">
                                                <MapPin size={16} className="text-zinc-400" />
                                                <span>{event.location}</span>
                                            </div>
                                        </td>
                                        <td className="hidden sm:table-cell px-6 py-6 font-medium">
                                            <div className="flex items-center gap-2">
                                                <Users size={16} className="text-zinc-400" />
                                                <span className="text-sm text-zinc-700">{event.guest_count}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/admin/events/${event.id}`}>
                                                    <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl px-4 h-9 text-[10px] md:text-xs font-semibold gap-2 border-none">
                                                        <span className="hidden xs:inline">Details</span>
                                                        <ChevronRight size={14} />
                                                    </Button>
                                                </Link>
                                                <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl text-zinc-400">
                                                    <MoreVertical size={16} />
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
        </div >
    );
}

export default withAuth(EventsPage);
