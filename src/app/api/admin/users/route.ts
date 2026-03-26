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

        // Get current admin for admin_id reference if needed
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.split(' ')[1];
        let adminId = userId; // Fallback

        if (token) {
            const { data: { user: currentUser } } = await supabaseAdmin.auth.getUser(token);
            if (currentUser) adminId = currentUser.id;
        }

        // 1. Update public.users
        const { data: userData, error: fetchError } = await supabaseAdmin
            .from("users")
            .select("email")
            .eq("id", userId)
            .single();

        if (fetchError) throw fetchError;

        const { error: dbError } = await supabaseAdmin
            .from("users")
            .update({ full_name, role, status })
            .eq("id", userId);

        if (dbError) throw dbError;

        // 2. Cross-table synchronization
        const isActive = status === 'active';

        if (role === 'coordinator') {
            const { data: coord } = await supabaseAdmin.from("coordinators").select("id").eq("user_id", userId).single();
            if (!coord) {
                await supabaseAdmin.from("coordinators").insert({
                    user_id: userId,
                    name: full_name || userData.email.split('@')[0],
                    username: userData.email.split('@')[0] + '_' + Math.random().toString(36).slice(-4),
                    admin_id: adminId,
                    is_active: isActive
                });
            } else {
                await supabaseAdmin.from("coordinators").update({ 
                    name: full_name,
                    is_active: isActive 
                }).eq("user_id", userId);
            }
        } else if (role === 'hotel') {
            const { data: hotel } = await supabaseAdmin.from("hotels").select("id").eq("user_id", userId).single();
            if (!hotel) {
                await supabaseAdmin.from("hotels").insert({
                    user_id: userId,
                    name: full_name || userData.email.split('@')[0],
                    email: userData.email,
                    manager_name: full_name,
                    is_active: isActive
                });
            } else {
                await supabaseAdmin.from("hotels").update({ 
                    name: full_name,
                    is_active: isActive 
                }).eq("user_id", userId);
            }
        }

        // 3. Update auth.user metadata
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
