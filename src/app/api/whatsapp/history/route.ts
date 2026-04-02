import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/whatsapp/history?guest_id=&event_id=
 * Fetches detailed historical logs for a specific guest and event
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get('guest_id');
    const eventId = searchParams.get('event_id');

    if (!guestId || !eventId) {
        return NextResponse.json({ error: "guest_id and event_id are required" }, { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from('whatsapp_logs')
            .select('*')
            .eq('guest_id', guestId)
            .eq('event_id', eventId)
            .order('sent_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Fetch WhatsApp History Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
