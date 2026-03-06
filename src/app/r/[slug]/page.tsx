"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Calendar, Check, Search, ArrowRight, ArrowLeft, Upload, ChevronDown, FileText } from "lucide-react";
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
    const [step, setStep] = useState<"landing" | "search" | "form" | "success" | "transport">("landing");
    const [activeSection, setActiveSection] = useState<"rsvp" | "transport">("rsvp");
    const [transportType, setTransportType] = useState<"arrival" | "departure">("arrival");
    const [isTransportApplicable, setIsTransportApplicable] = useState<boolean | null>(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Guest[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

    // Form State
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [status, setStatus] = useState<"accepted" | "declined">("accepted");
    const [attendingCount, setAttendingCount] = useState(1);
    const [attendees, setAttendees] = useState<any[]>([]);
    const [message, setMessage] = useState("");
    const [dietary, setDietary] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null); // "index-front" or "index-back"

    // Transport Details State (Arrival)
    const [arrivalDate, setArrivalDate] = useState("");
    const [arrivalTime, setArrivalTime] = useState("");
    const [arrivalTravelers, setArrivalTravelers] = useState<any[]>([]);
    const [uploadingArrivalTicket, setUploadingArrivalTicket] = useState<string | null>(null);

    // Transport Details State (Departure)
    const [departureDate, setDepartureDate] = useState("");
    const [departureTime, setDepartureTime] = useState("");
    const [departureTravelers, setDepartureTravelers] = useState<any[]>([]);

    const [transportMessage, setTransportMessage] = useState("");
    const [uploadingTicket, setUploadingTicket] = useState<string | null>(null);
    const [submittingTransport, setSubmittingTransport] = useState(false);
    const [expandedGuest, setExpandedGuest] = useState<number | null>(null); // index of expanded additional guest (null = all collapsed)

    useEffect(() => {
        fetchEvent();
    }, [slug]);


    useEffect(() => {
        if (selectedGuest) {
            setEmail(selectedGuest.email || "");
            setPhone(selectedGuest.phone || "");
            setPhone(selectedGuest.phone || "");

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

    // Convert ALL pages of a PDF into a single stitched JPEG Blob
    const convertPdfToImageBlob = async (file: File): Promise<Blob> => {
        // Dynamically import so pdfjs only loads in the browser (avoids SSR DOMMatrix crash)
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        const scale = 2; // 2× for quality
        const gap = 20; // px gap between pages

        // Render each page to its own canvas
        const pageCanvases: HTMLCanvasElement[] = [];
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvas, viewport } as any).promise;
            pageCanvases.push(canvas);
        }

        // Stitch all pages vertically onto one tall canvas
        const totalWidth = Math.max(...pageCanvases.map(c => c.width));
        const totalHeight = pageCanvases.reduce((sum, c) => sum + c.height, 0) + gap * (numPages - 1);

        const stitched = document.createElement("canvas");
        stitched.width = totalWidth;
        stitched.height = totalHeight;
        const ctx = stitched.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, totalWidth, totalHeight);

        let yOffset = 0;
        for (const pageCanvas of pageCanvases) {
            // Center narrower pages horizontally
            const xOffset = Math.floor((totalWidth - pageCanvas.width) / 2);
            ctx.drawImage(pageCanvas, xOffset, yOffset);
            yOffset += pageCanvas.height + gap;
        }

        return new Promise<Blob>((resolve, reject) => {
            stitched.toBlob(
                (blob) => blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")),
                "image/jpeg",
                0.92
            );
        });
    };

    const handleFileUpload = async (file: File, index: number, field: "id_front" | "id_back") => {
        try {
            setUploading(`${index}-${field}`);

            let uploadFile: File | Blob = file;
            let fileExt = file.name.split('.').pop()?.toLowerCase();

            // If it's a PDF, convert the first page to a JPEG before uploading
            if (file.type === "application/pdf" || fileExt === "pdf") {
                const jpegBlob = await convertPdfToImageBlob(file);
                uploadFile = jpegBlob;
                fileExt = "jpg";
            }

            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${event?.id}/${selectedGuest?.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("guest-ids")
                .upload(filePath, uploadFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from("guest-ids")
                .getPublicUrl(filePath);

            setAttendees(prev => {
                const newAttendees = [...prev];
                newAttendees[index] = { ...newAttendees[index], [field]: publicUrl };
                return newAttendees;
            });

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
                    if (!a.name || !a.age || !a.id_front) {
                        alert(`Please fill all details for Guest ${i + 1} (Name, Age, and Front ID image)`);
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
                    ticket_url: "",
                    contact_number: "",
                    number_of_pax: "1",
                    transport_number: "",
                    pickup_location: "",
                    drop_location: "",
                    number_of_bags: "0",
                    number_of_vehicles: "1"
                }));
                setDepartureTravelers(travelers);
                setArrivalTravelers([...travelers]);

                // Switch to transport section instead of showing success
                setActiveSection("transport");
                alert("RSVP submitted successfully! Please complete your Transport Details.");
            } else {
                // Show success screen if declined or transport details already exist
                setStep("success");
            }
        } catch (error: any) {
            alert("Error submitting RSVP: " + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleTicketUpload = async (file: File, index: number, type: "arrival" | "departure") => {
        try {
            setUploadingTicket(`${type}-${index}`);
            const fileExt = file.name.split('.').pop();
            const fileName = `${type}-ticket-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${event?.id}/${selectedGuest?.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("guest-ids")
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from("guest-ids")
                .getPublicUrl(filePath);

            if (type === "arrival") {
                const newTravelers = [...arrivalTravelers];
                newTravelers[index] = { ...newTravelers[index], ticket_url: publicUrl };
                setArrivalTravelers(newTravelers);
            } else {
                const newTravelers = [...departureTravelers];
                newTravelers[index] = { ...newTravelers[index], ticket_url: publicUrl };
                setDepartureTravelers(newTravelers);
            }

        } catch (error: any) {
            alert("Ticket upload failed: " + error.message);
        } finally {
            setUploadingTicket(null);
        }
    };

    const handleSubmitTransport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGuest) return;
        setSubmittingTransport(true);

        try {
            // Prepare transport details
            const transportDetails: any = {
                applicable: isTransportApplicable !== false,
                message: transportMessage,
            };

            if (isTransportApplicable !== false) {
                transportDetails.arrival = {
                    date: arrivalDate,
                    time: arrivalTime,
                    travelers: arrivalTravelers
                };
                transportDetails.departure = {
                    date: departureDate,
                    time: departureTime,
                    travelers: departureTravelers
                };
            }

            const { error } = await supabase
                .from("guests")
                .update({
                    departure_details: transportDetails // Keeping same column name for now
                })
                .eq("id", selectedGuest.id);

            if (error) throw error;

            success("Transport details submitted successfully!");
            setStep("success");
        } catch (err: any) {
            error("Error submitting transport details: " + err.message);
        } finally {
            setSubmittingTransport(false);
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
                                            setActiveSection("transport");
                                            // Initialize travelers from attendees if not already done
                                            if (departureTravelers.length === 0 && attendees.length > 0) {
                                                const travelers = attendees.map((attendee) => ({
                                                    name: attendee.name,
                                                    mode_of_travel: "",
                                                    station_airport: "",
                                                    ticket_url: "",
                                                    contact_number: "",
                                                    number_of_pax: "1",
                                                    transport_number: "",
                                                    pickup_location: "",
                                                    drop_location: "",
                                                    number_of_bags: "0",
                                                    number_of_vehicles: "1"
                                                }));
                                                setDepartureTravelers(travelers);
                                                setArrivalTravelers([...travelers]);
                                            }
                                        }}
                                        className={`flex-1 px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${activeSection === "transport"
                                            ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
                                            : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                                            }`}
                                    >
                                        Transport
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




                                        <div className="space-y-6 border-zinc-100 dark:border-zinc-800">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-medium text-lg">Guest Details & ID Verification</h3>
                                                <div className="text-sm text-zinc-500">
                                                    {attendees.length} Guests Attending
                                                </div>
                                            </div>

                                            {attendees.map((attendee, idx) => {
                                                const isMain = idx === 0;
                                                const isExpanded = isMain || expandedGuest === idx;

                                                // Shared inner content for any guest
                                                const guestFormBody = (
                                                    <div className="space-y-5 pt-4">
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

                                                        {/* Age Field */}
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
                                                                        accept="image/*,.pdf,application/pdf"
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
                                                                            attendee.id_front.toLowerCase().includes('.pdf') ? (
                                                                                <div className="flex flex-col items-center justify-center space-y-2">
                                                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                                                                        <FileText className="w-4 h-4 text-red-500" />
                                                                                        <span className="text-xs font-semibold text-red-600 dark:text-red-400">PDF</span>
                                                                                    </div>
                                                                                    <a href={attendee.id_front} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 underline" onClick={e => e.stopPropagation()}>View PDF</a>
                                                                                    <span className="text-xs text-zinc-400">Click to change</span>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="relative w-full h-full overflow-hidden rounded-xl">
                                                                                    <img src={attendee.id_front} alt="Front ID" className="object-cover w-full h-full" />
                                                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">Change</div>
                                                                                </div>
                                                                            )
                                                                        ) : (
                                                                            <div className="flex flex-col items-center justify-center text-zinc-400 space-y-2">
                                                                                <div className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                                                                                    <Upload className="w-4 h-4" />
                                                                                </div>
                                                                                <span className="text-xs font-medium">Upload Front</span>
                                                                                <span className="text-xs text-zinc-400">Image or PDF</span>
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
                                                                        accept="image/*,.pdf,application/pdf"
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
                                                                            attendee.id_back.toLowerCase().includes('.pdf') ? (
                                                                                <div className="flex flex-col items-center justify-center space-y-2">
                                                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                                                                        <FileText className="w-4 h-4 text-red-500" />
                                                                                        <span className="text-xs font-semibold text-red-600 dark:text-red-400">PDF</span>
                                                                                    </div>
                                                                                    <a href={attendee.id_back} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 underline" onClick={e => e.stopPropagation()}>View PDF</a>
                                                                                    <span className="text-xs text-zinc-400">Click to change</span>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="relative w-full h-full overflow-hidden rounded-xl">
                                                                                    <img src={attendee.id_back} alt="Back ID" className="object-cover w-full h-full" />
                                                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">Change</div>
                                                                                </div>
                                                                            )
                                                                        ) : (
                                                                            <div className="flex flex-col items-center justify-center text-zinc-400 space-y-2">
                                                                                <div className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                                                                                    <Upload className="w-4 h-4" />
                                                                                </div>
                                                                                <span className="text-xs font-medium">Upload Back</span>
                                                                                <span className="text-xs text-zinc-400">Image or PDF</span>
                                                                            </div>
                                                                        )}
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );

                                                if (isMain) {
                                                    // Main Guest — always visible, never collapsible
                                                    return (
                                                        <div key={idx} className="relative p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800">
                                                            <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Main Guest</h4>
                                                            {guestFormBody}
                                                        </div>
                                                    );
                                                }

                                                // Additional guests — accordion style
                                                return (
                                                    <div key={idx} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                                                        {/* Clickable header */}
                                                        <button
                                                            type="button"
                                                            onClick={() => setExpandedGuest(expandedGuest === idx ? null : idx)}
                                                            className="w-full flex items-center justify-between px-6 py-4 bg-zinc-50 dark:bg-zinc-800/30 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
                                                        >
                                                            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                                                                Show Guest {idx + 1}
                                                            </span>
                                                            <motion.div
                                                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                                                transition={{ duration: 0.25 }}
                                                            >
                                                                <ChevronDown className="w-4 h-4 text-zinc-500" />
                                                            </motion.div>
                                                        </button>

                                                        {/* Animated body */}
                                                        <AnimatePresence initial={false}>
                                                            {isExpanded && (
                                                                <motion.div
                                                                    key="body"
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: "auto", opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                                                    style={{ overflow: "hidden" }}
                                                                >
                                                                    <div className="px-6 pb-6 bg-zinc-50 dark:bg-zinc-800/30 space-y-0">
                                                                        <div className="flex justify-end pt-2">
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 h-8 px-2"
                                                                                onClick={() => {
                                                                                    const newA = attendees.filter((_, i) => i !== idx);
                                                                                    setAttendees(newA);
                                                                                    setAttendingCount(newA.length);
                                                                                    setExpandedGuest(null);
                                                                                }}
                                                                            >
                                                                                Remove
                                                                            </Button>
                                                                        </div>
                                                                        {guestFormBody}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            })}

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

                                {/* Transport Section */}
                                {activeSection === "transport" && (
                                    <form onSubmit={handleSubmitTransport} className="space-y-6">

                                        {/* Transport Selection Table (Arrival / Departure) */}
                                        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                                            <button
                                                type="button"
                                                onClick={() => setTransportType("arrival")}
                                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${transportType === "arrival" ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm" : "text-zinc-500"}`}
                                            >
                                                Arrival
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setTransportType("departure")}
                                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${transportType === "departure" ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm" : "text-zinc-500"}`}
                                            >
                                                Departure
                                            </button>
                                        </div>

                                        <div className="space-y-4 border rounded-2xl p-6 bg-zinc-50 dark:bg-zinc-800/30">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-medium text-lg">{transportType === "arrival" ? "Arrival" : "Departure"} Details</h3>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsTransportApplicable(true)}
                                                        className={`px-3 py-1 rounded-md text-xs font-medium border ${isTransportApplicable === true ? "bg-blue-600 border-blue-600 text-white" : "border-zinc-300 dark:border-zinc-700 hover:border-blue-400"}`}
                                                    >
                                                        Yes
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsTransportApplicable(false)}
                                                        className={`px-3 py-1 rounded-md text-xs font-medium border ${isTransportApplicable === false ? "bg-blue-600 border-blue-600 text-white" : "border-zinc-300 dark:border-zinc-700 hover:border-blue-400"}`}
                                                    >
                                                        No
                                                    </button>
                                                </div>
                                            </div>

                                            {isTransportApplicable !== false && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>{transportType === "arrival" ? "Arrival" : "Departure"} Date</Label>
                                                        <Input
                                                            type="date"
                                                            value={transportType === "arrival" ? arrivalDate : departureDate}
                                                            onChange={(e) => transportType === "arrival" ? setArrivalDate(e.target.value) : setDepartureDate(e.target.value)}
                                                            className="bg-white dark:bg-zinc-900"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>{transportType === "arrival" ? "Arrival" : "Departure"} Time</Label>
                                                        <Input
                                                            type="time"
                                                            value={transportType === "arrival" ? arrivalTime : departureTime}
                                                            onChange={(e) => transportType === "arrival" ? setArrivalTime(e.target.value) : setDepartureTime(e.target.value)}
                                                            className="bg-white dark:bg-zinc-900"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {isTransportApplicable !== false && (
                                            <div className="space-y-4">
                                                {(transportType === "arrival" ? arrivalTravelers : departureTravelers).map((traveler, idx) => (
                                                    <div key={idx} className="relative p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 space-y-4">
                                                        <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                                                            {idx === 0 ? "Main Guest" : `Family Member ${idx}`}
                                                        </h4>

                                                        <div className="space-y-2">
                                                            <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Full Name</Label>
                                                            <Input
                                                                value={traveler.name}
                                                                onChange={(e) => {
                                                                    const newTravelers = [...(transportType === "arrival" ? arrivalTravelers : departureTravelers)];
                                                                    newTravelers[idx].name = e.target.value;
                                                                    transportType === "arrival" ? setArrivalTravelers(newTravelers) : setDepartureTravelers(newTravelers);
                                                                }}
                                                                placeholder="Enter full name"
                                                                className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                                                            />
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Mode</Label>
                                                                <select
                                                                    className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-base focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 transition"
                                                                    value={traveler.mode_of_travel}
                                                                    onChange={(e) => {
                                                                        const newTravelers = [...(transportType === "arrival" ? arrivalTravelers : departureTravelers)];
                                                                        newTravelers[idx].mode_of_travel = e.target.value;
                                                                        transportType === "arrival" ? setArrivalTravelers(newTravelers) : setDepartureTravelers(newTravelers);
                                                                    }}
                                                                >
                                                                    <option value="">Select</option>
                                                                    <option value="Bus">Bus</option>
                                                                    <option value="Train">Train</option>
                                                                    <option value="By Air">By Air</option>
                                                                </select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                                                    {traveler.mode_of_travel === "By Air" ? "Airport" : traveler.mode_of_travel === "Train" ? "Station" : traveler.mode_of_travel === "Bus" ? "Bus Stand" : "Station/Airport"}
                                                                </Label>
                                                                <Input
                                                                    placeholder="Name"
                                                                    value={traveler.station_airport || ""}
                                                                    onChange={(e) => {
                                                                        const newTravelers = [...(transportType === "arrival" ? arrivalTravelers : departureTravelers)];
                                                                        newTravelers[idx].station_airport = e.target.value;
                                                                        transportType === "arrival" ? setArrivalTravelers(newTravelers) : setDepartureTravelers(newTravelers);
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Optional New Fields for Arrival */}
                                                        {transportType === "arrival" && (
                                                            <div className="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-2">
                                                                        <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Contact Number</Label>
                                                                        <Input
                                                                            type="tel"
                                                                            placeholder="Phone"
                                                                            value={traveler.contact_number || ""}
                                                                            onChange={(e) => {
                                                                                const newT = [...arrivalTravelers];
                                                                                newT[idx].contact_number = e.target.value;
                                                                                setArrivalTravelers(newT);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Number of Pax</Label>
                                                                        <Input
                                                                            type="number"
                                                                            value={traveler.number_of_pax || "1"}
                                                                            onChange={(e) => {
                                                                                const newT = [...arrivalTravelers];
                                                                                newT[idx].number_of_pax = e.target.value;
                                                                                setArrivalTravelers(newT);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-1 gap-4">
                                                                    <div className="space-y-2">
                                                                        <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                                                            {traveler.mode_of_travel === "By Air" ? "Flight Number" : traveler.mode_of_travel === "Train" ? "Train Number" : traveler.mode_of_travel === "Bus" ? "Bus Number" : "Transport Number"}
                                                                        </Label>
                                                                        <Input
                                                                            placeholder="Number"
                                                                            value={traveler.transport_number || ""}
                                                                            onChange={(e) => {
                                                                                const newT = [...arrivalTravelers];
                                                                                newT[idx].transport_number = e.target.value;
                                                                                setArrivalTravelers(newT);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-2">
                                                                        <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Pickup Location</Label>
                                                                        <Input
                                                                            placeholder="Pickup"
                                                                            value={traveler.pickup_location || ""}
                                                                            onChange={(e) => {
                                                                                const newT = [...arrivalTravelers];
                                                                                newT[idx].pickup_location = e.target.value;
                                                                                setArrivalTravelers(newT);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Drop Location / Hotel</Label>
                                                                        <Input
                                                                            placeholder="Drop off"
                                                                            value={traveler.drop_location || ""}
                                                                            onChange={(e) => {
                                                                                const newT = [...arrivalTravelers];
                                                                                newT[idx].drop_location = e.target.value;
                                                                                setArrivalTravelers(newT);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-2">
                                                                        <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Number of Bags</Label>
                                                                        <Input
                                                                            type="number"
                                                                            value={traveler.number_of_bags || "0"}
                                                                            onChange={(e) => {
                                                                                const newT = [...arrivalTravelers];
                                                                                newT[idx].number_of_bags = e.target.value;
                                                                                setArrivalTravelers(newT);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Number of Vehicles</Label>
                                                                        <Input
                                                                            type="number"
                                                                            value={traveler.number_of_vehicles || "1"}
                                                                            onChange={(e) => {
                                                                                const newT = [...arrivalTravelers];
                                                                                newT[idx].number_of_vehicles = e.target.value;
                                                                                setArrivalTravelers(newT);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="space-y-2">
                                                            <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Upload Ticket</Label>
                                                            <div className="relative group">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*,application/pdf"
                                                                    className="hidden"
                                                                    id={`ticket-${transportType}-${idx}`}
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) handleTicketUpload(file, idx, transportType);
                                                                    }}
                                                                />
                                                                <label
                                                                    htmlFor={`ticket-${transportType}-${idx}`}
                                                                    className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 
                                                                    ${traveler.ticket_url ? 'border-green-500/50 bg-green-50/50 dark:bg-green-900/10' : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'}`}
                                                                >
                                                                    {uploadingTicket === `${transportType}-${idx}` ? (
                                                                        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                                                                    ) : traveler.ticket_url ? (
                                                                        <span className="text-xs font-medium text-green-600">Uploaded</span>
                                                                    ) : (
                                                                        <div className="flex flex-col items-center text-zinc-400">
                                                                            <Upload className="w-4 h-4 mb-1" />
                                                                            <span className="text-xs">Upload</span>
                                                                        </div>
                                                                    )}
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            <Label>Transport Message (Optional)</Label>
                                            <Textarea
                                                placeholder="Any words for the host?"
                                                value={transportMessage}
                                                onChange={(e) => setTransportMessage(e.target.value)}
                                            />
                                        </div>

                                        <Button type="submit" className="w-full h-12 text-base rounded-xl" disabled={submittingTransport}>
                                            {submittingTransport ? <Loader2 className="animate-spin w-4 h-4" /> : "Submit Transport Details"}
                                        </Button>
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
