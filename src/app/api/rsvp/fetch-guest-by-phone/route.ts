import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/rsvp/fetch-guest-by-phone
 * Fetches guest details using phone number and event_id
 */
export async function POST(request: Request) {
    try {
        const { phone, event_id } = await request.json();

        if (!phone || !event_id) {
            return NextResponse.json({ error: "Phone number and Event ID are required" }, { status: 400 });
        }

        // 1. Fetch Guest by phone and event_id
        // We look for a guest where the phone matches (canonicalizing phone might be needed, but we'll use exact match for now)
        const { data: guests, error: guestsError } = await supabase
            .from('guests')
            .select('*')
            .eq('event_id', event_id)
            .eq('phone', phone);

        if (guestsError) throw guestsError;

        if (!guests || guests.length === 0) {
            return NextResponse.json({ error: "No guest found with this phone number for this event." }, { status: 404 });
        }

        // Take the first matching guest (though phone+event_id should ideally be unique)
        const guest = guests[0];

        // 2. Fetch Event Details
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', event_id)
            .single();

        if (eventError) throw eventError;

        // 3. Prepare response data
        const responseData = {
            guest: {
                id: guest.id,
                name: guest.name,
                phone: guest.phone,
                allowed_guests: guest.allowed_guests,
                attending_count: guest.attending_count,
                status: guest.status,
                attendees_data: guest.attendees_data || [],
                departure_details: guest.departure_details || {},
                arrival_location: guest.arrival_location,
                arrival_date: guest.arrival_date,
                departure_location: guest.departure_location,
                departure_date: guest.departure_date,
                message: guest.message
            },
            event: {
                id: event.id,
                name: event.name,
                date: event.date,
                location: event.location,
                assigned_hotel_name: event.assigned_hotel_name
            }
        };

        return NextResponse.json(responseData);

    } catch (error: any) {
        console.error("Fetch Guest Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
