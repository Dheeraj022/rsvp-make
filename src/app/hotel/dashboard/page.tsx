"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import withHotelAuth from "@/components/hotel/withHotelAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Calendar, MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

type Event = {
    id: string;
    name: string;
    date: string;
    location: string;
    assigned_hotel_email: string;
};

function HotelDashboard() {
    const router = useRouter();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    useEffect(() => {
        fetchAssignedEvents();
    }, []);

    const fetchAssignedEvents = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !user.email) return;

            setUserEmail(user.email);

            // Fetch events assigned to this hotel email
            const { data, error } = await supabase
                .from("events")
                .select("*")
                .eq("assigned_hotel_email", user.email)
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
        router.push("/hotel/login");
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
            {/* Top Bar */}
            <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 px-6 py-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
                <div className="mx-auto flex max-w-6xl items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                            Hotel Dashboard
                        </h1>
                        <p className="text-xs text-zinc-500">{userEmail}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                    </Button>
                </div>
            </div>

            {/* Content */}
            <main className="mx-auto max-w-6xl p-6">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Assigned Events
                    </h2>
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                        Select an event to view guest list and download documents.
                    </p>
                </div>

                {loading ? (
                    <div className="py-20 text-center text-zinc-500">Loading events...</div>
                ) : events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 py-20 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
                        <Calendar className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                            No events assigned
                        </h3>
                        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
                            Contact the administrator to assign events to your account ({userEmail}).
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {events.map((event) => (
                            <Link
                                key={event.id}
                                href={`/hotel/events/${event.id}`}
                                className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 transition-all hover:scale-[1.01] hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
                            >
                                <div className="mb-4 flex items-start justify-between">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold">
                                        {new Date(event.date).getDate()}
                                    </div>
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${new Date(event.date) < new Date() ? "bg-zinc-100 text-zinc-800" : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                        }`}>
                                        {new Date(event.date) < new Date() ? "Past" : "Upcoming"}
                                    </span>
                                </div>

                                <h3 className="mb-2 text-xl font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {event.name}
                                </h3>

                                <div className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                                    <div className="flex items-center">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        {format(new Date(event.date), "MMMM d, yyyy")}
                                    </div>
                                    <div className="flex items-center">
                                        <MapPin className="mr-2 h-4 w-4" />
                                        {event.location}
                                    </div>
                                </div>

                                <div className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400">
                                    View Guest List <ArrowRight className="ml-1 h-4 w-4" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default withHotelAuth(HotelDashboard);
