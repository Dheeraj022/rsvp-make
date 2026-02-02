"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import withHotelAuth from "@/components/hotel/withHotelAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Download, Eye, Search } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import Papa from "papaparse";
import GuestDetailsModal from "@/components/admin/GuestDetailsModal";

type Event = {
    id: string;
    name: string;
    date: string;
    location: string;
};

type Guest = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    allowed_guests: number;
    status: "pending" | "accepted" | "declined";
    attending_count: number;
    attendees_data?: any[];
};

function HotelEventDetails() {
    const params = useParams();
    const eventId = params.id as string;

    const [event, setEvent] = useState<Event | null>(null);
    const [guests, setGuests] = useState<Guest[]>([]);
    const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchData();
    }, [eventId]);

    const fetchData = async () => {
        try {
            // Fetch Event
            const { data: eventData, error: eventError } = await supabase
                .from("events")
                .select("*")
                .eq("id", eventId)
                .single();

            if (eventError) throw eventError;
            setEvent(eventData);

            // Fetch Guests
            const { data: guestData, error: guestError } = await supabase
                .from("guests")
                .select("*")
                .eq("event_id", eventId)
                .order("name", { ascending: true });

            if (guestError) throw guestError;
            setGuests(guestData || []);

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const csv = Papa.unparse(guests.map(g => ({
            Name: g.name,
            Email: g.email,
            Phone: g.phone,
            "Allowed Guests": g.allowed_guests,
            Status: g.status,
            "Attending Count": g.attending_count,
            "Docs Uploaded": g.attendees_data?.filter((a: any) => a.id_front || a.id_back).length || 0
        })));

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${event?.name || "guests"}_export.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredGuests = guests.filter(g =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const stats = {
        total: guests.length,
        accepted: guests.filter(g => g.status === "accepted").length,
        declined: guests.filter(g => g.status === "declined").length,
        pending: guests.filter(g => g.status === "pending").length,
    };

    if (loading) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black p-6">
            <div className="mx-auto max-w-6xl space-y-8">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <Link href="/hotel/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 flex items-center mb-2">
                            <ArrowLeft className="mr-1 h-4 w-4" />
                            Back to Dashboard
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                            {event?.name}
                        </h1>
                        <p className="text-zinc-500 dark:text-zinc-400">
                            {event && format(new Date(event.date), "MMMM d, yyyy • h:mm a")} | {event?.location}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" /> Export CSV
                        </Button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: "Total Invited", value: stats.total, color: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300" },
                        { label: "Accepted", value: stats.accepted, color: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300" },
                        { label: "Declined", value: stats.declined, color: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300" },
                        { label: "Pending", value: stats.pending, color: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300" },
                    ].map((stat) => (
                        <div key={stat.label} className={`p-4 rounded-xl ${stat.color} border border-transparent`}>
                            <p className="text-sm font-medium opacity-80">{stat.label}</p>
                            <p className="text-3xl font-bold">{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Guest List */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <h2 className="text-lg font-semibold">Guest List</h2>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                            <Input
                                placeholder="Search guests..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Name</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                    <th className="px-6 py-3 font-medium">Docs Uploaded</th>
                                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {filteredGuests.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                                            No guests found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredGuests.map((guest) => {
                                        const docCount = guest.attendees_data?.filter((a: any) => a.id_front || a.id_back).length || 0;
                                        return (
                                            <tr key={guest.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{guest.name}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize 
                                                ${guest.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                            guest.status === 'declined' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                                'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                                                        {guest.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-zinc-500">
                                                    {docCount > 0 && (
                                                        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                            {docCount} Docs
                                                        </span>
                                                    )}
                                                    {docCount === 0 && <span className="text-zinc-400">-</span>}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => setSelectedGuest(guest)}>
                                                        <Eye className="h-4 w-4 mr-1" /> View & Download
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <GuestDetailsModal
                guest={selectedGuest}
                onClose={() => setSelectedGuest(null)}
                readonly={true}
                eventName={event?.name}
                eventDate={event?.date}
            />
        </div>
    );
}

export default withHotelAuth(HotelEventDetails);
