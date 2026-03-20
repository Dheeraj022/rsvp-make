import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!serviceRoleKey || !supabaseUrl) {
            return NextResponse.json(
                { error: "Supabase environment variables are missing." },
                { status: 500 }
            );
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
        const { coordinatorId, eventId } = await req.json();

        if (!coordinatorId) {
            return NextResponse.json({ error: "Missing coordinatorId" }, { status: 400 });
        }

        // Update the coordinator record
        const { error } = await supabaseAdmin
            .from("coordinators")
            .update({ event_id: eventId || null })
            .eq("id", coordinatorId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
