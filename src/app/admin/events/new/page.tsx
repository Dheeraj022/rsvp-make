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
import { format } from "date-fns";

function CreateEvent() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        date: "",
        location: "",
        description: "",
        slug: "",
        drop_locations: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            // Auto-generate slug from name if slug isn't manually edited
            if (name === "name" && !prev.slug) {
                return {
                    ...prev,
                    name: value,
                    slug: value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
                };
            }
            return { ...prev, [name]: value };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            // Use date only
            const datetime = new Date(formData.date);

            const { error } = await supabase.from("events").insert({
                name: formData.name,
                date: datetime.toISOString(),
                location: formData.location,
                description: formData.description,
                slug: formData.slug,
                admin_id: user.id,
                created_by_name: user.user_metadata?.full_name || "Admin",
                created_by_email: user.email,
                drop_locations: formData.drop_locations.split(',').map(s => s.trim()).filter(s => s !== ""),
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
        <div className="min-h-screen bg-zinc-50 dark:bg-black p-6">
            <div className="mx-auto max-w-2xl">
                <div className="mb-6">
                    <Link href="/admin/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 flex items-center">
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <h1 className="mb-6 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Create New Event
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Event Name</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="Summer Gala 2024"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="date">Date</Label>
                            <Input
                                id="date"
                                name="date"
                                type="date"
                                value={formData.date}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                                id="location"
                                name="location"
                                placeholder="123 Venue St, City"
                                value={formData.location}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="slug">Event URL Slug</Label>
                            <div className="flex items-center">
                                <span className="mr-2 text-sm text-zinc-500 whitespace-nowrap">
                                    rsvp.com/r/
                                </span>
                                <Input
                                    id="slug"
                                    name="slug"
                                    placeholder="summer-gala-2024"
                                    value={formData.slug}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Join us for a night of celebration..."
                                value={formData.description}
                                onChange={handleChange}
                                rows={3}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="drop_locations">Drop Locations / Hotels (Comma-separated)</Label>
                            <Textarea
                                id="drop_locations"
                                name="drop_locations"
                                placeholder="Grand Hyatt Goa, Taj Exotica, The Leela..."
                                value={formData.drop_locations}
                                onChange={handleChange}
                                rows={2}
                            />
                            <p className="text-xs text-zinc-500">Provide a list of hotels or locations for guests to choose from in the transport form.</p>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Event"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default withAuth(CreateEvent);
