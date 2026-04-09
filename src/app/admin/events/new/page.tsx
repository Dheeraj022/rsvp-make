"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import withAuth from "@/components/auth/withAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

function CreateEvent() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        date: "",
        slug: "",
        drop_locations: "",
        has_transport: false,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            const next = { ...prev, [name]: value };
            if (name === "name") {
                next.slug = value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/(^-|-$)/g, "");
            }
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            const datetime = new Date(formData.date);

            const { error } = await supabase.from("events").insert({
                name: formData.name,
                date: datetime.toISOString(),
                location: formData.location,
                slug: formData.slug,
                admin_id: user.id,
                created_by_name: user.user_metadata?.full_name || "Admin",
                created_by_email: user.email,
                drop_locations: formData.drop_locations.split(',').map(s => s.trim()).filter(s => s !== ""),
                has_transport: formData.has_transport
            });

            if (error) throw error;

            router.push("/admin/dashboard");
        } catch (error: any) {
            alert("Error creating event: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#F8F9FA] dark:bg-black p-2 md:p-8 flex items-start justify-center animate-in fade-in duration-700 overflow-hidden">
            <div className="w-full max-w-4xl bg-white dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-white/10 shadow-sm p-5 md:p-6 mt-1 md:mt-4">
                <div className="mb-4">
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                        Create New Event
                    </h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="space-y-3">
                        {/* Event Name - Full Width */}
                        <div className="space-y-1">
                            <Label htmlFor="name" className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">
                                Event Name
                            </Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="Event Name"
                                value={formData.name}
                                onChange={handleChange}
                                className="h-10 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-md focus:border-zinc-400 focus:ring-0 transition-all font-medium text-sm"
                                required
                            />
                        </div>

                        {/* Date, Local (Location), and Slug - Side by Side */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="date" className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">
                                    Date
                                </Label>
                                <Input
                                    id="date"
                                    name="date"
                                    type="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    className="h-10 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-md focus:border-zinc-400 focus:ring-0 transition-all font-medium text-sm"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="location" className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">
                                    Location
                                </Label>
                                <Input
                                    id="location"
                                    name="location"
                                    placeholder="Location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    className="h-10 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-md focus:border-zinc-400 focus:ring-0 transition-all font-medium text-sm"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="slug" className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">
                                    Slug
                                </Label>
                                <div className="relative flex items-center group">
                                    <div className="absolute left-3 text-[10px] font-bold text-zinc-400 dark:text-zinc-600 pointer-events-none group-focus-within:text-zinc-500/50 transition-colors">
                                        r/
                                    </div>
                                    <Input
                                        id="slug"
                                        name="slug"
                                        placeholder="Slug"
                                        value={formData.slug}
                                        onChange={handleChange}
                                        className="h-10 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-md focus:border-zinc-400 focus:ring-0 transition-all font-medium text-sm pl-6"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Hotel (Drop Locations) - Full Width */}
                        <div className="space-y-1 pt-1">
                            <Label htmlFor="drop_locations" className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">
                                Hotel / Drop Locations
                            </Label>
                            <Input
                                id="drop_locations"
                                name="drop_locations"
                                placeholder="e.g. Grand Hyatt, Taj Resort, The Leela (Comma-separated)"
                                value={formData.drop_locations}
                                onChange={handleChange}
                                className="h-10 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-md focus:border-zinc-400 focus:ring-0 transition-all font-medium text-sm"
                            />
                            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight pl-1 opacity-70">Locations for the transport form</p>
                        </div>

                        {/* Transport Toggle */}
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-900">
                            <input
                                type="checkbox"
                                id="has_transport"
                                name="has_transport"
                                checked={formData.has_transport}
                                onChange={(e) => setFormData(prev => ({ ...prev, has_transport: e.target.checked }))}
                                className="w-5 h-5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                            />
                            <div className="space-y-0.5">
                                <Label htmlFor="has_transport" className="text-sm font-bold text-zinc-900 dark:text-zinc-50 cursor-pointer">
                                    Enable Transport Option
                                </Label>
                                <p className="text-[10px] text-zinc-500 font-medium">When enabled, guests can provide arrival and departure transport details.</p>
                            </div>
                        </div>

                        <hr className="mt-4 border-zinc-100 dark:border-zinc-900" />
                    </div>

                    <div className="pt-2">
                        <Button 
                            type="submit" 
                            className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 transition-all font-bold text-sm rounded-md shadow-sm" 
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Creating...</span>
                                </div>
                            ) : "Create Event"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default withAuth(CreateEvent);
