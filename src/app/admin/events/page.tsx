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
    Download,
    Trash2,
    Copy,
    Check
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import Papa from "papaparse";
import { saveAs } from "file-saver";

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
    const [actionEvent, setActionEvent] = useState<Event | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

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

    const handleDeleteEvent = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? This will also remove all guest RSVPs for this event.`)) return;

        try {
            const { error } = await supabase.from("events").delete().eq("id", id);
            if (error) throw error;
            setEvents(prev => prev.filter(e => e.id !== id));
            alert("Event deleted successfully.");
        } catch (error: any) {
            console.error("Error deleting event:", error);
            alert("Failed to delete event: " + error.message);
        }
    };

    const handleExportCSV = async (id: string, name: string) => {
        try {
            const { data, error } = await supabase
                .from("guests")
                .select("*")
                .eq("event_id", id);

            if (error) throw error;
            if (!data || data.length === 0) {
                alert("No guests to export for this event.");
                return;
            }

            const csv = Papa.unparse(data);
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            saveAs(blob, `${name.replace(/\s+/g, "_")}_guests.csv`);
        } catch (error: any) {
            console.error("Error exporting CSV:", error);
            alert("Failed to export guests.");
        }
    };

    const handleCopyLink = async (eventId: string, slug: string) => {
        const url = `${window.location.origin}/r/${slug}`;
        await navigator.clipboard.writeText(url);
        setCopiedId(eventId);
        setTimeout(() => setCopiedId(null), 2000);
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
                                                    <Button size="sm" className="bg-zinc-900 text-white hover:bg-black rounded-xl px-4 md:px-5 h-9 text-[10px] md:text-xs font-black gap-2 border-none">
                                                        <span className="hidden xs:inline">Details</span>
                                                        <ChevronRight size={14} />
                                                    </Button>
                                                </Link>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-9 w-9 rounded-xl text-zinc-400 hover:bg-blue-600 hover:text-white border border-zinc-100 transition-all shadow-sm active:scale-95"
                                                    onClick={() => setActionEvent(event)}
                                                >
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

            {/* Action Popup Modal */}
            {actionEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setActionEvent(null)} />
                    <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl relative animate-in zoom-in slide-in-from-bottom-8 duration-300">
                        <div className="p-8 space-y-6">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-zinc-900">{actionEvent.name}</h3>
                                <p className="text-sm font-medium text-zinc-500 uppercase tracking-widest">{format(new Date(actionEvent.date), "dd MMM yyyy")}</p>
                            </div>

                            <div className="grid gap-3">
                                <button
                                    onClick={() => {
                                        handleCopyLink(actionEvent.id, actionEvent.slug);
                                        setTimeout(() => setActionEvent(null), 1000);
                                    }}
                                    className="flex items-center gap-4 p-5 rounded-2xl bg-zinc-50 hover:bg-blue-50 text-zinc-600 hover:text-blue-600 transition-all group w-full text-left"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        {copiedId === actionEvent.id ? <Check className="text-emerald-500" size={20} /> : <Copy size={20} />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black">{copiedId === actionEvent.id ? "Copied!" : "Copy Invite Link"}</span>
                                        <span className="text-[10px] font-bold opacity-60">Share URL with guests</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => {
                                        handleExportCSV(actionEvent.id, actionEvent.name);
                                        setActionEvent(null);
                                    }}
                                    className="flex items-center gap-4 p-5 rounded-2xl bg-zinc-50 hover:bg-emerald-50 text-zinc-600 hover:text-emerald-600 transition-all group w-full text-left"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <Download size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black">Export Guest CSV</span>
                                        <span className="text-[10px] font-bold opacity-60">Download attendee list</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => {
                                        handleDeleteEvent(actionEvent.id, actionEvent.name);
                                        setActionEvent(null);
                                    }}
                                    className="flex items-center gap-4 p-5 rounded-2xl bg-red-50 hover:bg-red-500 text-red-600 hover:text-white transition-all group w-full text-left"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-white group-hover:bg-red-400 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <Trash2 size={20} className="group-hover:text-white" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-red-600 group-hover:text-white">Delete Event</span>
                                        <span className="text-[10px] font-bold opacity-60 group-hover:text-white/80">Permanent removal</span>
                                    </div>
                                </button>
                            </div>

                            <Button 
                                variant="ghost" 
                                className="w-full h-14 rounded-2xl text-zinc-900 bg-zinc-100 font-black hover:bg-blue-600 hover:text-white transition-all transform active:scale-95 shadow-sm"
                                onClick={() => setActionEvent(null)}
                            >
                                Close Actions
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}

export default withAuth(EventsPage);
