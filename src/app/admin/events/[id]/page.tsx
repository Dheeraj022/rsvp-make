"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import withAuth from "@/components/auth/withAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
    Loader2, 
    ArrowLeft, 
    Upload, 
    Download, 
    Trash2, 
    Search, 
    UserPlus, 
    Eye,
    Copy,
    Hotel,
    MapPin,
    Users
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Papa from "papaparse";
import GuestDetailsModal from "@/components/admin/GuestDetailsModal";

type Event = {
    id: string;
    name: string;
    date: string;
    location: string;
    slug: string;
    assigned_hotel_email?: string;
    assigned_hotel_name?: string;
    drop_locations?: string[];
};

type Guest = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    arrival_location: string | null;
    arrival_date: string | null;
    departure_location: string | null;
    departure_date: string | null;
    allowed_guests: number;
    status: "pending" | "accepted" | "declined";
    attending_count: number;
    attendees_data?: any[];
    departure_details?: {
        applicable?: boolean;
        arrival?: {
            date?: string;
            time?: string;
            travelers?: Array<{
                name: string;
                mode_of_travel: string;
                transport_number?: string;
                station_airport?: string;
                contact_number?: string;
                number_of_pax?: string;
                number_of_bags?: string;
                drop_location?: string;
                number_of_vehicles?: string;
            }>;
        };
        departure?: {
            date?: string;
            time?: string;
            travelers?: Array<{
                name: string;
                mode_of_travel: string;
                transport_number?: string;
                station_airport?: string;
                contact_number?: string;
                number_of_pax?: string;
                number_of_bags?: string;
                drop_location?: string;
                number_of_vehicles?: string;
            }>;
        };
        message?: string;
        // Legacy fields for backward compatibility
        arrival_date?: string;
        arrival_time?: string;
        arrival_location?: string;
        arrival_mode?: string;
        departure_date?: string;
        departure_time?: string;
        departure_location?: string;
        departure_mode?: string;
        travelers?: any[];
    };
    coordinator_id?: string | null;
    parent_id?: string | null;
};

