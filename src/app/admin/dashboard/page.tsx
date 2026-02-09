"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import withAuth from "@/components/admin/withAuth";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, Calendar, Users, MapPin } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

// Types
type Event = {
    id: string;
    name: string;
    date: string;
    location: string;
    slug: string;
    description: string;
    guest_count: number; // We'll compute this or fetch it
};

function AdminDashboard() {
    const router = useRouter();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("events")
                .select("*")
                .eq("admin_id", user.id)
                .order("date", { ascending: true });

            if (error) throw error;
            setEvents(data || []);
        } catch (error) {
            console.error("Error fetching events:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/admin/login");
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
            {/* Top Bar */}
            <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 px-4 sm:px-6 py-3 sm:py-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
                <div className="mx-auto flex max-w-6xl items-center justify-between">
                    <h1 className="text-base sm:text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                        Admin Dashboard
                    </h1>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <Button size="sm" variant="ghost" onClick={handleLogout} className="text-xs sm:text-sm">
                            <LogOut className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Sign Out</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <main className="mx-auto max-w-6xl p-4 sm:p-6">
                <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                            Your Events
                        </h2>
                        <p className="mt-1 text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                            Manage your events and guest lists.
                        </p>
                    </div>
                    <Link href="/admin/events/new" className="w-full sm:w-auto">
                        <Button className="w-full sm:w-auto bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black hover:dark:bg-zinc-200 text-sm sm:text-base">
                            <Plus className="h-4 w-4 sm:mr-2" />
                            <span className="ml-2 sm:ml-0">Create Event</span>
                        </Button>
                    </Link>
                </div>

                {loading ? (
                    <div className="py-20 text-center text-zinc-500">Loading events...</div>
                ) : events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 py-20 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
                        <Calendar className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                            No events yet
                        </h3>
                        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
                            Get started by creating your first event.
                        </p>
                        <Link href="/admin/events/new">
                            <Button>Create Event</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {events.map((event) => (
                            <Link
                                key={event.id}
                                href={`/admin/events/${event.id}`}
                                className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 transition-all hover:scale-[1.01] hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
                            >
                                <div className="mb-4 flex items-start justify-between">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold">
                                        {new Date(event.date).getDate()}
                                    </div>
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${new Date(event.date) < new Date() ? "bg-zinc-100 text-zinc-800" : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                        }`}>
                                        {new Date(event.date) < new Date() ? "Past" : "Upcoming"}
                                    </span>
                                </div>

                                <h3 className="mb-2 text-xl font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {event.name}
                                </h3>

                                <div className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
                                    <div className="flex items-center">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        {format(new Date(event.date), "MMMM d, yyyy • h:mm a")}
                                    </div>
                                    <div className="flex items-center">
                                        <MapPin className="mr-2 h-4 w-4" />
                                        {event.location}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default withAuth(AdminDashboard);
