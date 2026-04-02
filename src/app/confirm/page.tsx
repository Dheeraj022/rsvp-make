"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
    Phone, 
    ArrowRight, 
    CheckCircle2, 
    XCircle, 
    Calendar, 
    MapPin, 
    Users, 
    Hotel, 
    PlaneLanding, 
    PlaneTakeoff,
    User,
    Loader2,
    ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/useToast";

type Guest = {
    id: string;
    name: string;
    phone: string;
    allowed_guests: number;
    attending_count: number;
    status: string;
    attendees_data: any[];
    arrival_location?: string;
    arrival_date?: string;
    departure_location?: string;
    departure_date?: string;
    message?: string;
    departure_details?: any;
};

type Event = {
    id: string;
    name: string;
    date: string;
    location: string;
    assigned_hotel_name?: string;
};

function ConfirmPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const toast = useToast();
    const event_id = searchParams.get('event_id');

    const [step, setStep] = useState(1);
    const [phone, setPhone] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [guest, setGuest] = useState<Guest | null>(null);
    const [event, setEvent] = useState<Event | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<'confirmed' | 'not_attending'>('confirmed');
    const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);

    const handleFetchDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone || !event_id) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/rsvp/fetch-guest-by-phone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, event_id })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to find your invitation.");
            }

            setGuest(data.guest);
            setEvent(data.event);
            // Initialize with all attendees selected by default
            if (data.guest.attendees_data) {
                setSelectedAttendees(data.guest.attendees_data.map((a: any) => a.name));
            }
            setStep(2);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = async (status: 'confirmed' | 'not_attending', attendees: string[] = []) => {
        console.log("RSVP Submission:", status, attendees);
        if (!guest || !event) {
            toast.error("Session data missing. Please refresh.");
            return;
        }

        setConfirming(true);
        setError(null);
        try {
            const payload = {
                event_id: event.id,
                guest_id: guest.id,
                phone: guest.phone,
                status,
                confirmed_members: status === 'confirmed' ? attendees : []
            };
            console.log("Submitting RSVP with payload:", payload);

            const response = await fetch('/api/rsvp/confirm-attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            console.log("RSVP API Response:", data);

            if (!response.ok) {
                throw new Error(data.error || "Failed to submit RSVP.");
            }

            setSelectedStatus(status);
            setStep(4);
            toast.success(status === 'confirmed' ? "RSVP confirmed! See you there." : "Response recorded. We'll miss you!");
        } catch (err: any) {
            console.error("RSVP Error Details:", err);
            const msg = err instanceof Error ? err.message : String(err);
            setError(msg);
            toast.error(msg);
        } finally {
            setConfirming(false);
        }
    };

    if (!event_id) {
        return (
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50/50 via-zinc-50 to-zinc-50">
                <div className="text-center space-y-6 max-w-md w-full">
                    <div className="w-20 h-20 rounded-3xl bg-rose-100 flex items-center justify-center mx-auto text-rose-500 border border-rose-200">
                        <XCircle size={40} />
                    </div>
                    <h1 className="text-3xl font-black text-zinc-900 tracking-tight leading-tight">Invalid Link</h1>
                    <p className="text-zinc-500 font-bold">This RSVP link appears to be incomplete. Please use the link provided in your invitation message.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-zinc-950 selection:bg-blue-500 selection:text-white bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-zinc-50 p-6 md:p-12 overflow-hidden flex items-center justify-center font-sans">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/30 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-100/30 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-2xl relative">
                <AnimatePresence mode="wait">
                    {/* Step 1: Phone Search */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-12 text-center"
                        >
                            <div className="space-y-4">
                                <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center mx-auto text-indigo-600 border border-indigo-100 shadow-xl">
                                    <Phone size={40} strokeWidth={1.5} />
                                </div>
                                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-zinc-900 leading-tight">Guest Confirmation<br />Portal</h1>
                                <p className="text-zinc-400 font-black tracking-[0.2em] uppercase text-[10px]">Identify yourself to continue</p>
                            </div>

                            <form onSubmit={handleFetchDetails} className="space-y-6 max-w-sm mx-auto">
                                <div className="space-y-2 group">
                                    <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white/50 focus-within:border-indigo-600/50 transition-all focus-within:ring-8 focus-within:ring-indigo-600/5 backdrop-blur-sm shadow-sm hover:border-zinc-300">
                                        <div className="absolute inset-y-0 left-6 flex items-center text-zinc-400 group-focus-within:text-indigo-600 transition-colors">
                                            <Phone size={18} />
                                        </div>
                                        <Input
                                            type="tel"
                                            placeholder="Registered Mobile Number"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="h-16 pl-14 border-none bg-transparent text-xl font-black placeholder:text-zinc-300 placeholder:font-bold focus-visible:ring-0 text-zinc-900"
                                            required
                                        />
                                    </div>
                                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em] text-left pl-4">
                                        Note: Please enter phone number with country code (e.g. 91...)
                                    </p>
                                    {error && (
                                        <div className="space-y-3 pt-2">
                                            <p className="text-rose-600 text-sm font-black animate-shake uppercase tracking-tight">{error}</p>
                                            <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">
                                                Need help? Contact <a href="https://shaadiplatform.com/contact" target="_blank" className="text-indigo-600 hover:underline transition-all">shaadiplatform.com/contact</a>
                                            </p>
                                        </div>
                                    )}
                                </div>
                                
                                <Button 
                                    className="w-full h-16 rounded-[1.5rem] bg-indigo-600 text-white hover:bg-indigo-700 transition-all font-black text-sm tracking-[0.2em] uppercase shadow-2xl shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98]"
                                    type="submit"
                                    disabled={isLoading || !phone}
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            Fetch Details
                                            <ArrowRight size={18} strokeWidth={2.5} />
                                        </>
                                    )}
                                </Button>
                            </form>
                        </motion.div>
                    )}

                    {/* Step 2: Details Review (Background for Step 3) */}
                    {(step === 2 || step === 3) && guest && event && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ 
                                opacity: 1, 
                                scale: step === 3 ? 0.95 : 1,
                                filter: step === 3 ? "blur(8px)" : "blur(0px)" 
                            }}
                            className={cn(
                                "bg-white border border-zinc-200 rounded-[3rem] overflow-hidden shadow-[0_32px_80px_-20px_rgba(0,0,0,0.12)] flex flex-col min-h-[500px] transition-all duration-500",
                                step === 3 && "pointer-events-none opacity-40 scale-95"
                            )}
                        >
                            {/* Card Header Overlay */}
                            <div className="p-8 md:p-12 border-b border-zinc-100 space-y-6 relative overflow-hidden bg-white">
                                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
                                
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-indigo-600 font-black tracking-[0.3em] uppercase text-[10px]">
                                            <CheckCircle2 size={12} />
                                            Invitation Confirmed
                                        </div>
                                        <h2 className="text-4xl font-black tracking-tight leading-none text-zinc-900">{guest.name}</h2>
                                        <p className="text-zinc-500 font-bold tracking-tight">{guest.phone}</p>
                                    </div>
                                    <div className="w-20 h-20 rounded-[2rem] bg-zinc-50 flex items-center justify-center text-zinc-300 border border-zinc-200 shrink-0 shadow-sm">
                                        <User size={40} strokeWidth={1} />
                                    </div>
                                </div>
                                
                                {/* Family Members Badge List */}
                                {guest.attendees_data && guest.attendees_data.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {guest.attendees_data.map((member: any, i: number) => (
                                            <span key={i} className="px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-[10px] font-black text-zinc-600 uppercase tracking-widest shadow-sm">
                                                {member.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Card Content Grid */}
                            <div className="p-8 md:p-12 space-y-12 bg-white">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    {/* Event Info */}
                                    <div className="space-y-8">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shrink-0">
                                                <Calendar size={22} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block mb-1">Event Details</span>
                                                <p className="font-black text-xl leading-tight text-zinc-900">{event.name}</p>
                                                <p className="text-sm font-bold text-zinc-500 mt-1">{format(new Date(event.date), "MMMM d, yyyy")}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shrink-0">
                                                <MapPin size={22} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block mb-1">Venue Location</span>
                                                <p className="text-sm font-bold text-zinc-700 leading-snug">{event.location}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Logistics Info Summary */}
                                    <div className="space-y-8">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100 shrink-0">
                                                <User size={22} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block mb-1">Primary Guest</span>
                                                <p className="text-sm font-bold text-zinc-700 leading-snug">
                                                    {guest.name}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100 shrink-0">
                                                <Users size={22} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block mb-1">Total Members</span>
                                                <p className="font-black text-xl leading-tight text-zinc-900">{guest.attending_count || guest.allowed_guests}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Manifests (Arrival & Departure) */}
                                {(guest.departure_details?.arrival?.date || guest.departure_details?.departure?.date) && (
                                    <div className="space-y-8 pt-8 border-t border-zinc-100">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Logistical Itinerary</h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Arrival Manifest */}
                                            {guest.departure_details?.arrival?.date && (
                                                <div className="p-8 rounded-[2rem] bg-blue-50/30 border border-blue-100 flex flex-col gap-6 shadow-sm">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <span className="text-[11px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2 shrink-0">
                                                            <PlaneLanding size={16} /> Arrival
                                                        </span>
                                                        <span className="text-[10px] font-black text-blue-700 px-4 py-2 bg-blue-100/50 rounded-full border border-blue-200 shadow-sm whitespace-nowrap uppercase tracking-wider">
                                                            {format(new Date(guest.departure_details.arrival.date), "MMM d • HH:mm")}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="space-y-3">
                                                        {guest.departure_details.arrival.travelers?.map((t: any, i: number) => (
                                                            <div key={i} className="p-4 rounded-2xl bg-white border border-zinc-100 flex items-center justify-between gap-4 shadow-sm hover:translate-y-[-2px] transition-all">
                                                                <div className="min-w-0">
                                                                    <p className="text-[11px] font-black text-zinc-800 truncate uppercase tracking-tight">{t.name || guest.name}</p>
                                                                    <p className="text-[9px] font-bold text-zinc-400 uppercase leading-none mt-1">{t.mode_of_travel} • Terminal {t.station_airport}</p>
                                                                </div>
                                                                {t.ticket_url && (
                                                                    <a 
                                                                        href={t.ticket_url} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="h-10 px-4 rounded-xl bg-blue-600 text-white text-[9px] font-black uppercase tracking-[0.1em] flex items-center justify-center hover:bg-blue-700 transition-all shrink-0 shadow-lg shadow-blue-600/10"
                                                                    >
                                                                        TICKET
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Departure Manifest */}
                                            {guest.departure_details?.departure?.date && (
                                                <div className="p-8 rounded-[2rem] bg-zinc-50 border border-zinc-200 flex flex-col gap-6 shadow-sm">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <span className="text-[11px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2 shrink-0">
                                                            <PlaneTakeoff size={16} /> Departure
                                                        </span>
                                                        <span className="text-[10px] font-black text-zinc-700 px-4 py-2 bg-zinc-100 rounded-full border border-zinc-200 shadow-sm whitespace-nowrap uppercase tracking-wider">
                                                            {format(new Date(guest.departure_details.departure.date), "MMM d • HH:mm")}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="space-y-3">
                                                        {guest.departure_details.departure.travelers?.map((t: any, i: number) => (
                                                            <div key={i} className="p-4 rounded-2xl bg-white border border-zinc-100 flex items-center justify-between gap-4 shadow-sm hover:translate-y-[-2px] transition-all">
                                                                <div className="min-w-0">
                                                                    <p className="text-[11px] font-black text-zinc-800 truncate uppercase tracking-tight">{t.name || guest.name}</p>
                                                                    <p className="text-[9px] font-bold text-zinc-400 uppercase leading-none mt-1">{t.mode_of_travel} • Terminal {t.station_airport}</p>
                                                                </div>
                                                                {t.ticket_url && (
                                                                    <a 
                                                                        href={t.ticket_url} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="h-10 px-4 rounded-xl bg-zinc-900 text-white text-[9px] font-black uppercase tracking-[0.1em] flex items-center justify-center hover:bg-black transition-all shrink-0 shadow-lg shadow-black/10"
                                                                    >
                                                                        TICKET
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="p-8 md:p-12 border-t border-zinc-100 bg-zinc-50/50 space-y-6">
                                {error && (
                                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-black text-center uppercase tracking-widest animate-shake shadow-sm">
                                        Error: {error}
                                    </div>
                                )}
                                <div className="flex flex-col md:flex-row gap-4 items-center">
                                    <Button 
                                        type="button"
                                        className="flex-1 w-full h-18 rounded-3xl bg-indigo-600 hover:bg-indigo-700 text-white hover:text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 transition-all disabled:opacity-50 active:scale-95 border-none"
                                        onClick={() => setStep(3)}
                                        disabled={confirming}
                                    >
                                        {confirming ? <Loader2 className="w-5 h-5 animate-spin" /> : "YES, I'M ATTENDING"}
                                    </Button>
                                    <Button 
                                        type="button"
                                        variant="ghost"
                                        className="px-10 h-18 rounded-3xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 font-black uppercase text-[10px] tracking-[0.2em] transition-all"
                                        onClick={() => handleConfirm('not_attending')}
                                        disabled={confirming}
                                    >
                                        No, I Can't Attend
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && guest && event && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-zinc-900/10 backdrop-blur-sm">
                            <motion.div
                                key="step3-modal"
                                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 40, scale: 0.95 }}
                                className="w-full max-w-xl bg-white border border-zinc-200 rounded-[3rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)] flex flex-col max-h-[90vh]"
                            >
                                <div className="p-8 md:p-10 border-b border-zinc-100 bg-white relative overflow-hidden shrink-0">
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600" />
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 flex items-center gap-2">
                                                <Users size={12} />
                                                Final Step
                                            </span>
                                            <h2 className="text-3xl font-black tracking-tight text-zinc-900">Who is attending?</h2>
                                        </div>
                                        <button 
                                            onClick={() => setStep(2)}
                                            className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors"
                                        >
                                            <ArrowLeft size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-8 md:p-10 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                                    {guest.attendees_data?.map((member: any, i: number) => {
                                        const isSelected = selectedAttendees.includes(member.name);
                                        return (
                                            <div 
                                                key={i}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedAttendees(prev => prev.filter(n => n !== member.name));
                                                    } else {
                                                        setSelectedAttendees(prev => [...prev, member.name]);
                                                    }
                                                }}
                                                className={cn(
                                                    "p-6 rounded-3xl border transition-all cursor-pointer flex items-center justify-between group",
                                                    isSelected 
                                                        ? "bg-indigo-50 border-indigo-200 shadow-sm" 
                                                        : "bg-zinc-50/50 border-zinc-100 hover:border-zinc-200"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                                                        isSelected ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "bg-zinc-200 text-zinc-400"
                                                    )}>
                                                        <User size={20} strokeWidth={2.5} />
                                                    </div>
                                                    <span className={cn(
                                                        "font-black uppercase tracking-widest text-xs transition-all",
                                                        isSelected ? "text-indigo-900" : "text-zinc-400"
                                                    )}>
                                                        {member.name}
                                                    </span>
                                                </div>
                                                
                                                <div className={cn(
                                                    "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm",
                                                    isSelected 
                                                        ? "bg-indigo-600 text-white" 
                                                        : "bg-white border border-zinc-200 text-zinc-400"
                                                )}>
                                                    {isSelected ? "Confirm" : "Not Confirm"}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="p-8 md:p-10 border-t border-zinc-100 bg-zinc-50/50 shrink-0">
                                    <Button 
                                        className="w-full h-18 rounded-3xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 transition-all active:scale-95 border-none"
                                        onClick={() => handleConfirm('confirmed', selectedAttendees)}
                                        disabled={confirming || selectedAttendees.length === 0}
                                    >
                                        {confirming ? <Loader2 className="w-5 h-5 animate-spin" /> : "DONE"}
                                    </Button>
                                    {selectedAttendees.length === 0 && (
                                        <p className="text-[9px] font-black uppercase text-rose-500 tracking-widest text-center mt-4">
                                            Please select at least one guest to continue
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                    {step === 4 && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center space-y-10"
                        >
                            <div className="relative">
                                <motion.div 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", damping: 10, stiffness: 100 }}
                                    className={cn(
                                        "w-32 h-32 rounded-[2.5rem] flex items-center justify-center mx-auto border shadow-xl relative z-10",
                                        selectedStatus === 'confirmed' 
                                            ? "bg-emerald-50 text-emerald-500 border-emerald-100 shadow-emerald-500/5" 
                                            : "bg-zinc-50 text-zinc-400 border-zinc-200"
                                    )}
                                >
                                    {selectedStatus === 'confirmed' ? (
                                        <CheckCircle2 size={56} strokeWidth={1.5} />
                                    ) : (
                                        <XCircle size={56} strokeWidth={1.5} />
                                    )}
                                </motion.div>
                                <div className={cn(
                                    "absolute inset-0 blur-[80px] rounded-full scale-150 animate-pulse",
                                    selectedStatus === 'confirmed' ? "bg-emerald-100/30" : "bg-zinc-200/50"
                                )} />
                            </div>

                            <div className="space-y-6">
                                <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight text-zinc-900">
                                    {selectedStatus === 'confirmed' ? "Great, see you soon!" : "We'll miss you!"}
                                </h1>
                                <p className="text-zinc-500 text-lg font-bold leading-relaxed max-w-sm mx-auto">
                                    {selectedStatus === 'confirmed' 
                                        ? <>Your attendance for <span className="text-zinc-900 font-black">{event?.name}</span> has been confirmed.</>
                                        : <>Thank you for letting us know. We have recorded your response for <span className="text-zinc-900 font-black">{event?.name}</span>.</>
                                    }
                                </p>
                            </div>

                            <Button 
                                variant="outline" 
                                className="h-16 rounded-3xl border-zinc-200 text-zinc-900 hover:text-zinc-900 hover:bg-zinc-100 hover:border-zinc-300 font-black px-12 tracking-[0.2em] transition-all shadow-sm flex items-center justify-center mx-auto uppercase text-xs"
                                onClick={() => {
                                    if (typeof window !== 'undefined') {
                                        window.close();
                                        // Fallback if window.close() is blocked by browser
                                        setTimeout(() => {
                                            toast.info("You can now close this tab safely.");
                                        }, 100);
                                    }
                                }}
                            >
                                CLOSE WINDOW
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Back Button */}
                {step === 2 && (
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => setStep(1)}
                        className="absolute -top-20 left-0 text-zinc-400 hover:text-indigo-600 transition-colors flex items-center gap-2 font-black uppercase text-[10px] tracking-[0.3em] px-6 py-3 bg-white/80 backdrop-blur-md rounded-2xl border border-zinc-100 shadow-sm shadow-black/5"
                    >
                        <ArrowLeft size={14} strokeWidth={3} />
                        Incorrect Number?
                    </motion.button>
                )}
            </div>
        </div>
    );
}

export default function ConfirmPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            </div>
        }>
            <ConfirmPageContent />
        </Suspense>
    );
}
