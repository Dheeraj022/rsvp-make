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
    status: string;
    allowed_guests: number;
    attending_count: number;
};

export default function PublicEventPage() {
    const params = useParams();
    const slug = params.slug as string;

    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState<"landing" | "search" | "form" | "success">("landing");

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Guest[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

    // Form State
    const [status, setStatus] = useState<"accepted" | "declined">("accepted");
    const [attendingCount, setAttendingCount] = useState(1);
    const [attendees, setAttendees] = useState<any[]>([]);
    const [message, setMessage] = useState("");
    const [dietary, setDietary] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null); // "index-front" or "index-back"

    useEffect(() => {
        fetchEvent();
    }, [slug]);

    useEffect(() => {
        if (selectedGuest && status === "accepted") {
            // Initialize attendees array if empty
            setAttendees(prev => {
                if (prev.length > 0) return prev; // Don't overwrite if already modified
                return [{
                    name: selectedGuest.name,
                    id_type: "Aadhar Card",
                    id_front: "",
                    id_back: ""
                }];
            });
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
            if (status === "accepted") {
                for (let i = 0; i < attendees.length; i++) {
                    const a = attendees[i];
                    if (!a.name || !a.id_front || !a.id_back) {
                        alert(`Please fill all details for Guest ${i + 1} (Name and ID images)`);
                        setSubmitting(false);
                        return;
                    }
                }
            }

            const { error } = await supabase
                .from("guests")
                .update({
                    status: status,
                    attending_count: status === 'accepted' ? attendingCount : 0,
                    message: message,
                    dietary_requirements: dietary,
                    attendees_data: status === 'accepted' ? attendees : [],
                })
                .eq("id", selectedGuest.id);

            if (error) throw error;
            setStep("success");
        } catch (error: any) {
            alert("Error submitting RSVP: " + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black"><Loader2 className="animate-spin text-zinc-400" /></div>;
    }

    if (!event) {
        return <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black text-zinc-500">Event not found.</div>;
    }

    return (
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

                            <form onSubmit={handleSubmitRSVP} className="space-y-6">



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
                                                { name: "", id_type: "Aadhar Card", id_front: "", id_back: "" }
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
        </div >
    );
}