function EventDetails() {
    const params = useParams();


    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [event, setEvent] = useState<Event | null>(null);
    const [guests, setGuests] = useState<Guest[]>([]);
    const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
    const [coordinators, setCoordinators] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"guests" | "arrival" | "departure">("guests");
    const [selectedPrimaryGuestId, setSelectedPrimaryGuestId] = useState<string | null>(null);

    const [showHotelModal, setShowHotelModal] = useState(false);
    const [hotelEmail, setHotelEmail] = useState("");
    const [hotelName, setHotelName] = useState("");
    const [assignLoading, setAssignLoading] = useState(false);

    // Drop Locations Management State
    const [showDropLocationsModal, setShowDropLocationsModal] = useState(false);
    const [dropLocationsText, setDropLocationsText] = useState("");
    const [dropLocationsLoading, setDropLocationsLoading] = useState(false);

    // Add Guest Modal State
    const [showAddGuestModal, setShowAddGuestModal] = useState(false);
    const [newGuestName, setNewGuestName] = useState("");
    const [newGuestEmail, setNewGuestEmail] = useState("");
    const [newGuestPhone, setNewGuestPhone] = useState("");
    const [addGuestLoading, setAddGuestLoading] = useState(false);

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
            setHotelEmail(eventData.assigned_hotel_email || "");
            setHotelName(eventData.assigned_hotel_name || "");
            setDropLocationsText(eventData.drop_locations?.join(", ") || "");

            // Fetch Guests
            const { data: guestData, error: guestError } = await supabase
                .from("guests")
                .select("*")
                .eq("event_id", eventId)
                .order("name", { ascending: true });

            if (guestError) throw guestError;
            setGuests(guestData || []);

            // Fetch Coordinators for attribution
            const { data: coordData } = await supabase
                .from("coordinators")
                .select("id, name");
            
            if (coordData) {
                const coordMap = coordData.reduce((acc: Record<string, string>, curr: any) => {
                    acc[curr.id] = curr.name;
                    return acc;
                }, {});
                setCoordinators(coordMap);
            }

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignHotel = async () => {
        setAssignLoading(true);
        try {
            const { error } = await supabase
                .from("events")
                .update({
                    assigned_hotel_email: hotelEmail,
                    assigned_hotel_name: hotelName
                })
                .eq("id", eventId);

            if (error) throw error;

            setEvent(prev => prev ? ({ ...prev, assigned_hotel_email: hotelEmail, assigned_hotel_name: hotelName }) : null);
            setShowHotelModal(false);
            alert("Hotel assigned successfully.");
        } catch (error: any) {
            alert("Error assigning hotel: " + error.message);
        } finally {
            setAssignLoading(false);
        }
    };

    const handleUpdateDropLocations = async () => {
        setDropLocationsLoading(true);
        try {
            const locations = dropLocationsText.split(',').map(s => s.trim()).filter(s => s !== "");
            const { error } = await supabase
                .from("events")
                .update({ drop_locations: locations })
                .eq("id", eventId);

            if (error) throw error;

            setEvent(prev => prev ? ({ ...prev, drop_locations: locations }) : null);
            setShowDropLocationsModal(false);
            alert("Drop locations updated successfully.");
        } catch (error: any) {
            alert("Error updating drop locations: " + error.message);
        } finally {
            setDropLocationsLoading(false);
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

    const handleAddGuest = async () => {
        if (!newGuestName.trim()) {
            alert("Please enter a guest name.");
            return;
        }

        setAddGuestLoading(true);
        try {
            const { error } = await supabase.from("guests").insert([{
                event_id: eventId,
                name: newGuestName,
                email: newGuestEmail || null,
                phone: newGuestPhone || null,
                parent_id: selectedPrimaryGuestId,
                allowed_guests: 1,
                status: "pending",
            }]);

            if (error) throw error;

            alert("Guest added successfully!");
            setShowAddGuestModal(false);
            setNewGuestName("");
            setNewGuestEmail("");
            setNewGuestPhone("");
            setSelectedPrimaryGuestId(null);
            fetchEventData(); // Refresh list
        } catch (error: any) {
            alert("Error adding guest: " + error.message);
        } finally {
            setAddGuestLoading(false);
        }
    };

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Guest delete state
    const [guestToDelete, setGuestToDelete] = useState<string | null>(null);
    const [showGuestDeleteModal, setShowGuestDeleteModal] = useState(false);
    const [guestDeletePassword, setGuestDeletePassword] = useState("");
    const [guestDeleteLoading, setGuestDeleteLoading] = useState(false);

    const handleDeleteGuest = (guestId: string) => {
        setGuestToDelete(guestId);
        setGuestDeletePassword("");
        setShowGuestDeleteModal(true);
    };

    const executeDeleteGuest = async () => {
        if (!guestDeletePassword) {
            alert("Please enter your password to confirm.");
            return;
        }
        setGuestDeleteLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !user.email) throw new Error("User not found");

            const { error: authError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: guestDeletePassword,
            });
            if (authError) throw new Error("Incorrect password. Please try again.");

            const { error } = await supabase.from("guests").delete().eq("id", guestToDelete!);
            if (error) throw error;

            setGuests(prev => prev.filter(g => g.id !== guestToDelete));
            setShowGuestDeleteModal(false);
            setGuestToDelete(null);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setGuestDeleteLoading(false);
        }
    };

    const handleDeleteEvent = () => {
        setShowDeleteModal(true);
    };

    const executeDelete = async () => {
        if (!deletePassword) {
            alert("Please enter your password to confirm.");
            return;
        }

        setDeleteLoading(true);
        try {
            // Verify Password by attempting re-login
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !user.email) throw new Error("User not found");

            const { error: authError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: deletePassword
            });

            if (authError) {
                throw new Error("Incorrect password. Please try again.");
            }

            // Proceed with Deletion
            // 1. Delete associated guests first (or their deletion should be cascaded, but better to be safe)
            const { error: guestsError } = await supabase.from("guests").delete().eq("event_id", eventId);
            if (guestsError) throw guestsError;

            // 2. Unassign coordinators from this event (clears the foreign key constraint)
            const { error: coordError } = await supabase
                .from("coordinators")
                .update({ event_id: null })
                .eq("event_id", eventId);
            if (coordError) throw coordError;

            // 3. Finally delete the event
            const { error } = await supabase.from("events").delete().eq("id", eventId);
            if (error) throw error;

            router.push("/admin/dashboard");
        } catch (error: any) {
            alert(error.message);
            setDeleteLoading(false);
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

    const handleExportArrival = () => {
        const guestsWithArrival = guests.filter(g => g.departure_details?.arrival);
        const exportData = guestsWithArrival.flatMap(guest => {
            const arrival = guest.departure_details?.arrival;
            const travelers = arrival?.travelers || [];
            if (travelers.length === 0) return [];
            return travelers.map((traveler) => ({
                "Main Guest": guest.name,
                "Traveler Name": traveler.name,
                "Arrival Date": arrival?.date ? format(new Date(arrival.date), "MMM d, yyyy") : "-",
                "Arrival Time": arrival?.time || "-",
                "Station/Airport": traveler.station_airport || "-",
                "Mode of Travel": traveler.mode_of_travel || "-",
                "Transport No": traveler.transport_number || "-",
                "Contact": traveler.contact_number || guest.phone || "-",
                "Pax": traveler.number_of_pax || "1",
                "Bags": traveler.number_of_bags || "0",
                "Vehicles": traveler.number_of_vehicles || "1",
                "Drop Location": traveler.drop_location || "-"
            }));
        });
        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${event?.name || "arrival"}_arrival_details.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportDeparture = () => {
        // Get all guests with departure details
        const guestsWithDeparture = guests.filter(g => g.departure_details?.departure);

        // Flatten data for export
        const exportData = guestsWithDeparture.flatMap(guest => {
            const departure = guest.departure_details?.departure;
            const travelers = departure?.travelers || [];

            if (travelers.length === 0) return [];

            return travelers.map((traveler: any) => ({
                "Main Guest": guest.name,
                "Traveler Name": traveler.name,
                "Departure Date": departure?.date ? format(new Date(departure.date), "MMM d, yyyy") : "-",
                "Departure Time": departure?.time || "-",
                "Station/Airport": traveler.station_airport || "-",
                "Mode of Travel": traveler.mode_of_travel || "-",
                "Transport No": traveler.transport_number || "-",
                "Contact": traveler.contact_number || guest.phone || "-",
                "Pax": traveler.number_of_pax || "1",
                "Bags": traveler.number_of_bags || "0",
                "Vehicles": traveler.number_of_vehicles || "1",
                "Drop Location": traveler.drop_location || "-"
            }));
        });

        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${event?.name || "departure"}_departure_details.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDeleteDepartureDetails = async (guestId: string) => {
        if (!confirm("Are you sure you want to delete this guest's transport details?")) return;

        try {
            const { error } = await supabase
                .from("guests")
                .update({ departure_details: null })
                .eq("id", guestId);

            if (error) throw error;

            // Refresh the guest list
            await fetchEventData();
            alert("Transport details deleted successfully.");
        } catch (error: any) {
            alert("Error deleting transport details: " + error.message);
        }
    };

    const filteredGuests = guests.filter((guest) =>
        guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (guest.email && guest.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (guest.phone && guest.phone.includes(searchQuery))
    );

    const flattenedGuests = useMemo(() => {
        const query = searchQuery.toLowerCase();
        const result: any[] = [];
        
        // Map to hold linked companions by their parent_id
        const linkedCompanionsMap: Record<string, Guest[]> = {};
        guests.forEach(g => {
            if (g.parent_id) {
                if (!linkedCompanionsMap[g.parent_id]) linkedCompanionsMap[g.parent_id] = [];
                linkedCompanionsMap[g.parent_id].push(g);
            }
        });

        guests.forEach(guest => {
            // Skip linked companions in the main loop
            if (guest.parent_id) return;

            const primaryEntry = {
                ...guest,
                isPrimary: true,
                displayName: guest.name,
                actualName: guest.name,
                uniqueKey: `primary-${guest.id}`
            };

            // 2a. Internal attendees_data companions (if any)
            const attendeeCompanions = (guest.attendees_data || []).map((m: any, i) => {
                if (m.name === guest.name) return null;
                return {
                    ...guest,
                    ...m,
                    isPrimary: false,
                    displayName: guest.name,
                    actualName: m.name,
                    uniqueKey: `companion-${guest.id}-${i}`,
                    isLinkedGuest: false
                };
            }).filter(Boolean);

            // 2b. Linked companions (separate rows in DB)
            const linkedCompanions = (linkedCompanionsMap[guest.id] || []).map((lg) => {
                return {
                    ...lg,
                    isPrimary: false,
                    displayName: guest.name,
                    actualName: lg.name,
                    uniqueKey: `linked-${lg.id}`,
                    isLinkedGuest: true
                };
            });

            const allCompanionEntries = [...attendeeCompanions, ...linkedCompanions];

            // Filter logic
            const matchesPrimary = 
                primaryEntry.name.toLowerCase().includes(query) ||
                (primaryEntry.email && primaryEntry.email.toLowerCase().includes(query)) ||
                (primaryEntry.phone && primaryEntry.phone.includes(query));

            const matchingCompanions = allCompanionEntries.filter(c => 
                c.actualName.toLowerCase().includes(query) ||
                (c.phone && c.phone.includes(query))
            );

            if (!query) {
                result.push(primaryEntry);
                result.push(...allCompanionEntries);
            } else if (matchesPrimary) {
                result.push(primaryEntry);
                result.push(...allCompanionEntries);
            } else if (matchingCompanions.length > 0) {
                result.push(...matchingCompanions);
            }
        });

        return result;
    }, [guests, searchQuery]);

    const stats = {
        total: guests.length,
        accepted: guests.filter(g => g.status === "accepted").length,
        declined: guests.filter(g => g.status === "declined").length,
        pending: guests.filter(g => g.status === "pending").length,
    };

    const handleGuestUpdate = async () => {
        await fetchEventData(); // Refresh list
        if (selectedGuest) {
            const { data } = await supabase.from('guests').select('*').eq('id', selectedGuest.id).single();
            if (data) setSelectedGuest(data);
        }
    };

    if (loading) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black p-6">
            <div className="mx-auto max-w-6xl space-y-8">
                {/* Header */}
                <div className="flex flex-col gap-4">
                    <div>
                        <Link href="/admin/dashboard" className="text-xs sm:text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 flex items-center mb-2 font-medium transition-colors">
                            <ArrowLeft className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                            Back to Dashboard
                        </Link>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                            {event?.name}
                        </h1>
                        <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 font-medium">
                            {event && format(new Date(event.date), "MMMM d, yyyy • h:mm a")} | {event?.location}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            variant="outline"
                            className="bg-white/50 dark:bg-white/5 border-zinc-200 dark:border-white/10 rounded-xl h-10 text-xs font-bold uppercase tracking-widest gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-zinc-900 transition-all shadow-sm"
                            onClick={() => {
                                const url = `${window.location.origin}/r/${event?.slug}`;
                                navigator.clipboard.writeText(url);
                                alert("Invite link copied to clipboard!");
                            }}
                        >
                            <Copy className="h-4 w-4" />
                            <span className="hidden sm:inline">Copy Invite Link</span>
                            <span className="sm:hidden">Share</span>
                        </Button>
                        <Button 
                            variant="outline"
                            className="bg-white/50 dark:bg-white/5 border-zinc-200 dark:border-white/10 rounded-xl h-10 text-xs font-bold uppercase tracking-widest gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-zinc-900 transition-all shadow-sm"
                            onClick={() => setShowHotelModal(true)}
                        >
                            <Hotel className="h-4 w-4" />
                            Hotel Access
                        </Button>
                        <Button 
                            variant="outline"
                            className="bg-white/50 dark:bg-white/5 border-zinc-200 dark:border-white/10 rounded-xl h-10 text-xs font-bold uppercase tracking-widest gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-zinc-900 transition-all shadow-sm"
                            onClick={() => setShowDropLocationsModal(true)}
                        >
                            <MapPin className="h-4 w-4" />
                            Drop Locations
                        </Button>
                        <Button 
                            variant="outline"
                            className="bg-white/50 dark:bg-white/5 border-zinc-200 dark:border-white/10 rounded-xl h-10 text-xs font-bold uppercase tracking-widest gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-zinc-900 transition-all shadow-sm"
                            onClick={handleExport}
                        >
                            <Download className="h-4 w-4" />
                            Export
                        </Button>
                        <Button 
                            onClick={handleDeleteEvent} 
                            className="bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white rounded-xl h-10 text-xs font-bold uppercase tracking-widest gap-2 border border-red-200 dark:border-red-900/30 shadow-none transition-all"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete
                        </Button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: "Total Invited", value: stats.total, color: "text-blue-600", bg: "bg-blue-600/10", border: "border-blue-100 dark:border-blue-900/30" },
                        { label: "Approved Guests", value: stats.accepted, color: "text-emerald-600", bg: "bg-emerald-600/10", border: "border-emerald-100 dark:border-emerald-900/30" },
                        { label: "Declined RSVPs", value: stats.declined, color: "text-rose-600", bg: "bg-rose-600/10", border: "border-rose-100 dark:border-rose-900/30" },
                        { label: "Pending Response", value: stats.pending, color: "text-amber-600", bg: "bg-amber-600/10", border: "border-amber-100 dark:border-amber-900/30" },
                    ].map((stat) => (
                        <div key={stat.label} className={cn("p-6 rounded-[2rem] border backdrop-blur-sm", stat.bg, stat.color, stat.border)}>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-70">{stat.label}</p>
                            <p className="text-4xl font-black tracking-tighter">{stat.value}</p>
                        </div>
                    ))}
                </div>

                <div className="flex gap-2 bg-white/40 dark:bg-white/5 p-2 rounded-[1.5rem] border border-white/60 dark:border-white/10 backdrop-blur-md shadow-sm w-full sm:w-fit">
                    <button
                        onClick={() => setActiveTab("guests")}
                        className={cn("flex-1 sm:flex-none px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300", 
                            activeTab === "guests" ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-lg" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100")
                        }
                    >
                        Directory
                    </button>
                    <button
                        onClick={() => setActiveTab("arrival")}
                        className={cn("flex-1 sm:flex-none px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300", 
                            activeTab === "arrival" ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-lg" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100")
                        }
                    >
                        Arrivals
                    </button>
                    <button
                        onClick={() => setActiveTab("departure")}
                        className={cn("flex-1 sm:flex-none px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300", 
                            activeTab === "departure" ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-lg" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100")
                        }
                    >
                        Departures
                    </button>
                </div>

                {/* Guest Management */}
                {activeTab === "guests" && (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
                            <h2 className="text-lg font-semibold">Guest List</h2>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <div className="relative group flex-1 max-w-md">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
                                    <Input
                                        placeholder="Search by name, email or phone..."
                                        className="pl-11 bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 rounded-2xl h-12 focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all font-medium"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="file"
                                        accept=".csv"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                    />
                                    <Button 
                                        onClick={() => fileInputRef.current?.click()} 
                                        disabled={uploading} 
                                        variant="outline"
                                        className="h-12 px-6 rounded-2xl border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 text-xs font-black uppercase tracking-widest gap-2"
                                    >
                                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                        Import
                                    </Button>
                                    <Button 
                                        onClick={() => setShowAddGuestModal(true)}
                                        className="h-12 px-6 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 text-xs font-black uppercase tracking-widest gap-2 shadow-xl shadow-zinc-900/10"
                                    >
                                        <UserPlus className="h-4 w-4" />
                                        Add Guest
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-[#f8f9fa] dark:bg-white/5">
                                    <tr className="text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-white/5">
                                        <th className="px-10 py-6">Guest Identity</th>
                                        <th className="px-6 py-6">Direct Contact</th>
                                        <th className="px-6 py-6">RSVP Status</th>
                                        <th className="px-6 py-6">Party Size</th>
                                        <th className="px-10 py-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                        {flattenedGuests.length === 0 ? (
                                            <tr><td colSpan={6} className="px-6 py-10 text-center text-zinc-500">No guests found</td></tr>
                                        ) : (
                                            flattenedGuests.map((guest) => (                                                <tr key={guest.uniqueKey || guest.id} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-300">
                                                    <td className="px-10 py-6">
                                                        <div className="flex items-center gap-4">
                                                            {!guest.isPrimary && <div className="w-6 h-px bg-zinc-200 dark:bg-zinc-800 shrink-0"></div>}
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                                    {guest.actualName || guest.name}
                                                                </span>
                                                                {!guest.isPrimary && (
                                                                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mt-0.5">
                                                                        Companion of {guest.displayName}
                                                                    </span>
                                                                )}
                                                                {guest.coordinator_id && coordinators[guest.coordinator_id] && (
                                                                    <div className="flex items-center gap-1.5 mt-1">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                                        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                                                                            Added by {coordinators[guest.coordinator_id]}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                                            {guest.phone || <span className="opacity-30">—</span>}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        <div className={cn(
                                                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                                            guest.status === "accepted" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                                            guest.status === "declined" ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                                                            "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                                        )}>
                                                            <div className={cn("w-1.5 h-1.5 rounded-full", 
                                                                guest.status === "accepted" ? "bg-emerald-500" :
                                                                guest.status === "declined" ? "bg-rose-500" :
                                                                "bg-amber-500"
                                                            )} />
                                                            {guest.status}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        <div className="inline-flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                                                            <Users size={14} className="text-zinc-400" />
                                                            <span className="text-sm font-black">{guest.allowed_guests}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-6 text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-9 w-9 rounded-xl p-0 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                                onClick={() => setSelectedGuest(guest)}
                                                            >
                                                                <Eye size={16} />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-9 w-9 rounded-xl p-0 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                                                onClick={() => handleDeleteGuest(guest.id)}
                                                            >
                                                                <Trash2 size={16} />
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
                )}

                {/* Arrival Management */}
                {activeTab === "arrival" && (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
                            <h2 className="text-lg font-semibold">Arrival Details</h2>
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
                                <Button variant="outline" onClick={handleExportArrival}>
                                    <Download className="mr-2 h-4 w-4" /> Export CSV
                                </Button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Guest Name</th>
                                        <th className="px-6 py-3 font-medium">Arrival Date</th>
                                        <th className="px-6 py-3 font-medium">Time</th>
                                        <th className="px-6 py-3 font-medium">Station/Airport</th>
                                        <th className="px-6 py-3 font-medium">Travel Mode</th>
                                        <th className="px-6 py-3 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {filteredGuests.filter(g => g.departure_details?.arrival?.date || g.departure_details?.arrival_date).length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                                                No arrival details found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredGuests.filter(g => g.departure_details?.arrival?.date || g.departure_details?.arrival_date).map((guest) => {
                                            const arrival = guest.departure_details?.arrival;
                                            return (
                                                <tr key={guest.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                                                        <div>{guest.name}</div>
                                                        {guest.coordinator_id && coordinators[guest.coordinator_id] && (
                                                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal mt-0.5 flex items-center gap-1">
                                                                <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                                                                {coordinators[guest.coordinator_id]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-zinc-500">
                                                        {arrival?.date ? format(new Date(arrival.date), "MMM d, yyyy") :
                                                            guest.departure_details?.arrival_date ? format(new Date(guest.departure_details.arrival_date), "MMM d, yyyy") : "-"}
                                                    </td>
                                                    <td className="px-6 py-4 text-zinc-500">{arrival?.time || guest.departure_details?.arrival_time || "-"}</td>
                                                    <td className="px-6 py-4 text-zinc-500">
                                                        {arrival?.travelers?.[0]?.station_airport || guest.departure_details?.arrival_location || "-"}
                                                    </td>
                                                    <td className="px-6 py-4 text-zinc-500">
                                                        {arrival?.travelers?.[0]?.mode_of_travel || guest.departure_details?.arrival_mode || "-"}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-blue-600" onClick={() => setSelectedGuest(guest)}>
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Departure Details Table */}
                {activeTab === "departure" && (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
                            <h2 className="text-lg font-semibold">Departure Details</h2>
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
                                <Button variant="outline" onClick={handleExportDeparture}>
                                    <Download className="mr-2 h-4 w-4" /> Export CSV
                                </Button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Guest Name</th>
                                        <th className="px-6 py-3 font-medium">Departure Date</th>
                                        <th className="px-6 py-3 font-medium">Time</th>
                                        <th className="px-6 py-3 font-medium">Station/Airport</th>
                                        <th className="px-6 py-3 font-medium">Travel Mode</th>
                                        <th className="px-6 py-3 font-medium">Ticket</th>
                                        <th className="px-6 py-3 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {(() => {
                                        const guestsWithDeparture = filteredGuests.filter(g => g.departure_details && (g.departure_details.applicable === false || g.departure_details.departure?.date || g.departure_details.departure_date));

                                        if (guestsWithDeparture.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                                                        No departure details submitted yet.
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return guestsWithDeparture.flatMap((guest: any) => {
                                            const departureData = guest.departure_details;
                                            const departure = departureData?.departure;
                                            const travelers = departure?.travelers || departureData?.travelers || [];

                                            // Check if departure is not applicable
                                            if (departureData?.applicable === false) {
                                                return (
                                                    <tr key={guest.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                                                            <div>{guest.name}</div>
                                                            {guest.coordinator_id && coordinators[guest.coordinator_id] && (
                                                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal mt-0.5 flex items-center gap-1">
                                                                    <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                                                                    {coordinators[guest.coordinator_id]}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-zinc-500 italic">Not Applicable</td>
                                                        <td className="px-6 py-4 text-zinc-500 italic">Not Applicable</td>
                                                        <td className="px-6 py-4 text-zinc-500 italic">Not Applicable</td>
                                                        <td className="px-6 py-4 text-zinc-500 italic">Not Applicable</td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-zinc-400 text-xs italic">Not Required</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-blue-600" onClick={() => setSelectedGuest(guest)}>
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-600" onClick={() => handleDeleteDepartureDetails(guest.id)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            if (travelers.length === 0) {
                                                return (
                                                    <tr key={guest.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                                                            <div>{guest.name}</div>
                                                            {guest.coordinator_id && coordinators[guest.coordinator_id] && (
                                                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal mt-0.5 flex items-center gap-1">
                                                                    <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                                                                    {coordinators[guest.coordinator_id]}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-zinc-500">
                                                            {departure?.date ? format(new Date(departure.date), "MMM d, yyyy") :
                                                                departureData?.departure_date ? format(new Date(departureData.departure_date), "MMM d, yyyy") : "-"}
                                                        </td>
                                                        <td className="px-6 py-4 text-zinc-500">
                                                            {departure?.time || departureData?.departure_time || "-"}
                                                        </td>
                                                        <td className="px-6 py-4 text-zinc-500">{departureData?.departure_location || "-"}</td>
                                                        <td className="px-6 py-4 text-zinc-500">{departureData?.departure_mode || "-"}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-blue-600" onClick={() => setSelectedGuest(guest)}>
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-600" onClick={() => handleDeleteDepartureDetails(guest.id)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return travelers.map((traveler: any, idx: number) => (
                                                <tr key={`${guest.id}-${idx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                                                        <div>{guest.name}</div>
                                                        {guest.coordinator_id && coordinators[guest.coordinator_id] && (
                                                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal mt-0.5 flex items-center gap-1">
                                                                <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                                                                {coordinators[guest.coordinator_id]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-zinc-500">
                                                        {departure?.date ? format(new Date(departure.date), "MMM d, yyyy") :
                                                            departureData?.departure_date ? format(new Date(departureData.departure_date), "MMM d, yyyy") : "-"}
                                                    </td>
                                                    <td className="px-6 py-4 text-zinc-500">
                                                        {departure?.time || departureData?.departure_time || "-"}
                                                    </td>
                                                    <td className="px-6 py-4 text-zinc-500">
                                                        {traveler.station_airport || "-"}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${traveler.mode_of_travel === "By Air" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                                            traveler.mode_of_travel === "Train" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                                                "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                                                            }`}>
                                                            {traveler.mode_of_travel || "-"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {traveler.ticket_url ? (
                                                            <a href={traveler.ticket_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 text-xs font-medium">
                                                                View Ticket
                                                            </a>
                                                        ) : (
                                                            <span className="text-zinc-400 text-xs">No ticket</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {idx === 0 && (
                                                                <>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-blue-600" onClick={() => setSelectedGuest(guest)}>
                                                                        <Eye className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-600" onClick={() => handleDeleteDepartureDetails(guest.id)}>
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ));
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <GuestDetailsModal
                guest={selectedGuest}
                onClose={() => setSelectedGuest(null)}
                onUpdate={handleGuestUpdate}
                eventName={event?.name}
                eventDate={event?.date}
            />

            {/* Add Guest Modal */}
            {showAddGuestModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowAddGuestModal(false)} />
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl relative animate-in zoom-in slide-in-from-bottom-8 duration-300 border border-zinc-100 dark:border-white/10">
                        <div className="p-8 md:p-10 space-y-8">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Add Guest</h3>
                                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Expand your event directory with a new attendee.</p>
                            </div>
    
                            <div className="grid gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Full Identity</Label>
                                    <Input
                                        placeholder="Enter guest name"
                                        value={newGuestName}
                                        onChange={(e) => setNewGuestName(e.target.value)}
                                        className="h-14 bg-zinc-50 dark:bg-white/5 border-zinc-100 dark:border-white/10 rounded-2xl px-6 focus-visible:ring-4 focus-visible:ring-blue-500/10 transition-all font-bold"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Email (Optional)</Label>
                                        <Input
                                            type="email"
                                            placeholder="email@example.com"
                                            value={newGuestEmail}
                                            onChange={(e) => setNewGuestEmail(e.target.value)}
                                            className="h-14 bg-zinc-50 dark:bg-white/5 border-zinc-100 dark:border-white/10 rounded-2xl px-6 focus-visible:ring-4 focus-visible:ring-blue-500/10 transition-all font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Phone (Optional)</Label>
                                        <Input
                                            placeholder="+91..."
                                            value={newGuestPhone}
                                            onChange={(e) => setNewGuestPhone(e.target.value)}
                                            className="h-14 bg-zinc-50 dark:bg-white/5 border-zinc-100 dark:border-white/10 rounded-2xl px-6 focus-visible:ring-4 focus-visible:ring-blue-500/10 transition-all font-bold"
                                        />
                                    </div>
                                </div>
    
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Guardian / Primary Guest</Label>
                                    <select
                                        className="w-full flex h-14 rounded-2xl border border-zinc-100 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-6 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10 transition-all appearance-none cursor-pointer"
                                        value={selectedPrimaryGuestId || ""}
                                        onChange={(e) => setSelectedPrimaryGuestId(e.target.value || null)}
                                    >
                                        <option value="">Independent Guest</option>
                                        {guests
                                            .filter(g => !g.parent_id)
                                            .map((g) => (
                                                <option key={g.id} value={g.id}>
                                                    {g.name}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>
    
                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <Button 
                                    className="flex-1 h-14 rounded-2xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-black hover:opacity-90 transition-all shadow-xl shadow-zinc-900/20 dark:shadow-none"
                                    onClick={handleAddGuest} 
                                    disabled={addGuestLoading}
                                >
                                    {addGuestLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5 mr-2" />}
                                    Confirm Addition
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    className="h-14 rounded-2xl px-8 font-black text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                    onClick={() => setShowAddGuestModal(false)}
                                >
                                    Discard
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowDeleteModal(false)} />
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in slide-in-from-bottom-8 duration-300 border border-zinc-100 dark:border-white/10">
                        <div className="p-8 md:p-10 space-y-8">
                            <div className="space-y-4 text-center">
                                <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-2 border border-rose-500/20">
                                    <Trash2 className="text-rose-600 dark:text-rose-400" size={32} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Destroy Event?</h3>
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">This action is permanent. All guest data, RSVPs, and coordinated assignments will be purged.</p>
                                </div>
                            </div>
    
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Administrative Credential</Label>
                                <Input
                                    type="password"
                                    placeholder="Enter password to confirm"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    className="h-14 bg-zinc-50 dark:bg-white/5 border-zinc-100 dark:border-white/10 rounded-2xl px-6 focus-visible:ring-4 focus-visible:ring-rose-500/10 transition-all font-bold"
                                />
                            </div>
    
                            <div className="flex flex-col gap-3">
                                <Button 
                                    variant="destructive" 
                                    className="h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black transition-all shadow-xl shadow-rose-900/20"
                                    onClick={executeDelete} 
                                    disabled={deleteLoading}
                                >
                                    {deleteLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Purge Everything"}
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    className="h-14 rounded-2xl font-black text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setDeletePassword("");
                                    }}
                                >
                                    Keep Event
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Guest Delete Confirmation Modal */}
            {showGuestDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowGuestDeleteModal(false)} />
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in slide-in-from-bottom-8 duration-300 border border-zinc-100 dark:border-white/10">
                        <div className="p-8 md:p-10 space-y-8">
                            <div className="space-y-4 text-center">
                                <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                                    <Users size={28} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Remove Guest?</h3>
                                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">This attendee and their companions will be removed from the directory.</p>
                                </div>
                            </div>
    
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Admin Validation</Label>
                                <Input
                                    type="password"
                                    placeholder="Confirm password"
                                    value={guestDeletePassword}
                                    onChange={(e) => setGuestDeletePassword(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && executeDeleteGuest()}
                                    className="h-14 bg-zinc-50 dark:bg-white/5 border-zinc-100 dark:border-white/10 rounded-2xl px-6 focus-visible:ring-4 focus-visible:ring-rose-500/10 transition-all font-bold"
                                    autoFocus
                                />
                            </div>
    
                            <div className="flex flex-col gap-2">
                                <Button 
                                    variant="destructive" 
                                    className="h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black transition-all"
                                    onClick={executeDeleteGuest} 
                                    disabled={guestDeleteLoading}
                                >
                                    {guestDeleteLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Delete Guest"}
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    className="h-14 rounded-2xl font-black text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                    onClick={() => {
                                        setShowGuestDeleteModal(false);
                                        setGuestToDelete(null);
                                        setGuestDeletePassword("");
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showDropLocationsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowDropLocationsModal(false)} />
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl relative animate-in zoom-in slide-in-from-bottom-8 duration-300 border border-zinc-100 dark:border-white/10">
                        <div className="p-8 md:p-10 space-y-8">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Drop Locations</h3>
                                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Define destinations for guest transportation.</p>
                            </div>
    
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Locations Registry (Comma separated)</Label>
                                <Textarea
                                    placeholder="Grand Hyatt Goa, Taj Exotica, The Leela..."
                                    value={dropLocationsText}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDropLocationsText(e.target.value)}
                                    rows={5}
                                    className="bg-zinc-50 dark:bg-white/5 border-zinc-100 dark:border-white/10 rounded-2xl px-6 py-4 focus-visible:ring-4 focus-visible:ring-blue-500/10 transition-all font-bold resize-none"
                                />
                            </div>
    
                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <Button 
                                    className="flex-1 h-14 rounded-2xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-black hover:opacity-90 transition-all shadow-xl shadow-zinc-900/20 dark:shadow-none"
                                    onClick={handleUpdateDropLocations} 
                                    disabled={dropLocationsLoading}
                                >
                                    {dropLocationsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Assignments"}
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    className="h-14 rounded-2xl px-8 font-black text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                    onClick={() => setShowDropLocationsModal(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showHotelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowHotelModal(false)} />
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl relative animate-in zoom-in slide-in-from-bottom-8 duration-300 border border-zinc-100 dark:border-white/10">
                        <div className="p-8 md:p-10 space-y-8">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Hotel Access</h3>
                                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Collaborate with your hospitality partners.</p>
                            </div>
    
                            <div className="grid gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Partner Organization</Label>
                                    <Input
                                        placeholder="e.g. Grand Hyatt Goa"
                                        value={hotelName}
                                        onChange={(e) => setHotelName(e.target.value)}
                                        className="h-14 bg-zinc-50 dark:bg-white/5 border-zinc-100 dark:border-white/10 rounded-2xl px-6 focus-visible:ring-4 focus-visible:ring-blue-500/10 transition-all font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Authorization Email</Label>
                                    <Input
                                        type="email"
                                        placeholder="partner@hotel.com"
                                        value={hotelEmail}
                                        onChange={(e) => setHotelEmail(e.target.value)}
                                        className="h-14 bg-zinc-50 dark:bg-white/5 border-zinc-100 dark:border-white/10 rounded-2xl px-6 focus-visible:ring-4 focus-visible:ring-blue-500/10 transition-all font-bold"
                                    />
                                    {event?.assigned_hotel_email && (
                                        <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 mt-2">
                                            <Hotel size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest truncate">
                                                Active: {event.assigned_hotel_name || event.assigned_hotel_email}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
    
                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <Button 
                                    className="flex-3 h-14 rounded-2xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-black hover:opacity-90 transition-all shadow-xl shadow-zinc-900/20 dark:shadow-none"
                                    onClick={handleAssignHotel} 
                                    disabled={assignLoading}
                                >
                                    {assignLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authorize Partner"}
                                </Button>
                                {event?.assigned_hotel_email && (
                                    <Button 
                                        variant="ghost"
                                        className="h-14 rounded-2xl px-6 font-black text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                                        onClick={async () => {
                                            if (!confirm("Revoke hospitaly partner access?")) return;
                                            setAssignLoading(true);
                                            try {
                                                const { error } = await supabase.from("events").update({ assigned_hotel_email: null, assigned_hotel_name: null }).eq("id", eventId);
                                                if (error) throw error;
                                                setEvent(prev => prev ? ({ ...prev, assigned_hotel_email: undefined, assigned_hotel_name: undefined }) : null);
                                                setHotelEmail("");
                                                setHotelName("");
                                                setShowHotelModal(false);
                                            } catch (e: any) {
                                                alert(e.message);
                                            } finally {
                                                setAssignLoading(false);
                                            }
                                        }}
                                        disabled={assignLoading}
                                    >
                                        Revoke
                                    </Button>
                                )}
                                <Button 
                                    variant="ghost" 
                                    className="h-14 rounded-2xl px-6 font-black text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                    onClick={() => setShowHotelModal(false)}
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default withAuth(EventDetails);
