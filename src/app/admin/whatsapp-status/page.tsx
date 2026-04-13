"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import withRoleAuth from "@/components/admin/withRoleAuth";
import {
    MessageCircle,
    Search,
    Calendar,
    Send,
    CheckCircle2,
    XCircle,
    Clock,
    History,
    ChevronDown,
    Loader2,
    Filter,
    X,
    User,
    Bell
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Event = {
    id: string;
    name: string;
    date: string;
    location: string;
    slug: string;
};

type GuestLog = {
    id: string;
    name: string;
    phone: string;
    invite_count: number;
    reminder_count: number;
    service_count: number;
    confirm_count: number;
    last_status: string;
    last_sent_at: string | null;
};

type Summary = {
    totalSent: number;
    totalFailed: number;
    delivered: number;
    pending: number;
};

function WhatsAppStatusPage() {
    const toast = useToast();
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(false);
    const [guestLogs, setGuestLogs] = useState<GuestLog[]>([]);
    const [summary, setSummary] = useState<Summary>({ totalSent: 0, totalFailed: 0, delivered: 0, pending: 0 });
    const [searchQuery, setSearchQuery] = useState("");
    const [historyGuest, setHistoryGuest] = useState<GuestLog | null>(null);
    const [historyLogs, setHistoryLogs] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [sendingId, setSendingId] = useState<string | null>(null);

    // Template Modal State
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [selectedGuestForTemplate, setSelectedGuestForTemplate] = useState<GuestLog | null>(null);
    const [selectedTemplateType, setSelectedTemplateType] = useState<string>('Invite');

    useEffect(() => {
        fetchEvents();
    }, []);

    const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId]);

    const fetchEvents = async () => {
        try {
            const response = await fetch('/api/whatsapp/events');
            const data = await response.json();
            if (response.ok) {
                setEvents(data);
                if (data.length > 0) {
                    setSelectedEventId(data[0].id);
                }
            }
        } catch (error) {
            console.error("Error fetching events:", error);
            toast.error("Failed to load events");
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = useCallback(async (eventId: string) => {
        setDataLoading(true);
        try {
            const response = await fetch(`/api/whatsapp/logs?event_id=${eventId}`);
            const data = await response.json();
            if (response.ok) {
                setGuestLogs(data.guestLogs);
                setSummary(data.summary);
            }
        } catch (error) {
            console.error("Error fetching logs:", error);
            toast.error("Failed to load status logs");
        } finally {
            setDataLoading(false);
        }
    }, [toast]);

    const fetchHistory = async (guest: GuestLog) => {
        setHistoryGuest(guest);
        setHistoryLoading(true);
        try {
            const response = await fetch(`/api/whatsapp/history?guest_id=${guest.id}&event_id=${selectedEventId}`);
            const data = await response.json();
            if (response.ok) {
                setHistoryLogs(data);
            }
        } catch (error) {
            console.error("Error fetching history:", error);
            toast.error("Failed to load history");
        } finally {
            setHistoryLoading(false);
        }
    };

    const confirmSend = async () => {
        if (!selectedEvent || !selectedGuestForTemplate) return;

        setSendingId(selectedGuestForTemplate.id);
        setShowTemplateModal(false);

        try {
            const response = await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guest: selectedGuestForTemplate,
                    event: selectedEvent,
                    messageType: selectedTemplateType
                })
            });

            const result = await response.json();
            if (response.ok) {
                toast.success(`${selectedTemplateType} sent to ${selectedGuestForTemplate.name}`);
                fetchLogs(selectedEventId); // Refresh logs
            } else {
                toast.error(result.error || `Failed to send ${selectedTemplateType}`);
            }
        } catch (error: any) {
            toast.error("Error: " + error.message);
        } finally {
            setSendingId(null);
            setSelectedGuestForTemplate(null);
        }
    };

    const handleSendClick = (guest: GuestLog) => {
        setSelectedGuestForTemplate(guest);
        setShowTemplateModal(true);
    };

    useEffect(() => {
        if (selectedEventId) {
            fetchLogs(selectedEventId);
        }
    }, [selectedEventId]);

    const filteredLogs = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return guestLogs.filter(log =>
            log.name.toLowerCase().includes(query) ||
            (log.phone && log.phone.includes(query))
        );
    }, [guestLogs, searchQuery]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-40">
                <div className="flex flex-col items-center gap-4 text-center">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                    <p className="text-xs font-black tracking-[0.3em] uppercase text-zinc-400 animate-pulse">Initializing Data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                            <MessageCircle size={24} />
                        </div>
                        <h1 className="text-[1.75rem] md:text-4xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">WhatsApp Status</h1>
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium">Monitor message delivery and communication history</p>
                </div>

                <div className="relative group min-w-[280px]">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                    <select
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        className="w-full bg-white/50 dark:bg-white/5 border border-white/80 dark:border-white/10 rounded-2xl py-4 pl-12 pr-10 text-sm font-bold text-zinc-900 dark:text-white appearance-none focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                    >
                        {events.map((event) => (
                            <option key={event.id} value={event.id} className="bg-white dark:bg-zinc-900">{event.name}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {[
                    { label: "Total Sent", value: summary.totalSent, icon: Send, color: "blue" },
                    { label: "Delivered", value: summary.delivered, icon: CheckCircle2, color: "green" },
                    { label: "Failed", value: summary.totalFailed, icon: XCircle, color: "rose" },
                    { label: "Pending", value: summary.pending, icon: Clock, color: "amber" },
                ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                        <motion.div
                            key={item.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-8 space-y-3 md:space-y-4 hover:shadow-xl transition-all relative overflow-hidden group shadow-sm"
                        >
                            <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center border",
                                item.color === 'blue' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                    item.color === 'green' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                        item.color === 'rose' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                            'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            )}>
                                <Icon size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{item.label}</p>
                                <p className="text-2xl md:text-4xl font-black text-zinc-900 dark:text-white mt-1">{item.value}</p>
                            </div>
                            <div className={cn("absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-10 group-hover:opacity-20 transition-all",
                                item.color === 'blue' ? 'bg-blue-500' :
                                    item.color === 'green' ? 'bg-emerald-500' :
                                        item.color === 'rose' ? 'bg-rose-500' :
                                            'bg-amber-500'
                            )} />
                        </motion.div>
                    );
                })}
            </div>

            {/* Main Content Table */}
            <div className="bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl shadow-zinc-200/50 dark:shadow-none relative backdrop-blur-md">
                {dataLoading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-[2px] z-10 flex items-center justify-center transition-all">
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/10 p-4 rounded-2xl flex items-center gap-3 shadow-xl">
                            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                            <span className="text-sm font-bold text-zinc-900 dark:text-white">Refreshing Data...</span>
                        </div>
                    </div>
                )}

                <div className="p-5 md:p-8 border-b border-zinc-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Guest Communication Logs</h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Tracking {guestLogs.length} total invitees</p>
                    </div>

                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input
                            placeholder="Search guest or phone..."
                            className="bg-white/50 dark:bg-white/5 border-white/80 dark:border-white/10 rounded-2xl pl-12 h-14 focus-visible:ring-4 focus-visible:ring-blue-500/10 font-medium text-zinc-900 dark:text-white transition-all shadow-inner"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-50/50 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-500 border-b border-zinc-100 dark:border-white/5">
                                <th className="sticky left-0 z-20 bg-zinc-50/90 dark:bg-zinc-900/90 backdrop-blur-md px-4 md:px-8 py-6 shadow-[2px_0_10px_rgba(0,0,0,0.05)]">Guest Info</th>
                                <th className="px-3 md:px-6 py-6">Invites</th>
                                <th className="px-3 md:px-6 py-6">Reminders</th>
                                <th className="px-3 md:px-6 py-6">Service Alerts</th>
                                <th className="px-5 md:px-10 py-6 min-w-[120px]">Status</th>
                                <th className="px-4 md:px-8 py-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 max-w-xs mx-auto">
                                            <div className="w-16 h-16 rounded-[1.5rem] bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/10 flex items-center justify-center text-zinc-300 dark:text-zinc-700 shadow-inner">
                                                <Filter size={32} />
                                            </div>
                                            <p className="text-sm font-bold text-zinc-900 dark:text-white">No data available</p>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">No logs matching your filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group">
                                        <td className="sticky left-0 z-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-4 md:px-8 py-5 shadow-[2px_0_10px_rgba(0,0,0,0.05)]">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-zinc-100 dark:border-white/10 flex items-center justify-center text-zinc-400 dark:text-zinc-600 font-bold group-hover:text-blue-500 transition-colors shadow-sm">
                                                    {log.name[0]}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{log.name}</span>
                                                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">{log.phone || 'No Phone Number'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 md:px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <span className={cn("text-xs font-bold", log.invite_count > 0 ? "text-zinc-900 dark:text-white" : "text-zinc-300 dark:text-zinc-700")}>{log.invite_count}</span>
                                                {log.invite_count > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                                            </div>
                                        </td>
                                        <td className="px-3 md:px-6 py-5">
                                            <span className={cn("text-xs font-bold", log.reminder_count > 0 ? "text-zinc-900 dark:text-white" : "text-zinc-300 dark:text-zinc-700")}>{log.reminder_count}</span>
                                        </td>
                                        <td className="px-3 md:px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <span className={cn("text-xs font-bold", log.service_count > 0 ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-300 dark:text-zinc-700")}>{log.service_count}</span>
                                                {log.service_count > 0 && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                                            </div>
                                        </td>
                                        <td className="px-5 md:px-10 py-5">
                                            <div className="flex flex-col gap-1.5">
                                                <span className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter w-fit whitespace-nowrap",
                                                    log.last_status === 'Sent' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/20' :
                                                        log.last_status === 'Failed' ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' :
                                                            'bg-zinc-100 dark:bg-white/5 text-zinc-500 border border-zinc-200 dark:border-white/10'
                                                )}>
                                                    {log.last_status === 'Sent' && <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />}
                                                    {log.last_status}
                                                </span>
                                                {log.last_sent_at && (
                                                    <span className="text-[9px] text-zinc-400 dark:text-zinc-600 font-medium tracking-tight">
                                                        {format(new Date(log.last_sent_at), "MMM d, h:mm a")}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-10 px-4 rounded-xl text-emerald-600 hover:bg-emerald-600 hover:text-white font-bold border border-transparent hover:border-emerald-500/20 transition-all active:scale-95 shadow-sm disabled:opacity-50"
                                                    onClick={() => handleSendClick(log)}
                                                    disabled={sendingId === log.id}
                                                >
                                                    {sendingId === log.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    ) : (
                                                        <Send className="w-4 h-4 mr-2" />
                                                    )}
                                                    Send
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-10 px-4 rounded-xl text-blue-500 hover:bg-blue-600 hover:text-white font-bold border border-transparent hover:border-blue-500/20 transition-all active:scale-95 shadow-sm"
                                                    onClick={() => fetchHistory(log)}
                                                >
                                                    <History className="w-4 h-4 mr-2" />
                                                    Logs
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

            {/* History Modal */}
            <AnimatePresence>
                {historyGuest && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-zinc-950/60 dark:bg-black/80 backdrop-blur-md"
                            onClick={() => setHistoryGuest(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/10 rounded-[2rem] md:rounded-[3rem] w-full max-w-2xl max-h-[90vh] md:max-h-[85vh] relative overflow-hidden flex flex-col shadow-2xl"
                        >
                            {/* Modal Header */}
                            <div className="p-6 md:p-10 border-b border-zinc-100 dark:border-white/5 flex items-start justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                                <div className="flex items-center gap-4 md:gap-6">
                                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-[1.5rem] bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                                        <User className="w-6 h-6 md:w-8 md:h-8" />
                                    </div>
                                    <div className="space-y-0.5 md:space-y-1">
                                        <h2 className="text-xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{historyGuest.name}</h2>
                                        <p className="text-zinc-500 font-bold font-mono text-[10px] md:text-sm tracking-widest uppercase">{historyGuest.phone}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setHistoryGuest(null)}
                                    className="rounded-2xl hover:bg-zinc-100 dark:hover:bg-white/5"
                                >
                                    <X className="w-5 h-5 text-zinc-400" />
                                </Button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 md:p-10 overflow-y-auto flex-1 bg-white dark:bg-zinc-900">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Communication History</h3>
                                        <div className="h-px bg-zinc-100 dark:bg-white/5 flex-1 ml-4 md:ml-6" />
                                    </div>

                                    {historyLoading ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                            <span className="text-xs font-bold tracking-widest uppercase text-zinc-400">Loading Trail...</span>
                                        </div>
                                    ) : historyLogs.length === 0 ? (
                                        <div className="text-center py-20 text-zinc-400 font-bold italic">No communication data found.</div>
                                    ) : (
                                        <div className="space-y-4">
                                            {historyLogs.map((log) => (
                                                <div
                                                    key={log.id}
                                                    className="p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.rem] bg-zinc-50/50 dark:bg-zinc-950 border border-zinc-100 dark:border-white/5 flex items-center justify-between group hover:border-blue-500/20 transition-all shadow-sm"
                                                >
                                                    <div className="flex items-center gap-3 md:gap-5">
                                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border",
                                                            log.status === 'Sent' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                                        )}>
                                                            {log.status === 'Sent' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs md:text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">{log.message_type}</span>
                                                            <span className="text-[9px] md:text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase">
                                                                {format(new Date(log.sent_at), "MMM d, yyyy • h:mm a")}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                                        log.status === 'Sent' ? 'border-emerald-500/20 text-emerald-600 bg-emerald-500/5' : 'border-rose-500/20 text-rose-600 bg-rose-500/5'
                                                    )}>
                                                        {log.status}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 md:p-8 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-white/5">
                                <Button
                                    onClick={() => setHistoryGuest(null)}
                                    className="w-full h-14 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    Close History Path
                                </Button>
                            </div>

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Template Selection Modal */}
            <AnimatePresence>
                {showTemplateModal && selectedGuestForTemplate && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-zinc-950/60 dark:bg-black/80 backdrop-blur-md"
                            onClick={() => setShowTemplateModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/10 rounded-[2.5rem] w-full max-w-lg relative overflow-hidden flex flex-col shadow-2xl"
                        >
                            <div className="p-8 border-b border-zinc-100 dark:border-white/5 flex items-start justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                                        <MessageCircle size={28} />
                                    </div>
                                    <div className="space-y-1">
                                        <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Select Template</h2>
                                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest leading-none">For {selectedGuestForTemplate.name}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowTemplateModal(false)}
                                    className="rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5"
                                >
                                    <X className="w-5 h-5 text-zinc-400" />
                                </Button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="grid grid-cols-1 gap-3">
                                    {[
                                        { id: 'Invite', label: 'Wedding Invitation', icon: Send, color: 'blue' },
                                        { id: 'Reminder', label: 'RSVP Reminder', icon: Bell, color: 'amber' },
                                        { id: 'Thank You', label: 'Thank You Message', icon: CheckCircle2, color: 'emerald' },
                                    ].map((template) => {
                                        const TIcon = template.icon;
                                        const isSelected = selectedTemplateType === template.id;
                                        return (
                                            <button
                                                key={template.id}
                                                onClick={() => setSelectedTemplateType(template.id)}
                                                className={cn(
                                                    "flex items-center gap-4 p-5 rounded-2xl border transition-all text-left group",
                                                    isSelected
                                                        ? "bg-blue-500/5 border-blue-500 ring-1 ring-blue-500"
                                                        : "bg-zinc-50 dark:bg-zinc-950/20 border-zinc-100 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10"
                                                )}
                                            >
                                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border",
                                                    template.color === 'blue' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                        template.color === 'amber' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                            template.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                                'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                                )}>
                                                    <TIcon size={18} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className={cn("text-sm font-black", isSelected ? "text-blue-600 dark:text-blue-400" : "text-zinc-900 dark:text-white")}>{template.label}</p>
                                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter mt-0.5">Template Type: {template.id}</p>
                                                </div>
                                                <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                                    isSelected ? "border-blue-500 bg-blue-500" : "border-zinc-300 dark:border-white/10"
                                                )}>
                                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="p-8 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-950/30">
                                <Button
                                    className="w-full h-16 rounded-2xl bg-zinc-900 dark:bg-blue-500 text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:opacity-90 transition-all flex items-center justify-center gap-3"
                                    onClick={confirmSend}
                                >
                                    <Send size={18} />
                                    Send {selectedTemplateType} Now
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default withRoleAuth(WhatsAppStatusPage, "admin");
