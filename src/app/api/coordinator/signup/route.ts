import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!serviceRoleKey) {
            return NextResponse.json(
                { error: "SUPABASE_SERVICE_ROLE_KEY is missing from .env.local. Please add it and restart the server." },
                { status: 500 }
            );
        }

        // Create client inside handler so missing env doesn't crash at startup
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey
        );

        const { name, email, userId } = await req.json();

        if (!name || !email || !userId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Find an existing admin_id by looking at an existing coordinator or event
        // admin_id in the coordinators table stores the Supabase auth user.id of the admin
        let adminUserId: string | null = null;

        // Try to get admin_id from an existing coordinator record
        const { data: existingCoord } = await supabaseAdmin
            .from("coordinators")
            .select("admin_id")
            .not("admin_id", "is", null)
            .limit(1)
            .single();

        if (existingCoord?.admin_id) {
            adminUserId = existingCoord.admin_id;
        } else {
            // Try to get admin_id from events table
            const { data: existingEvent } = await supabaseAdmin
                .from("events")
                .select("admin_id")
                .not("admin_id", "is", null)
                .limit(1)
                .single();

            if (existingEvent?.admin_id) {
                adminUserId = existingEvent.admin_id;
            }
        }

        if (!adminUserId) {
            return NextResponse.json(
                { error: "No admin account found. Please ask your administrator to create your account directly." },
                { status: 500 }
            );
        }

        const { error } = await supabaseAdmin.from("coordinators").insert({
            name,
            username: name.toLowerCase().replace(/\s+/g, "_"),
            email,
            user_id: userId,
            admin_id: adminUserId,
            is_active: false,
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
