"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Calendar, Check, Search, ArrowRight, ArrowLeft, Upload } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/components/ui/toast";

type Event = {
    id: string;
    name: string;
    date: string;
    location: string;
    description: string;
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
    status: string;
    allowed_guests: number;
    attending_count: number;
};

export default function PublicEventPage() {
    const params = useParams();
    const slug = params.slug as string;
    const { toasts, removeToast, success, error, warning, info } = useToast();

    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState<"landing" | "search" | "form" | "success" | "departure">("landing");
    const [activeSection, setActiveSection] = useState<"rsvp" | "departure">("rsvp");
    const [isDepartureApplicable, setIsDepartureApplicable] = useState<boolean | null>(null); // New state for section toggle

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Guest[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

    // Form State
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [arrivalLocation, setArrivalLocation] = useState("");
    const [arrivalDate, setArrivalDate] = useState("");
    const [status, setStatus] = useState<"accepted" | "declined">("accepted");
    const [attendingCount, setAttendingCount] = useState(1);
    const [attendees, setAttendees] = useState<any[]>([]);
    const [message, setMessage] = useState("");
    const [dietary, setDietary] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null); // "index-front" or "index-back"

    // Departure Details State
    const [departureDate, setDepartureDate] = useState("");
    const [departureTime, setDepartureTime] = useState("");
    const [departureTravelers, setDepartureTravelers] = useState<any[]>([]);
    const [departureMessage, setDepartureMessage] = useState("");
    const [uploadingDepartureTicket, setUploadingDepartureTicket] = useState<string | null>(null);
    const [submittingDeparture, setSubmittingDeparture] = useState(false);

    useEffect(() => {
        fetchEvent();
    }, [slug]);


    useEffect(() => {
        if (selectedGuest) {
            setEmail(selectedGuest.email || "");
            setPhone(selectedGuest.phone || "");
            setArrivalLocation(selectedGuest.arrival_location || "");
            setArrivalDate(selectedGuest.arrival_date || "");

            if (status === "accepted") {
                // Initialize attendees array if empty
                setAttendees(prev => {
                    if (prev.length > 0) return prev; // Don't overwrite if already modified
                    return [{
                        name: selectedGuest.name,
                        age: "",
                        guest_type: "Adult",
                        id_type: "Aadhar Card",
                        id_front: "",
                        id_back: ""
                    }];
                });
            }
        }
    }, [selectedGuest, status]);

    const fetchEvent = async () => {
        try {
            const { data, error } = await supabase
                .from("events")
                .select("*")
                .eq("slug", slug)
                .single();

            if (error) throw error;
            setEvent(data);
        } catch (error) {
            console.error("Error fetching event:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim() || !event) return;

        setSearching(true);
        try {
            const { data, error } = await supabase
                .from("guests")
                .select("*")
                .eq("event_id", event.id)
                .ilike("name", `%${searchQuery}%`);

            if (error) throw error;
            setSearchResults(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setSearching(false);
        }
    };

    const handleFileUpload = async (file: File, index: number, field: "id_front" | "id_back") => {
        try {
            setUploading(`${index}-${field}`);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${event?.id}/${selectedGuest?.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("guest-ids")
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from("guest-ids")
                .getPublicUrl(filePath);

            const newAttendees = [...attendees];
            newAttendees[index] = { ...newAttendees[index], [field]: publicUrl };
            setAttendees(newAttendees);

        } catch (error: any) {
            alert("Upload failed: " + error.message);
        } finally {
            setUploading(null);
        }
    };


    const handleSubmitRSVP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGuest) return;
        setSubmitting(true);

        try {
            // Validation
            if (!phone) {
                alert("Please enter your phone number");
                setSubmitting(false);
                return;
            }

            if (status === "accepted") {
                for (let i = 0; i < attendees.length; i++) {
                    const a = attendees[i];
                    if (!a.name || !a.age || !a.id_front || !a.id_back) {
                        alert(`Please fill all details for Guest ${i + 1} (Name, Age, and ID images)`);
                        setSubmitting(false);
                        return;
                    }
                }
            }

            const { error } = await supabase
                .from("guests")
                .update({
                    email: email,
                    phone: phone,
                    arrival_location: arrivalLocation,
                    arrival_date: arrivalDate,
                    status: status,
                    attending_count: status === 'accepted' ? attendingCount : 0,
                    message: message,
                    dietary_requirements: dietary,
                    attendees_data: status === 'accepted' ? attendees : [],
                })
                .eq("id", selectedGuest.id);

            if (error) throw error;

            // Refetch guest data to get the latest departure_details
            const { data: updatedGuest } = await supabase
                .from("guests")
                .select("*")
                .eq("id", selectedGuest.id)
                .single();

            if (updatedGuest) {
                setSelectedGuest(updatedGuest);
            }

            // Check if departure details are already filled or marked as not applicable
            const hasDepartureDetails = updatedGuest?.departure_details &&
                (updatedGuest.departure_details.applicable === false ||
                    (updatedGuest.departure_details.travelers && updatedGuest.departure_details.travelers.length > 0));

            if (status === 'accepted' && !hasDepartureDetails) {
                // Initialize departure travelers from attendees
                const travelers = attendees.map((attendee) => ({
                    name: attendee.name,
                    mode_of_travel: "",
                    station_airport: "",
                    ticket_url: ""
                }));
                setDepartureTravelers(travelers);

                // Switch to departure section instead of showing success
                setActiveSection("departure");
                alert("RSVP submitted successfully! Please complete your Departure Details.");
            } else {
                // Show success screen if declined or departure details already exist
                setStep("success");
            }
        } catch (error: any) {
            alert("Error submitting RSVP: " + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDepartureTicketUpload = async (file: File, index: number) => {
        try {
            setUploadingDepartureTicket(`${index}`);
            const fileExt = file.name.split('.').pop();
            const fileName = `departure-ticket-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${event?.id}/${selectedGuest?.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("guest-ids")
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from("guest-ids")
                .getPublicUrl(filePath);

            const newTravelers = [...departureTravelers];
            newTravelers[index] = { ...newTravelers[index], ticket_url: publicUrl };
            setDepartureTravelers(newTravelers);

        } catch (error: any) {
            alert("Ticket upload failed: " + error.message);
        } finally {
            setUploadingDepartureTicket(null);
        }
    };

    const handleSubmitDeparture = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGuest) return;
        setSubmittingDeparture(true);

        try {
            // If departure is not applicable, save minimal data and proceed
            if (isDepartureApplicable === false) {
                const departureDetails = {
                    applicable: false,
                    message: departureMessage
                };

                const { error } = await supabase
                    .from("guests")
                    .update({
                        departure_details: departureDetails
                    })
                    .eq("id", selectedGuest.id);

                if (error) throw error;

                alert("Departure details submitted successfully!");
                setStep("success");
                setSubmittingDeparture(false);
                return;
            }

            // Validation - All fields are required when departure is applicable
            if (!departureDate) {
                alert("Please select a departure date");
                setSubmittingDeparture(false);
                return;
            }
            if (!departureTime) {
                alert("Please select a departure time");
                setSubmittingDeparture(false);
                return;
            }

            for (let i = 0; i < departureTravelers.length; i++) {
                const traveler = departureTravelers[i];
                if (!traveler.name) {
                    alert(`Please fill the name for Traveler ${i + 1}`);
                    setSubmittingDeparture(false);
                    return;
                }
                if (!traveler.mode_of_travel) {
                    alert(`Please select mode of travel for ${traveler.name}`);
                    setSubmittingDeparture(false);
                    return;
                }
                if (!traveler.station_airport) {
                    alert(`Please enter station/airport name for ${traveler.name}`);
                    setSubmittingDeparture(false);
                    return;
                }
                // Ticket is now mandatory for all modes of travel
                if (!traveler.ticket_url) {
                    alert(`Please upload ticket for ${traveler.name}`);
                    setSubmittingDeparture(false);
                    return;
                }
            }

            const departureDetails = {
                applicable: true,
                departure_date: departureDate,
                departure_time: departureTime,
                travelers: departureTravelers,
                message: departureMessage
            };

            const { error } = await supabase
                .from("guests")
                .update({
                    departure_details: departureDetails
                })
                .eq("id", selectedGuest.id);

            if (error) throw error;

            // Show success message and return to success screen
            success("Departure details submitted successfully!");
            setStep("success");
        } catch (err: any) {
            error("Error submitting departure details: " + err.message);
        } finally {
            setSubmittingDeparture(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black"><Loader2 className="animate-spin text-zinc-400" /></div>;
    }

    if (!event) {
        return <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black text-zinc-500">Event not found.</div>;
    }

    return (
        <>
            <ToastContainer toasts={toasts} onRemove={removeToast} />
            <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col items-center justify-center p-6 font-sans">
                <div className="w-full max-w-lg my-10">
                    <AnimatePresence mode="wait">

                        {/* STEP 1: LANDING */}
                        {step === "landing" && (
                            <motion.div
                                key="landing"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="text-center space-y-8"
                            >
                                <div className="space-y-4">
                                    <span className="inline-block px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-medium tracking-wider uppercase text-zinc-500">You are invited</span>
                                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{event.name}</h1>
                                    <div className="flex flex-col items-center gap-2 text-zinc-500 dark:text-zinc-400">
                                        <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {format(new Date(event.date), "MMMM d, h:mm a")}</div>
                                        <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {event.location}</div>
                                    </div>
                                </div>

                                {event.description && (
                                    <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                                        {event.description}
                                    </p>
                                )}

                                <Button size="lg" className="rounded-full px-8 h-12 text-base shadow-lg hover:shadow-xl transition-all" onClick={() => setStep("search")}>
                                    Respond to Invite
                                </Button>
                            </motion.div>
                        )}

                        {/* STEP 2: SEARCH */}
                        {step === "search" && (
                            <motion.div
                                key="search"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl border border-zinc-100 dark:border-zinc-800"
                            >
                                <div className="mb-6">
                                    <Button variant="ghost" size="sm" className="-ml-2 mb-2 text-zinc-400" onClick={() => setStep("landing")}>
                                        <ArrowLeft className="w-4 h-4 mr-1" /> Back
                                    </Button>
                                    <h2 className="text-2xl font-semibold mb-2">Find your invitation</h2>
                                    <p className="text-zinc-500 text-sm">Please enter your name to locate your invite.</p>
                                </div>

                                <form onSubmit={handleSearch} className="space-y-4 mb-6">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />
                                        <Input
                                            placeholder="Search by name..."
                                            className="pl-10 h-11 text-lg"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <Button type="submit" className="w-full h-11" disabled={searching || !searchQuery}>
                                        {searching ? <Loader2 className="animate-spin w-4 h-4" /> : "Find Invitation"}
                                    </Button>
                                </form>

                                <div className="space-y-2">
                                    {searchResults.map((guest) => (
                                        <button
                                            key={guest.id}
                                            onClick={() => { setSelectedGuest(guest); setStep("form"); }}
                                            className="w-full text-left p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex justify-between items-center group"
                                        >
                                            <span className="font-medium">{guest.name}</span>
                                            <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-900 dark:text-zinc-600 dark:group-hover:text-zinc-50" />
                                        </button>
                                    ))}
                                    {searchResults.length === 0 && searchQuery && !searching && (
                                        <p className="text-center text-zinc-400 text-sm py-4">No guests found. Please try a different name.</p>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3: RSVP FORM */}
                        {step === "form" && selectedGuest && (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl border border-zinc-100 dark:border-zinc-800"
                            >
                                <div className="mb-6">
                                    <Button variant="ghost" size="sm" className="-ml-2 mb-2 text-zinc-400" onClick={() => setStep("search")}>
                                        <ArrowLeft className="w-4 h-4 mr-1" /> Back
                                    </Button>
                                    <h2 className="text-2xl font-semibold">Hi, {selectedGuest.name}</h2>
                                    <p className="text-zinc-500">Will you be joining us?</p>
                                </div>

                                {/* Toggle Buttons */}
                                <div className="flex gap-2 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-xl mb-6">
                                    <button
                                        type="button"
                                        onClick={() => setActiveSection("rsvp")}
                                        className={`flex-1 px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${activeSection === "rsvp"
                                            ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
                                            : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                                            }`}
                                    >
                                        RSVP
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveSection("departure");
                                            // Initialize departure travelers from attendees if not already done
                                            if (departureTravelers.length === 0 && attendees.length > 0) {
                                                const travelers = attendees.map((attendee) => ({
                                                    name: attendee.name,
                                                    mode_of_travel: "",
                                                    station_airport: "",
                                                    ticket_url: ""
                                                }));
                                                setDepartureTravelers(travelers);
                                            }
                                        }}
                                        className={`flex-1 px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${activeSection === "departure"
                                            ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
                                            : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                                            }`}
                                    >
                                        Departure
                                    </button>
                                </div>

                                {/* RSVP Section */}
                                {activeSection === "rsvp" && (
                                    <form onSubmit={handleSubmitRSVP} className="space-y-6">

                                        {/* Number of Members Selector */}
                                        <div className="space-y-2">
                                            <Label>No. of Members <span className="text-red-500">*</span></Label>
                                            <select
                                                className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-base focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 transition"
                                                value={attendingCount}
                                                onChange={(e) => {
                                                    const count = parseInt(e.target.value);
                                                    setAttendingCount(count);

                                                    // Adjust attendees array to match the selected count
                                                    const newAttendees = [...attendees];
                                                    if (count > attendees.length) {
                                                        // Add new attendees
                                                        for (let i = attendees.length; i < count; i++) {
                                                            newAttendees.push({
                                                                name: "",
                                                                age: "",
                                                                guest_type: "Adult",
                                                                id_type: "Aadhar Card",
                                                                id_front: "",
                                                                id_back: ""
                                                            });
                                                        }
                                                    } else if (count < attendees.length) {
                                                        // Remove excess attendees
                                                        newAttendees.splice(count);
                                                    }
                                                    setAttendees(newAttendees);
                                                }}
                                            >
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                                    <option key={num} value={num}>{num}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Email</Label>
                                                <Input
                                                    type="email"
                                                    placeholder="your@email.com"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Phone <span className="text-red-500">*</span></Label>
                                                <Input
                                                    type="tel"
                                                    placeholder="Your phone number"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4 border rounded-lg p-4 bg-zinc-50 dark:bg-zinc-800/50">
                                            <div className="space-y-1">
                                                <h3 className="font-medium">Travel Details (Optional)</h3>
                                                <p className="text-xs text-zinc-500">

                                                </p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Arrival Location</Label>
                                                    <Input
                                                        placeholder="e.g. Airport, Train Station"
                                                        value={arrivalLocation}
                                                        onChange={(e) => setArrivalLocation(e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Arrival Date & Time</Label>
                                                    <Input
                                                        type="datetime-local"
                                                        value={arrivalDate}
                                                        onChange={(e) => setArrivalDate(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>



                                        <div className="space-y-6 border-zinc-100 dark:border-zinc-800">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-medium text-lg">Guest Details & ID Verification</h3>
                                                <div className="text-sm text-zinc-500">
                                                    {attendees.length} Guests Attending
                                                </div>
                                            </div>

                                            {attendees.map((attendee, idx) => (
                                                <div key={idx} className="relative p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 space-y-5">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                                                            {idx === 0 ? "Main Guest" : `Guest ${idx + 1}`}
                                                        </h4>
                                                        {idx > 0 && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 h-8 px-2"
                                                                onClick={() => {
                                                                    const newA = attendees.filter((_, i) => i !== idx);
                                                                    setAttendees(newA);
                                                                    setAttendingCount(newA.length);
                                                                }}
                                                            >
                                                                Remove
                                                            </Button>
                                                        )}
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Full Name</Label>
                                                        <Input
                                                            value={attendee.name}
                                                            onChange={(e) => {
                                                                const newA = [...attendees];
                                                                newA[idx].name = e.target.value;
                                                                setAttendees(newA);
                                                            }}
                                                            placeholder="Enter full name"
                                                            className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 text-base"
                                                        />
                                                    </div>

                                                    {/* Age and Type Fields */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Age</Label>
                                                            <Input
                                                                type="number"
                                                                value={attendee.age}
                                                                onChange={(e) => {
                                                                    const newA = [...attendees];
                                                                    newA[idx].age = e.target.value;
                                                                    setAttendees(newA);
                                                                }}
                                                                placeholder="Enter age"
                                                                className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 text-base"
                                                                min="0"
                                                                max="120"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Type</Label>
                                                            <select
                                                                className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-base focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 transition"
                                                                value={attendee.guest_type}
                                                                onChange={(e) => {
                                                                    const newA = [...attendees];
                                                                    newA[idx].guest_type = e.target.value;
                                                                    setAttendees(newA);
                                                                }}
                                                            >
                                                                <option value="Adult">Adult</option>
                                                                <option value="Child">Child</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">ID Document Type</Label>
                                                        <select
                                                            className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-base focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 transition"
                                                            value={attendee.id_type}
                                                            onChange={(e) => {
                                                                const newA = [...attendees];
                                                                newA[idx].id_type = e.target.value;
                                                                setAttendees(newA);
                                                            }}
                                                        >
                                                            <option value="Aadhar Card">Aadhar Card</option>
                                                            <option value="Passport">Passport</option>
                                                            <option value="Driving License">Driving License</option>
                                                            <option value="Voter ID Card">Voter ID Card</option>
                                                        </select>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Front Side</Label>
                                                            <div className="relative group">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    id={`file-${idx}-front`}
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) handleFileUpload(file, idx, "id_front");
                                                                    }}
                                                                />
                                                                <label
                                                                    htmlFor={`file-${idx}-front`}
                                                                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 
                                                                    ${attendee.id_front ? 'border-green-500/50 bg-green-50/50 dark:bg-green-900/10' : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-white dark:hover:bg-zinc-800'}`}
                                                                >
                                                                    {uploading === `${idx}-id_front` ? (
                                                                        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                                                                    ) : attendee.id_front ? (
                                                                        <div className="relative w-full h-full overflow-hidden rounded-xl">
                                                                            <img src={attendee.id_front} alt="Front ID" className="object-cover w-full h-full" />
                                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">Change</div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex flex-col items-center justify-center text-zinc-400 space-y-2">
                                                                            <div className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                                                                                <Upload className="w-4 h-4" />
                                                                            </div>
                                                                            <span className="text-xs font-medium">Upload Front</span>
                                                                        </div>
                                                                    )}
                                                                </label>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Back Side</Label>
                                                            <div className="relative group">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    id={`file-${idx}-back`}
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) handleFileUpload(file, idx, "id_back");
                                                                    }}
                                                                />
                                                                <label
                                                                    htmlFor={`file-${idx}-back`}
                                                                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 
                                                                    ${attendee.id_back ? 'border-green-500/50 bg-green-50/50 dark:bg-green-900/10' : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-white dark:hover:bg-zinc-800'}`}
                                                                >
                                                                    {uploading === `${idx}-id_back` ? (
                                                                        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                                                                    ) : attendee.id_back ? (
                                                                        <div className="relative w-full h-full overflow-hidden rounded-xl">
                                                                            <img src={attendee.id_back} alt="Back ID" className="object-cover w-full h-full" />
                                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">Change</div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex flex-col items-center justify-center text-zinc-400 space-y-2">
                                                                            <div className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                                                                                <Upload className="w-4 h-4" />
                                                                            </div>
                                                                            <span className="text-xs font-medium">Upload Back</span>
                                                                        </div>
                                                                    )}
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full border-dashed border-2 py-6 text-zinc-500 hover:text-zinc-900 hover:border-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                                onClick={() => {
                                                    const newA = [
                                                        ...attendees,
                                                        { name: "", age: "", guest_type: "Adult", id_type: "Aadhar Card", id_front: "", id_back: "" }
                                                    ];
                                                    setAttendees(newA);
                                                    setAttendingCount(newA.length);
                                                }}
                                            >
                                                + Add Family Member
                                            </Button>
                                        </div>




                                        <div className="space-y-3">
                                            <Label>Message (Optional)</Label>
                                            <Textarea
                                                placeholder="Any words for the host?"
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                            />
                                        </div>

                                        <Button type="submit" className="w-full h-12 text-base rounded-xl" disabled={submitting}>
                                            {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : "Submit RSVP"}
                                        </Button>
                                    </form>
                                )}

                                {/* Departure Section */}
                                {activeSection === "departure" && (
                                    <form onSubmit={handleSubmitDeparture} className="space-y-6">

                                        {/* Departure Applicability Question */}
                                        <div className="space-y-4 border rounded-2xl p-6 bg-zinc-50 dark:bg-zinc-800/30">
                                            <h3 className="font-medium text-lg">Is departure applicable for you?</h3>
                                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsDepartureApplicable(true)}
                                                    className={`flex-1 px-4 py-2.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 border-2 ${isDepartureApplicable === true
                                                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                                        : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:border-blue-400"
                                                        }`}
                                                >
                                                    Yes
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsDepartureApplicable(false)}
                                                    className={`flex-1 px-4 py-2.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 border-2 ${isDepartureApplicable === false
                                                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                                        : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:border-blue-400"
                                                        }`}
                                                >
                                                    No (Not Applicable)
                                                </button>
                                            </div>
                                        </div>

                                        {/* Show departure form only if applicable */}
                                        {isDepartureApplicable === true && (
                                            <>
                                                {/* Departure Details Card */}
                                                <div className="space-y-4 border rounded-2xl p-6 bg-zinc-50 dark:bg-zinc-800/30">
                                                    <h3 className="font-medium text-lg">Departure Details</h3>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label>Departure Date <span className="text-red-500">*</span></Label>
                                                            <Input
                                                                type="date"
                                                                value={departureDate}
                                                                onChange={(e) => setDepartureDate(e.target.value)}
                                                                className="bg-white dark:bg-zinc-900"
                                                                required
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Departure Time <span className="text-red-500">*</span></Label>
                                                            <Input
                                                                type="time"
                                                                value={departureTime}
                                                                onChange={(e) => setDepartureTime(e.target.value)}
                                                                className="bg-white dark:bg-zinc-900"
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Departure Travel Details */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="font-medium text-lg">Departure Travel Details</h3>
                                                        <div className="text-sm text-zinc-500">
                                                            {departureTravelers.length} {departureTravelers.length === 1 ? 'Guest' : 'Guests'} Departing
                                                        </div>
                                                    </div>

                                                    {departureTravelers.map((traveler, idx) => (
                                                        <div key={idx} className="relative p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                                                                    {idx === 0 ? "Main Guest" : `Family Member ${idx}`}
                                                                </h4>
                                                                {idx > 0 && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 h-8 px-2"
                                                                        onClick={() => {
                                                                            const newTravelers = departureTravelers.filter((_, i) => i !== idx);
                                                                            setDepartureTravelers(newTravelers);
                                                                        }}
                                                                    >
                                                                        Remove
                                                                    </Button>
                                                                )}
                                                            </div>

                                                            <div className="space-y-2">
                                                                <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Full Name <span className="text-red-500">*</span></Label>
                                                                <Input
                                                                    value={traveler.name}
                                                                    onChange={(e) => {
                                                                        const newTravelers = [...departureTravelers];
                                                                        newTravelers[idx].name = e.target.value;
                                                                        setDepartureTravelers(newTravelers);
                                                                    }}
                                                                    placeholder="Enter full name"
                                                                    className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                                                                />
                                                            </div>

                                                            <div className="space-y-2">
                                                                <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Mode of Travel <span className="text-red-500">*</span></Label>
                                                                <select
                                                                    className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-base focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 transition"
                                                                    value={traveler.mode_of_travel}
                                                                    onChange={(e) => {
                                                                        const newTravelers = [...departureTravelers];
                                                                        newTravelers[idx].mode_of_travel = e.target.value;
                                                                        setDepartureTravelers(newTravelers);
                                                                    }}
                                                                >
                                                                    <option value="">- Select Option -</option>
                                                                    <option value="Bus">Bus</option>
                                                                    <option value="Train">Train</option>
                                                                    <option value="By Air">By Air</option>
                                                                </select>
                                                            </div>

                                                            {/* Station/Airport Name */}
                                                            <div className="space-y-2">
                                                                <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                                                    Station / Airport Name <span className="text-red-500">*</span>
                                                                </Label>
                                                                <Input
                                                                    placeholder="Enter station or airport name"
                                                                    value={traveler.station_airport || ""}
                                                                    onChange={(e) => {
                                                                        const newTravelers = [...departureTravelers];
                                                                        newTravelers[idx].station_airport = e.target.value;
                                                                        setDepartureTravelers(newTravelers);
                                                                    }}
                                                                    className="w-full"
                                                                />
                                                            </div>

                                                            {/* Ticket Upload */}
                                                            <div className="space-y-2">
                                                                <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                                                    Upload Ticket <span className="text-red-500">*</span>
                                                                </Label>
                                                                <div className="relative group">
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*,application/pdf"
                                                                        className="hidden"
                                                                        id={`departure-ticket-${idx}`}
                                                                        onChange={(e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) handleDepartureTicketUpload(file, idx);
                                                                        }}
                                                                    />
                                                                    <label
                                                                        htmlFor={`departure-ticket-${idx}`}
                                                                        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 
                                                                ${traveler.ticket_url ? 'border-green-500/50 bg-green-50/50 dark:bg-green-900/10' : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-white dark:hover:bg-zinc-800'}`}
                                                                    >
                                                                        {uploadingDepartureTicket === `${idx}` ? (
                                                                            <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                                                                        ) : traveler.ticket_url ? (
                                                                            <div className="flex flex-col items-center text-green-600 dark:text-green-400 space-y-2">
                                                                                <Check className="w-8 h-8" />
                                                                                <span className="text-sm font-medium">Ticket Uploaded</span>
                                                                                <span className="text-xs text-zinc-500">Click to change</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex flex-col items-center justify-center text-zinc-400 space-y-2">
                                                                                <div className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                                                                                    <Upload className="w-4 h-4" />
                                                                                </div>
                                                                                <span className="text-xs font-medium">Upload Ticket</span>
                                                                                <span className="text-xs text-zinc-500">
                                                                                    Required
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* Add Family Member Button */}
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="w-full border-dashed border-2 py-6 text-zinc-500 hover:text-zinc-900 hover:border-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                                        onClick={() => {
                                                            const newTravelers = [
                                                                ...departureTravelers,
                                                                { name: "", mode_of_travel: "", station_airport: "", ticket_url: "" }
                                                            ];
                                                            setDepartureTravelers(newTravelers);
                                                        }}
                                                    >
                                                        + Add Family Member
                                                    </Button>
                                                </div>

                                                {/* Message */}
                                                <div className="space-y-3">
                                                    <Label>Message (Optional)</Label>
                                                    <Textarea
                                                        placeholder="Any words for the host?"
                                                        value={departureMessage}
                                                        onChange={(e) => setDepartureMessage(e.target.value)}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {/* Submit Button - Always visible */}
                                        {isDepartureApplicable !== null && (
                                            <Button type="submit" className="w-full h-12 text-base rounded-xl" disabled={submittingDeparture}>
                                                {submittingDeparture ? <Loader2 className="animate-spin w-4 h-4" /> : "Submit Departure Details"}
                                            </Button>
                                        )}
                                    </form>
                                )}
                            </motion.div>
                        )}

                        {/* STEP 4: SUCCESS */}
                        {step === "success" && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center space-y-6 bg-white dark:bg-zinc-900 p-12 rounded-3xl shadow-xl border border-zinc-100 dark:border-zinc-800 max-w-md mx-auto"
                            >
                                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-400">
                                    <Check className="w-10 h-10" />
                                </div>
                                <h2 className="text-3xl font-bold">You're all set!</h2>
                                <p className="text-zinc-500">
                                    {status === 'accepted' ? "We can't wait to see you there." : "We're sorry you can't make it."}
                                </p>

                                <Button variant="outline" onClick={() => window.location.reload()}>
                                    Back to Event
                                </Button>
                            </motion.div>
                        )}


                    </AnimatePresence>
                </div>
            </div>
        </>
    );
}
