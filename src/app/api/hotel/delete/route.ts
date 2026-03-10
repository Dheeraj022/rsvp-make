import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!serviceRoleKey) {
            return NextResponse.json(
                { error: "Server not configured. Please contact the administrator." },
                { status: 500 }
            );
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey
        );

        const { hotelId, hotelEmail } = await req.json();

        if (!hotelId) {
            return NextResponse.json({ error: "Missing hotel ID" }, { status: 400 });
        }

        // 1. First clear any event assignments for this hotel (if email is provided)
        if (hotelEmail) {
            await supabaseAdmin
                .from("events")
                .update({ assigned_hotel_email: null, assigned_hotel_name: null })
                .eq("assigned_hotel_email", hotelEmail);
        }

        // 2. Delete the hotel record (bypasses RLS)
        const { error: deleteError } = await supabaseAdmin
            .from("hotels")
            .delete()
            .eq("id", hotelId);

        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
