import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/whatsapp/events
 * Fetches events for the Select Event dropdown in the WhatsApp Status module
 */
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('events')
            .select('id, name, date, location, slug')
            .order('date', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Fetch WhatsApp Events Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
