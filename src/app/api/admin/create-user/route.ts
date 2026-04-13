import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!serviceRoleKey) {
            return NextResponse.json(
                { error: "SUPABASE_SERVICE_ROLE_KEY is missing. Please contact support." },
                { status: 500 }
            );
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey
        );

        const { type, email, password, name, managerName, username, eventIds, adminId } = await req.json();

        if (!type || !email || !password || !name || !adminId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Create the Auth User using Admin API (prevents session loss for current user)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: name,
                role: type === 'hotel' ? 'hotel' : 'coordinator'
            }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Failed to create auth user.");

        const userId = authData.user.id;

        // 2. Insert metadata into appropriate table
        if (type === 'hotel') {
            const { error: dbError } = await supabaseAdmin.from("hotels").insert({
                name,
                manager_name: managerName || name,
                email,
                user_id: userId,
                admin_id: adminId
            });
            if (dbError) throw dbError;
        } else if (type === 'coordinator') {
            // First create the coordinator record
            const { data: coordinator, error: dbError } = await supabaseAdmin.from("coordinators").insert({
                name,
                username: username || name.toLowerCase().replace(/\s+/g, "_"),
                email,
                user_id: userId,
                admin_id: adminId,
                is_active: false // Approval required by default
            }).select('id').single();

            if (dbError) throw dbError;

            // Then insert event assignments if provided
            if (coordinator && eventIds && Array.isArray(eventIds) && eventIds.length > 0) {
                const assignments = eventIds.map((eventId: string) => ({
                    coordinator_id: coordinator.id,
                    event_id: eventId
                }));
                const { error: assignError } = await supabaseAdmin.from("coordinator_events").insert(assignments);
                if (assignError) throw assignError;
            }
        }

        return NextResponse.json({ success: true, userId });
    } catch (err: any) {
        console.error("Error creating user:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
