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
    status: string;
    allowed_guests: number;
    attending_count: number;
    attendees_data?: any[];
    departure_details?: {
        applicable?: boolean;
        arrival_applicable?: boolean;
        departure_applicable?: boolean;
        arrival?: {
            date?: string;
            time?: string;
            travelers?: any[];
        };
        departure?: {
            date?: string;
            time?: string;
            travelers?: any[];
        };
        message?: string;
    };
};

const StepWrapper = ({
    stepNumber,
    question,
    children,
    onNext,
    onPrev,
    showPrev = true,
    isLast = false,
    isSubmitting = false,
    activeSection
}: {
    stepNumber: number;
    question: string;
    children: React.ReactNode;
    onNext: () => void;
    onPrev?: () => void;
    showPrev?: boolean;
    isLast?: boolean;
    isSubmitting?: boolean;
    activeSection: string;
}) => (
    <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-4 py-2 px-4 md:px-0"
    >
        <div className="space-y-2">
            <div className="flex items-center gap-3 text-zinc-400 dark:text-zinc-500 font-medium">
                <span className="text-blue-500 text-xs">{stepNumber} →</span>
                <span className="text-xs tracking-wide uppercase">{activeSection === 'rsvp' ? 'RSVP' : 'Transport'}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
                {question}
            </h2>
        </div>

        <div className="py-1">
            {children}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <div className="flex items-center gap-4 w-full sm:w-auto">
                {!isLast ? (
                    <Button type="button"
                        size="lg"
                        onClick={onNext}
                        className="rounded-xl px-8 h-11 text-sm font-semibold shadow-md active:scale-95 transition-all"
                    >
                        Continue
                    </Button>
                ) : (
                    <Button
                        size="lg"
                        type="submit"
                        disabled={isSubmitting}
                        className="rounded-xl px-8 h-11 text-sm font-semibold shadow-md active:scale-95 transition-all"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : 'Complete'}
                    </Button>
                )}

                <div className="hidden sm:block text-xs text-zinc-400 font-medium">
                    press <span className="font-bold border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-0.5 bg-zinc-50 dark:bg-zinc-900 mx-1">Enter ↵</span>
                </div>
            </div>
        </div>
    </motion.div>
);

