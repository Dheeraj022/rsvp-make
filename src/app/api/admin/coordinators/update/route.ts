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
        const { coordinatorId, eventIds } = await req.json();

        if (!coordinatorId) {
            return NextResponse.json({ error: "Missing coordinatorId" }, { status: 400 });
        }

        // 1. Delete existing assignments
        const { error: deleteError } = await supabaseAdmin
            .from("coordinator_events")
            .delete()
            .eq("coordinator_id", coordinatorId);

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        // 2. Insert new assignments if any
        if (eventIds && Array.isArray(eventIds) && eventIds.length > 0) {
            const assignments = eventIds.map((eventId: string) => ({
                coordinator_id: coordinatorId,
                event_id: eventId
            }));
            const { error: insertError } = await supabaseAdmin
                .from("coordinator_events")
                .insert(assignments);

            if (insertError) {
                return NextResponse.json({ error: insertError.message }, { status: 500 });
            }
        }

        // 3. For backward compatibility, update the main coordinator record with the first event_id if available
        const firstEventId = (eventIds && Array.isArray(eventIds)) ? eventIds[0] : null;
        await supabaseAdmin
            .from("coordinators")
            .update({ event_id: firstEventId || null })
            .eq("id", coordinatorId);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
