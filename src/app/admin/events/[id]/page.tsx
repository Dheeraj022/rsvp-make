"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import withAuth from "@/components/admin/withAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Upload, Download, Trash2, Search, UserPlus, Eye } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import Papa from "papaparse";
import GuestDetailsModal from "@/components/admin/GuestDetailsModal";

type Event = {
    id: string;
    name: string;
    date: string;
    location: string;
    slug: string;
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

function EventDetails() {
    const params = useParams();


    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [event, setEvent] = useState<Event | null>(null);
    const [guests, setGuests] = useState<Guest[]>([]);
    const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const eventId = params.id as string;

    useEffect(() => {
        fetchEventData();
    }, [eventId]);

    const fetchEventData = async () => {
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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const parsedGuests = results.data.map((row: any) => {
                        // Helper to find value case-insensitively
                        const getValue = (keys: string[]) => {
                            const rowKeys = Object.keys(row);
                            for (const key of rowKeys) {
                                if (keys.includes(key.trim().toLowerCase())) {
                                    return row[key];
                                }
                            }
                            return null;
                        };

                        const name = getValue(["name", "full name", "guest name"]);
                        const email = getValue(["email", "e-mail", "mail"]);
                        const phone = getValue(["phone", "mobile", "contact", "cell"]);
                        const guests = getValue(["guests", "guest", "allowed", "count", "number of guests"]);

                        return {
                            event_id: eventId,
                            name: name,
                            email: email,
                            phone: phone,
                            allowed_guests: parseInt(guests || "1"),
                            status: "pending",
                        };
                    }).filter((g: any) => g.name && g.name.trim() !== "");

                    if (parsedGuests.length === 0) {
                        alert("No valid guests found in CSV. Please ensure there is a 'Name' column.");
                        return;
                    }

                    const { error } = await supabase.from("guests").insert(parsedGuests);
                    if (error) throw error;

                    alert(`Successfully imported ${parsedGuests.length} guests.`);
                    fetchEventData(); // Refresh list
                } catch (error: any) {
                    alert("Error importing guests: " + error.message);
                } finally {
                    setUploading(false);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                }
            },
            error: (error) => {
                alert("CSV Parse Error: " + error.message);
                setUploading(false);
            }
        });
    };

    const handleDeleteGuest = async (guestId: string) => {
        if (!confirm("Are you sure you want to remove this guest?")) return;

        try {
            const { error } = await supabase.from("guests").delete().eq("id", guestId);
            if (error) throw error;
            setGuests(guests.filter(g => g.id !== guestId));
        } catch (error: any) {
            alert("Error deleting guest: " + error.message);
        }
    };

    const handleExport = () => {
        const csv = Papa.unparse(guests.map(g => ({
            Name: g.name,
            Email: g.email,
            Phone: g.phone,
            "Allowed Guests": g.allowed_guests,
            Status: g.status,
            "Attending Count": g.attending_count
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
                        <Link href="/admin/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 flex items-center mb-2">
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
                        <div className="flex items-center gap-2 mr-2">
                            <Button
                                variant="outline"
                                className="gap-2"
                                onClick={() => {
                                    const url = `${window.location.origin}/r/${event?.slug}`;
                                    navigator.clipboard.writeText(url);
                                    alert("Invite link copied to clipboard!");
                                }}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="lucide lucide-link"
                                >
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                </svg>
                                Copy Invite Link
                            </Button>
                        </div>
                        <Button variant="outline" onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" /> Export CSV
                        </Button>
                        {/* Future: Edit Event Button */}
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

                {/* Guest Management */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <h2 className="text-lg font-semibold">Guest List</h2>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                                <Input
                                    placeholder="Search guests..."
                                    className="pl-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                />
                                <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                    Import CSV
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Name</th>
                                    <th className="px-6 py-3 font-medium">Contact</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                    <th className="px-6 py-3 font-medium">Guests</th>
                                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {filteredGuests.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                                            No guests found. Import a CSV to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredGuests.map((guest) => (
                                        <tr key={guest.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{guest.name}</td>
                                            <td className="px-6 py-4 text-zinc-500">{guest.email || guest.phone || "-"}</td>
                                            <td className="px-6 py-4">
                                                {guest.status === 'accepted' && guest.attendees_data && guest.attendees_data.some((a: any) => a.id_front || a.id_back) ? (
                                                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                        Docs Uploaded
                                                    </span>
                                                ) : (
                                                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize 
                                                ${guest.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                            guest.status === 'declined' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                                'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                                                        {guest.status}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-zinc-500">
                                                {(() => {
                                                    const docCount = guest.attendees_data?.filter((a: any) => a.id_front || a.id_back).length || 0;
                                                    return `${docCount} Docs Uploaded`;
                                                })()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-blue-600" onClick={() => setSelectedGuest(guest)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-600" onClick={() => handleDeleteGuest(guest.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <GuestDetailsModal guest={selectedGuest} onClose={() => setSelectedGuest(null)} />
        </div>
    );
}

export default withAuth(EventDetails);