export default function PublicEventPage() {
    const params = useParams();
    const slug = params.slug as string;
    const { toasts, removeToast, success, error, warning, info } = useToast();

    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState<"landing" | "search" | "form" | "success" | "transport">("landing");
    const [activeSection, setActiveSection] = useState<"rsvp" | "transport">("rsvp");
    const [transportType, setTransportType] = useState<"arrival" | "departure">("arrival");
    const [isArrivalApplicable, setIsArrivalApplicable] = useState<boolean | null>(null);
    const [isDepartureApplicable, setIsDepartureApplicable] = useState<boolean | null>(null);
    const [isEditingRSVP, setIsEditingRSVP] = useState(false);
    const [isEditingTransport, setIsEditingTransport] = useState(false);
    const [rsvpStep, setRsvpStep] = useState(0);
    const [transportStep, setTransportStep] = useState(0);

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

            if (selectedGuest.status === "accepted" || selectedGuest.status === "declined") {
                setStatus(selectedGuest.status as "accepted" | "declined");
            }

            if (selectedGuest.attendees_data && selectedGuest.attendees_data.length > 0) {
                setAttendees(selectedGuest.attendees_data);
                setAttendingCount(selectedGuest.attendees_data.length);
            } else if (status === "accepted" && (!attendees || attendees.length === 0)) {
                setAttendees([{
                    name: selectedGuest.name,
                    age: "",
                    guest_type: "Adult",
                    id_type: "Aadhar Card",
                    id_front: "",
                    id_back: ""
                }]);
            }

            if (selectedGuest.departure_details) {
                const dd = selectedGuest.departure_details;
                setIsArrivalApplicable(dd.arrival_applicable ?? (dd.applicable === false ? false : null));
                setIsDepartureApplicable(dd.departure_applicable ?? (dd.applicable === false ? false : null));
                setTransportMessage(dd.message || "");

                if (dd.arrival) {
                    setArrivalDate(dd.arrival.date || "");
                    setArrivalTime(dd.arrival.time || "");
                    if (dd.arrival.travelers) setArrivalTravelers(dd.arrival.travelers);
                }

                if (dd.departure) {
                    setDepartureDate(dd.departure.date || "");
                    setDepartureTime(dd.departure.time || "");
                    if (dd.departure.travelers) setDepartureTravelers(dd.departure.travelers);
                }
            }
        }
    }, [selectedGuest, status]);

    // Automatically sync transport travelers with RSVP attendees
    useEffect(() => {
        if (attendees.length > 0) {
            const syncTravelers = (prevTravelers: any[]) => {
                const newTravelers = [...prevTravelers];

                // Adjust length
                if (attendees.length > newTravelers.length) {
                    for (let i = newTravelers.length; i < attendees.length; i++) {
                        newTravelers.push({
                            name: attendees[i].name,
                            mode_of_travel: "",
                            station_airport: "",
                            ticket_url: "",
                            contact_number: "",
                            number_of_pax: "1",
                            transport_number: "",
                            drop_location: "",
                            number_of_bags: "0",
                            number_of_vehicles: "1",
                            same_as_main: true
                        });
                    }
                } else if (attendees.length < newTravelers.length) {
                    newTravelers.splice(attendees.length);
                }

                // Update names if they changed in RSVP section
                // AND sync details if same_as_main is true
                const mainGuestData = newTravelers[0] || {};

                attendees.forEach((attendee, idx) => {
                    if (newTravelers[idx]) {
                        // Keep name in sync
                        if (newTravelers[idx].name !== attendee.name) {
                            newTravelers[idx].name = attendee.name;
                        }

                        // Sync with main guest if enabled (and not index 0)
                        if (idx > 0 && newTravelers[idx].same_as_main) {
                            newTravelers[idx] = {
                                ...newTravelers[idx],
                                mode_of_travel: mainGuestData.mode_of_travel,
                                station_airport: mainGuestData.station_airport,
                                transport_number: mainGuestData.transport_number,
                                drop_location: mainGuestData.drop_location,
                                number_of_bags: mainGuestData.number_of_bags,
                                number_of_vehicles: mainGuestData.number_of_vehicles,
                                contact_number: mainGuestData.contact_number,
                                number_of_pax: mainGuestData.number_of_pax,
                                same_as_main: true
                            };
                        }
                    }
                });

                return newTravelers;
            };

            setArrivalTravelers(prev => syncTravelers(prev));
            setDepartureTravelers(prev => syncTravelers(prev));
        }
    }, [attendees, arrivalTravelers[0], departureTravelers[0]]);

    const totalRsvpSteps = status === 'declined' ? 2 : (5 + (attendees?.length || 0));

    const arrivalSteps = isArrivalApplicable !== false ? (2 + arrivalTravelers.length) : 1;
    const departureSteps = isDepartureApplicable !== false ? (2 + departureTravelers.length) : 1;
    const totalTransportSteps = arrivalSteps + departureSteps + 1; // +1 for message

    const handleNextRsvp = () => {
        if (rsvpStep < totalRsvpSteps - 1) {
            setRsvpStep(rsvpStep + 1);
        }
    };

    const handlePrevRsvp = () => {
        if (rsvpStep > 0) setRsvpStep(rsvpStep - 1);
    };

    const handleNextTransport = () => {
        if (transportStep < totalTransportSteps - 1) {
            setTransportStep(transportStep + 1);
        }
    };

    const handlePrevTransport = () => {
        if (transportStep > 0) setTransportStep(transportStep - 1);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter" && !e.shiftKey) {
                // Check if target is not a textarea
                if ((e.target as HTMLElement).tagName !== 'TEXTAREA') {
                    if (activeSection === 'rsvp') {
                        if (rsvpStep < totalRsvpSteps - 1) {
                            e.preventDefault();
                            handleNextRsvp();
                        }
                    } else {
                        // Transport logic will go here
                        handleNextTransport();
                    }
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeSection, rsvpStep, transportStep, totalRsvpSteps]);

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

        if (searchQuery.trim().length < 3) {
            setSearchResults([]);
            return;
        }

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
        const scale = 2; // 2\u00d7 for quality
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

            // Update local state to reflect submission immediately
            setSelectedGuest(prev => ({
                ...prev!,
                status: status,
                email: email,
                phone: phone,
                attending_count: status === 'accepted' ? attendees.length : 0,
                message: message,
                dietary_requirements: dietary,
                attendees_data: status === 'accepted' ? attendees : [],
            }));

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
                    (updatedGuest.departure_details.departure?.travelers && updatedGuest.departure_details.departure.travelers.length > 0) ||
                    (updatedGuest.departure_details.travelers && updatedGuest.departure_details.travelers.length > 0));

            if (status === 'accepted') {
                // Initialize departure travelers from attendees if not present
                if (!hasDepartureDetails) {
                    const travelers = attendees.map((attendee) => ({
                        name: attendee.name,
                        mode_of_travel: "",
                        station_airport: "",
                        ticket_url: "",
                        contact_number: "",
                        number_of_pax: "1",
                        transport_number: "",
                        drop_location: "",
                        number_of_bags: "0",
                        number_of_vehicles: "1",
                        same_as_main: true
                    }));
                    setDepartureTravelers(travelers);
                    setArrivalTravelers([...travelers]);
                }

                // Switch to transport section
                setActiveSection("transport");
                setIsEditingRSVP(false);
                success("RSVP submitted successfully! Please provide your travel details.");
            } else {
                // Show success screen if declined
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
                applicable: isArrivalApplicable !== false || isDepartureApplicable !== false,
                arrival_applicable: isArrivalApplicable !== false,
                departure_applicable: isDepartureApplicable !== false,
                message: transportMessage,
            };

            if (isArrivalApplicable !== false) {
                transportDetails.arrival = {
                    date: arrivalDate,
                    time: arrivalTime,
                    travelers: arrivalTravelers
                };
            }
            if (isDepartureApplicable !== false) {
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

            // Update local state to reflect submission
            setSelectedGuest({
                ...selectedGuest,
                departure_details: transportDetails
            });

            if (transportType === "arrival" && isArrivalApplicable !== false) {
                setTransportType("departure");
                success("Arrival details saved! Please add departure details.");
            } else {
                success("Transport details submitted successfully!");
                setIsEditingTransport(false);
                setStep("success");
            }
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
            <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col items-center justify-center p-2 font-sans">
                <div className="w-full max-w-lg my-2">
                    <AnimatePresence mode="wait">

                        {/* STEP 1: LANDING */}
                        {step === "landing" && (
                            <motion.div
                                key="landing"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="text-center space-y-4"
                            >
                                <div className="space-y-2">
                                    <span className="inline-block px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-medium tracking-wider uppercase text-zinc-500">You are invited</span>
                                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{event.name}</h1>
                                    <div className="flex flex-col items-center gap-2 text-zinc-500 dark:text-zinc-400">
                                        <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {format(new Date(event.date), "MMMM d, h:mm a")}</div>
                                        <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {event.location}</div>
                                    </div>
                                </div>

                                {event.description && (
                                    <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed text-sm">
                                        {event.description}
                                    </p>
                                )}

                                <Button
                                    onClick={() => setStep("search")}
                                    className="w-full sm:w-auto px-8 h-11 text-sm bg-zinc-900 dark:bg-zinc-50 text-white dark:text-black rounded-full hover:scale-105 transition-transform"
                                >
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
                                className="bg-white dark:bg-zinc-900 p-5 rounded-3xl shadow-xl border border-zinc-100 dark:border-zinc-800"
                            >
                                <div className="mb-3">
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
                                            className="pl-10 h-10 text-base"
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
                                    {searchQuery.trim().length > 0 && searchQuery.trim().length < 3 && (
                                        <p className="text-center text-zinc-400 text-sm py-4">Please enter at least 3 characters to search.</p>
                                    )}
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
                                    {searchResults.length === 0 && searchQuery.trim().length >= 3 && !searching && (
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
                                className="bg-white dark:bg-zinc-900 p-5 rounded-3xl shadow-xl border border-zinc-100 dark:border-zinc-800 relative overflow-hidden"
                            >
                                {/* Progress Bar */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-zinc-100 dark:bg-zinc-800">
                                    <motion.div 
                                        className="h-full bg-zinc-900 dark:bg-zinc-50"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${activeSection === 'rsvp' 
                                            ? ((rsvpStep + 1) / totalRsvpSteps) * 100 
                                            : ((transportStep + 1) / totalTransportSteps) * 100}%` }}
                                        transition={{ duration: 0.5, ease: "easeInOut" }}
                                    />
                                </div>
                                <div className="mb-3">
                                    <Button variant="ghost" size="sm" className="-ml-2 mb-1 text-zinc-400" onClick={() => {
                                        if (activeSection === 'transport') {
                                            if (transportStep > 0) handlePrevTransport();
                                            else setActiveSection('rsvp');
                                        } else {
                                            if (rsvpStep > 0) handlePrevRsvp();
                                            else setStep("search");
                                        }
                                    }}>
                                        <ArrowLeft className="w-4 h-4 mr-1" /> Back
                                    </Button>
                                    <h2 className="text-xl font-semibold">Hi, {selectedGuest.name}</h2>
                                    <p className="text-zinc-500 text-sm">Will you be joining us?</p>
                                </div>

                                {/* Status Message */}
                                {selectedGuest.status !== 'pending' && (
                                    <div className={`p-4 rounded-xl mb-6 text-sm border flex items-start gap-3 ${selectedGuest.departure_details?.arrival_applicable !== undefined || selectedGuest.departure_details?.departure_applicable !== undefined
                                            ? "bg-green-50 border-green-100 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300"
                                            : "bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300"
                                        }`}>
                                        <div className="mt-0.5">
                                            {selectedGuest.departure_details?.arrival_applicable !== undefined || selectedGuest.departure_details?.departure_applicable !== undefined
                                                ? <Check className="w-4 h-4" />
                                                : <Loader2 className="w-4 h-4 animate-spin" />
                                            }
                                        </div>
                                        <div>
                                            {selectedGuest.departure_details?.arrival_applicable !== undefined || selectedGuest.departure_details?.departure_applicable !== undefined ? (
                                                <>
                                                    <p className="font-semibold">Your information is already submitted.</p>
                                                    <p className="opacity-80">You can edit or add details below if needed.</p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="font-semibold">Your RSVP is submitted.</p>
                                                    <p className="opacity-80">Your arrival and departure details are pending.</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Toggle Buttons */}
                                <div className="flex gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl mb-4">
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
                                    selectedGuest.status !== 'pending' && !isEditingRSVP ? (
                                        <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center space-y-4">
                                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-400">
                                                <Check className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-zinc-900 dark:text-zinc-50">RSVP Already Submitted</p>
                                                <p className="text-sm text-zinc-500">You have already responded to this invitation.</p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                onClick={() => setIsEditingRSVP(true)}
                                                className="w-full"
                                            >
                                                Edit information or Add members
                                            </Button>
                                            </div>
                                    ) : (
                                        <form onSubmit={handleSubmitRSVP} className="space-y-3">
                                            <AnimatePresence mode="wait">
                                                {rsvpStep === 0 && (
                                                    <StepWrapper activeSection={activeSection}
                                                        stepNumber={1}
                                                        question="Will you be joining us?"
                                                        onNext={handleNextRsvp}
                                                        showPrev={false}
                                                    >
                                                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                                            <button
                                                                type="button"
                                                                onClick={() => { setStatus("accepted"); handleNextRsvp(); }}
                                                                className={`flex-1 py-4 sm:py-5 rounded-2xl border-2 transition-all text-base sm:text-lg font-bold ${status === 'accepted' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-400'}`}
                                                            >
                                                                Yes, I'm coming!
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setStatus("declined"); setRsvpStep(1); }}
                                                                className={`flex-1 py-4 sm:py-5 rounded-2xl border-2 transition-all text-base sm:text-lg font-bold ${status === 'declined' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-400'}`}
                                                            >
                                                                Regretfully, no
                                                            </button>
                                                        </div>
                                                    </StepWrapper>
                                                )}

                                                {status === 'accepted' && rsvpStep === 1 && (
                                                    <StepWrapper activeSection={activeSection}
                                                        stepNumber={2}
                                                        question="How many members are attending?"
                                                        onNext={handleNextRsvp}
                                                        onPrev={handlePrevRsvp}
                                                    >
                                                        <select
                                                            className="w-full h-12 px-6 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900 transition"
                                                            value={attendingCount}
                                                            onChange={(e) => {
                                                                const count = parseInt(e.target.value);
                                                                setAttendingCount(count);
                                                                const newAttendees = [...attendees];
                                                                if (count > attendees.length) {
                                                                    for (let i = attendees.length; i < count; i++) {
                                                                        newAttendees.push({ name: "", age: "", guest_type: "Adult", id_type: "Aadhar Card", id_front: "", id_back: "" });
                                                                    }
                                                                } else if (count < attendees.length) {
                                                                    newAttendees.splice(count);
                                                                }
                                                                setAttendees(newAttendees);
                                                            }}
                                                        >
                                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                                                <option key={num} value={num}>{num} Member{num > 1 ? 's' : ''}</option>
                                                            ))}
                                                        </select>
                                                    </StepWrapper>
                                                )}

                                                {status === 'accepted' && rsvpStep === 2 && (
                                                    <StepWrapper activeSection={activeSection}
                                                        stepNumber={3}
                                                        question="What's your email address?"
                                                        onNext={handleNextRsvp}
                                                        onPrev={handlePrevRsvp}
                                                    >
                                                        <Input
                                                            type="email"
                                                            placeholder="your@email.com"
                                                            value={email}
                                                            onChange={(e) => setEmail(e.target.value)}
                                                            className="h-12 text-lg px-6 rounded-2xl border-2"
                                                            autoFocus
                                                        />
                                                    </StepWrapper>
                                                )}

                                                {status === 'accepted' && rsvpStep === 3 && (
                                                    <StepWrapper activeSection={activeSection}
                                                        stepNumber={4}
                                                        question="And your phone number?"
                                                        onNext={handleNextRsvp}
                                                        onPrev={handlePrevRsvp}
                                                    >
                                                        <Input
                                                            type="tel"
                                                            placeholder="Your phone number"
                                                            value={phone}
                                                            onChange={(e) => setPhone(e.target.value)}
                                                            className="h-12 text-lg px-6 rounded-2xl border-2"
                                                            required
                                                            autoFocus
                                                        />
                                                    </StepWrapper>
                                                )}

                                                {status === 'accepted' && attendees.map((attendee, idx) => 
                                                    rsvpStep === (4 + idx) && (
                                                        <StepWrapper activeSection={activeSection}
                                                            key={idx}
                                                            stepNumber={5 + idx}
                                                            question={idx === 0 ? "Tell us about yourself" : `Details for Guest ${idx + 1}`}
                                                            onNext={handleNextRsvp}
                                                            onPrev={handlePrevRsvp}
                                                        >
                                                            <div className="space-y-6">
                                                                <div className="space-y-2">
                                                                    <Label className="text-sm font-medium text-zinc-500 uppercase">Full Name</Label>
                                                                    <Input
                                                                        value={attendee.name}
                                                                        onChange={(e) => {
                                                                            const newA = [...attendees];
                                                                            newA[idx].name = e.target.value;
                                                                            setAttendees(newA);
                                                                        }}
                                                                        placeholder="Enter full name"
                                                                        className="h-11 text-base px-4 rounded-xl border-2"
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-sm font-medium text-zinc-500 uppercase">Age</Label>
                                                                    <Input
                                                                        type="number"
                                                                        value={attendee.age}
                                                                        onChange={(e) => {
                                                                            const newA = [...attendees];
                                                                            newA[idx].age = e.target.value;
                                                                            setAttendees(newA);
                                                                        }}
                                                                        placeholder="Enter age"
                                                                        className="h-11 text-base px-4 rounded-xl border-2"
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-sm font-medium text-zinc-500 uppercase">ID Document Type</Label>
                                                                    <select
                                                                        className="w-full h-11 px-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-base focus:outline-none focus:ring-2 focus:ring-zinc-900 transition"
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
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                    <div className="space-y-2">
                                                                        <Label className="text-sm font-medium text-zinc-500 uppercase">Front ID</Label>
                                                                        <div className="relative group">
                                                                            <input type="file" className="hidden" id={`file-${idx}-front`} onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file, idx, "id_front"); }} />
                                                                            <label htmlFor={`file-${idx}-front`} className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${attendee.id_front ? 'border-green-500 bg-green-50' : 'border-zinc-300 hover:border-zinc-400'}`}>
                                                                                {uploading === `${idx}-id_front` ? <Loader2 className="animate-spin" /> : attendee.id_front ? <Check className="text-green-500" /> : <Upload className="text-zinc-400" />}
                                                                                <span className="text-xs mt-2">{attendee.id_front ? 'Uploaded' : 'Upload Front'}</span>
                                                                            </label>
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label className="text-sm font-medium text-zinc-500 uppercase">Back ID</Label>
                                                                        <div className="relative group">
                                                                            <input type="file" className="hidden" id={`file-${idx}-back`} onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file, idx, "id_back"); }} />
                                                                            <label htmlFor={`file-${idx}-back`} className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${attendee.id_back ? 'border-green-500 bg-green-50' : 'border-zinc-300 hover:border-zinc-400'}`}>
                                                                                {uploading === `${idx}-id_back` ? <Loader2 className="animate-spin" /> : attendee.id_back ? <Check className="text-green-500" /> : <Upload className="text-zinc-400" />}
                                                                                <span className="text-xs mt-2">{attendee.id_back ? 'Uploaded' : 'Upload Back'}</span>
                                                                            </label>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </StepWrapper>
                                                    ))}

                                                {rsvpStep === totalRsvpSteps - 1 && (
                                                    <StepWrapper activeSection={activeSection}
                                                        stepNumber={totalRsvpSteps}
                                                        question={status === 'accepted' ? "Any words for the host?" : "We're sorry you can't make it. Any message?"}
                                                        onNext={handleSubmitRSVP as any}
                                                        onPrev={handlePrevRsvp}
                                                        isLast={true}
                                                        isSubmitting={submitting}
                                                    >
                                                        <Textarea
                                                            placeholder="Type your message here..."
                                                            value={message}
                                                            onChange={(e) => setMessage(e.target.value)}
                                                            className="min-h-[150px] text-base p-6 rounded-2xl border-2"
                                                            autoFocus
                                                        />
                                                    </StepWrapper>
                                                )}
                                            </AnimatePresence>
                                        </form>
                                    )
                                )}
 
                                {/* Transport Section */}
                                {activeSection === "transport" && (
                                    (selectedGuest.departure_details?.arrival_applicable !== undefined || selectedGuest.departure_details?.departure_applicable !== undefined) && !isEditingTransport ? (
                                        <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center space-y-4">
                                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-400">
                                                <Check className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-zinc-900 dark:text-zinc-50">Transport Details Submitted</p>
                                                <p className="text-sm text-zinc-500">Your travel information has been recorded.</p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                onClick={() => setIsEditingTransport(true)}
                                                className="w-full"
                                            >
                                                Edit transport information
                                            </Button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubmitTransport} className="space-y-3">
                                            <AnimatePresence mode="wait">
                                                {/* ARRIVAL FLOW */}
                                                {transportStep === 0 && (
                                                    <StepWrapper activeSection={activeSection}
                                                        stepNumber={1}
                                                        question="Will you need arrival transport?"
                                                        onNext={handleNextTransport}
                                                        showPrev={false}
                                                    >
                                                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                                            <button
                                                                type="button"
                                                                onClick={() => { setIsArrivalApplicable(true); handleNextTransport(); }}
                                                                className={`flex-1 py-4 sm:py-5 rounded-2xl border-2 transition-all text-base sm:text-lg font-bold ${isArrivalApplicable === true ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-400'}`}
                                                            >
                                                                Yes, please
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setIsArrivalApplicable(false); setTransportStep(1); }}
                                                                className={`flex-1 py-4 sm:py-5 rounded-2xl border-2 transition-all text-base sm:text-lg font-bold ${isArrivalApplicable === false ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-400'}`}
                                                            >
                                                                No, I'm okay
                                                            </button>
                                                        </div>
                                                    </StepWrapper>
                                                )}

                                                {isArrivalApplicable && transportStep === 1 && (
                                                    <StepWrapper activeSection={activeSection}
                                                        stepNumber={2}
                                                        question="When are you arriving?"
                                                        onNext={handleNextTransport}
                                                        onPrev={handlePrevTransport}
                                                    >
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label className="text-sm font-medium text-zinc-500">Pick-up Date</Label>
                                                                <Input type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} className="h-11 text-sm rounded-xl border-2" />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-sm font-medium text-zinc-500">Pick-up Time</Label>
                                                                <Input type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} className="h-11 text-sm rounded-xl border-2" />
                                                            </div>
                                                        </div>
                                                    </StepWrapper>
                                                )}

                                                {isArrivalApplicable && arrivalTravelers.map((traveler, idx) => 
                                                    transportStep === (2 + idx) && (
                                                        <StepWrapper activeSection={activeSection}
                                                            key={`arrival-${idx}`}
                                                            stepNumber={3 + idx}
                                                            question={idx === 0 ? "Arrival details for you" : `Arrival for ${traveler.name || `Guest ${idx + 1}`}`}
                                                            onNext={handleNextTransport}
                                                            onPrev={handlePrevTransport}
                                                        >
                                                            <div className="space-y-6">
                                                                {idx > 0 && (
                                                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-50 border border-zinc-100">
                                                                        <input type="checkbox" checked={!!traveler.same_as_main} onChange={(e) => {
                                                                            const val = e.target.checked;
                                                                            const newT = [...arrivalTravelers];
                                                                            newT[idx].same_as_main = val;
                                                                            if (val) {
                                                                                const main = newT[0];
                                                                                newT[idx] = { ...newT[idx], mode_of_travel: main.mode_of_travel, station_airport: main.station_airport, transport_number: main.transport_number, drop_location: main.drop_location, number_of_bags: main.number_of_bags, number_of_vehicles: main.number_of_vehicles, contact_number: main.contact_number, number_of_pax: main.number_of_pax };
                                                                            }
                                                                            setArrivalTravelers(newT);
                                                                        }} id={`same-arrival-${idx}`} className="w-5 h-5" />
                                                                        <Label htmlFor={`same-arrival-${idx}`} className="text-sm cursor-pointer">Arriving together with main guest?</Label>
                                                                    </div>
                                                                )}

                                                                {(!traveler.same_as_main || idx === 0) ? (
                                                                    <div className="space-y-4">
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                            <div className="space-y-2">
                                                                                <Label className="uppercase text-[10px] font-bold text-zinc-400">Mode</Label>
                                                                                <select className="w-full h-11 px-4 rounded-xl border-2 bg-white text-sm" value={traveler.mode_of_travel} onChange={(e) => { const newT = [...arrivalTravelers]; newT[idx].mode_of_travel = e.target.value; setArrivalTravelers(newT); }}>
                                                                                    <option value="">Select Mode</option>
                                                                                    <option value="Bus">Bus</option>
                                                                                    <option value="Train">Train</option>
                                                                                    <option value="By Air">By Air</option>
                                                                                </select>
                                                                            </div>
                                                                            <div className="space-y-2">
                                                                                <Label className="uppercase text-[10px] font-bold text-zinc-400">Airport/Station</Label>
                                                                                <Input placeholder="Enter name" value={traveler.station_airport} onChange={(e) => { const newT = [...arrivalTravelers]; newT[idx].station_airport = e.target.value; setArrivalTravelers(newT); }} className="h-11 text-sm rounded-xl" />
                                                                            </div>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label className="uppercase text-[10px] font-bold text-zinc-400">Flight/Train Number</Label>
                                                                            <Input placeholder="e.g. AI 101 / 12345" value={traveler.transport_number} onChange={(e) => { const newT = [...arrivalTravelers]; newT[idx].transport_number = e.target.value; setArrivalTravelers(newT); }} className="h-12 text-lg rounded-xl" />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label className="uppercase text-[10px] font-bold text-zinc-400">Drop Location</Label>
                                                                            <Input placeholder="Hotel or Specific Address" value={traveler.drop_location} onChange={(e) => { const newT = [...arrivalTravelers]; newT[idx].drop_location = e.target.value; setArrivalTravelers(newT); }} className="h-12 text-lg rounded-xl" />
                                                                        </div>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                            <div className="space-y-2">
                                                                                <Label className="uppercase text-[10px] font-bold text-zinc-400">Bags</Label>
                                                                                <Input type="number" value={traveler.number_of_bags} onChange={(e) => { const newT = [...arrivalTravelers]; newT[idx].number_of_bags = e.target.value; setArrivalTravelers(newT); }} className="h-11 text-sm rounded-xl" />
                                                                            </div>
                                                                            <div className="space-y-2">
                                                                                <Label className="uppercase text-[10px] font-bold text-zinc-400">Vehicles Needed</Label>
                                                                                <Input type="number" value={traveler.number_of_vehicles} onChange={(e) => { const newT = [...arrivalTravelers]; newT[idx].number_of_vehicles = e.target.value; setArrivalTravelers(newT); }} className="h-11 text-sm rounded-xl" />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="p-8 text-center border-2 border-dashed rounded-2xl text-zinc-400 italic">
                                                                        Linked to main guest details
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </StepWrapper>
                                                    ))}

                                                {/* DEPARTURE FLOW */}
                                                {transportStep === arrivalSteps && (
                                                    <StepWrapper activeSection={activeSection}
                                                        stepNumber={arrivalSteps + 1}
                                                        question="Will you need departure transport?"
                                                        onNext={handleNextTransport}
                                                        onPrev={handlePrevTransport}
                                                    >
                                                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                                            <button
                                                                type="button"
                                                                onClick={() => { setIsDepartureApplicable(true); handleNextTransport(); }}
                                                                className={`flex-1 py-4 sm:py-5 rounded-2xl border-2 transition-all text-base sm:text-lg font-bold ${isDepartureApplicable === true ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-400'}`}
                                                            >
                                                                Yes, please
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setIsDepartureApplicable(false); setTransportStep(arrivalSteps + 1); }}
                                                                className={`flex-1 py-4 sm:py-5 rounded-2xl border-2 transition-all text-base sm:text-lg font-bold ${isDepartureApplicable === false ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-400'}`}
                                                            >
                                                                No, I'm okay
                                                            </button>
                                                        </div>
                                                    </StepWrapper>
                                                )}

                                                {isDepartureApplicable && transportStep === (arrivalSteps + 1) && (
                                                    <StepWrapper activeSection={activeSection}
                                                        stepNumber={arrivalSteps + 2}
                                                        question="When are you departing?"
                                                        onNext={handleNextTransport}
                                                        onPrev={handlePrevTransport}
                                                    >
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label className="text-sm font-medium text-zinc-500">Drop Date</Label>
                                                                <Input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} className="h-11 text-sm rounded-xl border-2" />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-sm font-medium text-zinc-500">Drop Time</Label>
                                                                <Input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} className="h-11 text-sm rounded-xl border-2" />
                                                            </div>
                                                        </div>
                                                    </StepWrapper>
                                                )}

                                                {isDepartureApplicable && departureTravelers.map((traveler, idx) => 
                                                    transportStep === (arrivalSteps + 2 + idx) && (
                                                        <StepWrapper activeSection={activeSection}
                                                            key={`departure-${idx}`}
                                                            stepNumber={arrivalSteps + 3 + idx}
                                                            question={idx === 0 ? "Departure details for you" : `Departure for ${traveler.name || `Guest ${idx + 1}`}`}
                                                            onNext={handleNextTransport}
                                                            onPrev={handlePrevTransport}
                                                        >
                                                            <div className="space-y-6">
                                                                {idx > 0 && (
                                                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-50 border border-zinc-100">
                                                                        <input type="checkbox" checked={!!traveler.same_as_main} onChange={(e) => {
                                                                            const val = e.target.checked;
                                                                            const newT = [...departureTravelers];
                                                                            newT[idx].same_as_main = val;
                                                                            if (val) {
                                                                                const main = newT[0];
                                                                                newT[idx] = { ...newT[idx], mode_of_travel: main.mode_of_travel, station_airport: main.station_airport, transport_number: main.transport_number, drop_location: main.drop_location, number_of_bags: main.number_of_bags, number_of_vehicles: main.number_of_vehicles, contact_number: main.contact_number, number_of_pax: main.number_of_pax };
                                                                            }
                                                                            setDepartureTravelers(newT);
                                                                        }} id={`same-departure-${idx}`} className="w-5 h-5" />
                                                                        <Label htmlFor={`same-departure-${idx}`} className="text-sm cursor-pointer">Departing together with main guest?</Label>
                                                                    </div>
                                                                )}

                                                                {(!traveler.same_as_main || idx === 0) ? (
                                                                    <div className="space-y-4">
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                            <div className="space-y-2">
                                                                                <Label className="uppercase text-[10px] font-bold text-zinc-400">Mode</Label>
                                                                                <select className="w-full h-11 px-4 rounded-xl border-2 bg-white text-sm" value={traveler.mode_of_travel} onChange={(e) => { const newT = [...departureTravelers]; newT[idx].mode_of_travel = e.target.value; setDepartureTravelers(newT); }}>
                                                                                    <option value="">Select Mode</option>
                                                                                    <option value="Bus">Bus</option>
                                                                                    <option value="Train">Train</option>
                                                                                    <option value="By Air">By Air</option>
                                                                                </select>
                                                                            </div>
                                                                            <div className="space-y-2">
                                                                                <Label className="uppercase text-[10px] font-bold text-zinc-400">Airport/Station</Label>
                                                                                <Input placeholder="Enter name" value={traveler.station_airport} onChange={(e) => { const newT = [...departureTravelers]; newT[idx].station_airport = e.target.value; setDepartureTravelers(newT); }} className="h-11 text-sm rounded-xl" />
                                                                            </div>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label className="uppercase text-[10px] font-bold text-zinc-400">Flight/Train Number</Label>
                                                                            <Input placeholder="e.g. AI 101 / 12345" value={traveler.transport_number} onChange={(e) => { const newT = [...departureTravelers]; newT[idx].transport_number = e.target.value; setDepartureTravelers(newT); }} className="h-12 text-lg rounded-xl" />
                                                                        </div>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                            <div className="space-y-2">
                                                                                <Label className="uppercase text-[10px] font-bold text-zinc-400">Bags</Label>
                                                                                <Input type="number" value={traveler.number_of_bags} onChange={(e) => { const newT = [...departureTravelers]; newT[idx].number_of_bags = e.target.value; setDepartureTravelers(newT); }} className="h-11 text-sm rounded-xl" />
                                                                            </div>
                                                                            <div className="space-y-2">
                                                                                <Label className="uppercase text-[10px] font-bold text-zinc-400">Vehicles Needed</Label>
                                                                                <Input type="number" value={traveler.number_of_vehicles} onChange={(e) => { const newT = [...departureTravelers]; newT[idx].number_of_vehicles = e.target.value; setDepartureTravelers(newT); }} className="h-11 text-sm rounded-xl" />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="p-8 text-center border-2 border-dashed rounded-2xl text-zinc-400 italic">
                                                                        Linked to main guest details
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </StepWrapper>
                                                    ))}

                                                {transportStep === (totalTransportSteps - 1) && (
                                                    <StepWrapper activeSection={activeSection}
                                                        stepNumber={totalTransportSteps}
                                                        question="Any final message regarding your travel?"
                                                        onNext={handleSubmitTransport as any}
                                                        onPrev={handlePrevTransport}
                                                        isLast={true}
                                                        isSubmitting={submittingTransport}
                                                    >
                                                        <Textarea
                                                            placeholder="Type your message here..."
                                                            value={transportMessage}
                                                            onChange={(e) => setTransportMessage(e.target.value)}
                                                            className="min-h-[150px] text-base p-6 rounded-2xl border-2"
                                                            autoFocus
                                                        />
                                                    </StepWrapper>
                                                )}
                                            </AnimatePresence>
                                        </form>
                                    )
                                )}
                            </motion.div>
                        )}

                        {/* STEP 4: SUCCESS */}
                        {step === "success" && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center space-y-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-xl border border-zinc-100 dark:border-zinc-800 max-w-md mx-auto"
                            >
                                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-400">
                                    <Check className="w-10 h-10" />
                                </div>
                                <h2 className="text-2xl font-bold">You're all set!</h2>
                                <p className="text-zinc-500 text-sm">
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
