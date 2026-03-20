import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!serviceRoleKey) {
            return NextResponse.json(
                { error: "SUPABASE_SERVICE_ROLE_KEY is missing from .env.local." },
                { status: 500 }
            );
        }

        // Create admin client to bypass RLS
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey
        );

        const guestData = await req.json();

        if (!guestData.name) {
            return NextResponse.json({ error: "Guest name is required" }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from("guests")
            .insert([guestData])
            .select()
            .single();

        if (error) {
            console.error("Admin Insert Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (err: any) {
        console.error("API Route Error:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
