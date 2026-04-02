import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/whatsapp/logs
 * Fetches summary and per-guest counts for the WhatsApp Status dashboard
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');

    if (!eventId) {
        return NextResponse.json({ error: "event_id is required" }, { status: 400 });
    }

    try {
        // 1. Fetch all guests for this event
        const { data: guests, error: guestsError } = await supabase
            .from('guests')
            .select('id, name, phone')
            .eq('event_id', eventId)
            .order('name', { ascending: true });

        if (guestsError) throw guestsError;

        // 2. Fetch all logs for this event
        const { data: logs, error: logsError } = await supabase
            .from('whatsapp_logs')
            .select('*')
            .eq('event_id', eventId)
            .order('sent_at', { ascending: true }); // Ascending to keep track of latest status

        if (logsError) throw logsError;

        // 3. Process logs to get counts and status per guest
        const logsByGuest: Record<string, any> = {};
        
        // General stats for summary cards
        let totalSent = 0;
        let totalFailed = 0;

        logs.forEach((log: any) => {
            if (!logsByGuest[log.guest_id]) {
                logsByGuest[log.guest_id] = {
                    invite_count: 0,
                    reminder_count: 0,
                    arrival_count: 0,
                    departure_count: 0,
                    confirm_count: 0,
                    last_status: log.status,
                    last_sent_at: log.sent_at
                };
            }
            
            const guestStats = logsByGuest[log.guest_id];
            guestStats.last_status = log.status;
            guestStats.last_sent_at = log.sent_at;
            
            const typeLower = log.message_type.toLowerCase();
            if (typeLower.includes('invite')) guestStats.invite_count++;
            else if (typeLower.includes('reminder')) guestStats.reminder_count++;
            else if (typeLower.includes('arrival')) guestStats.arrival_count++;
            else if (typeLower.includes('departure')) guestStats.departure_count++;
            else if (typeLower.includes('confirm')) guestStats.confirm_count++;

            if (log.status === 'Sent') totalSent++;
            else if (log.status === 'Failed') totalFailed++;
        });

        // 4. Merge guest info with log summary
        const guestLogs = guests.map((guest: any) => ({
            ...guest,
            ...(logsByGuest[guest.id] || {
                invite_count: 0,
                reminder_count: 0,
                arrival_count: 0,
                departure_count: 0,
                confirm_count: 0,
                last_status: 'Not Sent',
                last_sent_at: null
            })
        }));

        return NextResponse.json({
            summary: {
                totalSent,
                totalFailed,
                delivered: totalSent, // For now mapping Sent to Delivered
                pending: 0 // No real information on pending status for now
            },
            guestLogs
        });

    } catch (error: any) {
        console.error("Fetch WhatsApp Logs Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
