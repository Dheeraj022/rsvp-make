import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from("users")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;
        return NextResponse.json({ users: data });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { userId, full_name, role, status } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // 1. Update public.users
        const { error: dbError } = await supabaseAdmin
            .from("users")
            .update({ full_name, role, status })
            .eq("id", userId);

        if (dbError) throw dbError;

        // 2. Update auth.user metadata if role or name changed
        const updateData: any = {};
        if (full_name) updateData.full_name = full_name;
        if (role) updateData.role = role;

        if (Object.keys(updateData).length > 0) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
                userId,
                { user_metadata: updateData }
            );
            if (authError) throw authError;
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // Delete from Auth (this will cascade to public.users if references are set to cascade)
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
