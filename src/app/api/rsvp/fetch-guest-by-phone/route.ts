import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/rsvp/fetch-guest-by-phone
 * Fetches guest details using phone number and event_id
 */
export async function POST(request: Request) {
    try {
        const { phone, event_id, slug } = await request.json();

        if (!phone || (!event_id && !slug)) {
            return NextResponse.json({ error: "Phone number and Event ID/Slug are required" }, { status: 400 });
        }

        // 1. Fetch Event Details first to get the actual event_id
        let query = supabase.from('events').select('*');
        if (slug) {
            query = query.eq('slug', slug);
        } else {
            query = query.eq('id', event_id);
        }
        
        const { data: event, error: eventError } = await query.single();

        if (eventError || !event) {
            return NextResponse.json({ error: "Invalid event link." }, { status: 404 });
        }

        const actual_event_id = event.id;

        // 2. Fetch Guest by phone and actual_event_id
        const { data: guests, error: guestsError } = await supabase
            .from('guests')
            .select('*')
            .eq('event_id', actual_event_id)
            .eq('phone', phone);

        if (guestsError) throw guestsError;

        if (!guests || guests.length === 0) {
            return NextResponse.json({ error: "No guest found with this phone number for this event." }, { status: 404 });
        }

        const guest = guests[0];

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
