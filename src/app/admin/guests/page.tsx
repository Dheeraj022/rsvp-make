"use client";

import withAuth from "@/components/admin/withAuth";
import { Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function GuestsPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in duration-500">
            <div className="w-24 h-24 bg-orange-50 text-orange-600 rounded-[2rem] flex items-center justify-center shadow-lg shadow-orange-100">
                <Users size={48} />
            </div>
            <div className="space-y-2">
                <h2 className="text-3xl font-bold text-zinc-900">Global Guest List</h2>
                <p className="text-zinc-500 max-w-md mx-auto">
                    Manage all your guests across all events in one place. Export data, track RSVP status globally, and more. Launching soon!
                </p>
            </div>
            <Link href="/admin/dashboard">
                <Button variant="outline" className="rounded-full px-8 h-12 gap-2">
                    <ArrowLeft size={18} />
                    Back to Dashboard
                </Button>
            </Link>
        </div>
    );
}

export default withAuth(GuestsPage);
