import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/services/whatsappService';
import { format } from 'date-fns';

/**
 * POST /api/rsvp/confirm-attendance
 * Records the guest's RSVP in the confirmations table
 */
export async function POST(request: Request) {
    try {
        const { event_id, guest_id, phone, status, confirmed_members } = await request.json();

        if (!event_id || !guest_id || !phone || !status) {
            return NextResponse.json({ error: "Missing required fields (event_id, guest_id, phone, status)" }, { status: 400 });
        }

        if (!['confirmed', 'not_attending'].includes(status)) {
            return NextResponse.json({ error: "Invalid status value. Must be 'confirmed' or 'not_attending'" }, { status: 400 });
        }

        // 1. Record the RSVP in the confirmations table
        const { data: rsvpData, error: rsvpError } = await supabase
            .from('rsvp_confirmations')
            .insert([{
                event_id,
                guest_id,
                phone,
                status,
                confirmed_at: new Date().toISOString()
            }])
            .select('*');

        if (rsvpError) throw rsvpError;

        // 2. Update the status in the guests table
        let newGuestStatus = status === 'confirmed' ? 'accepted' : 'declined';
        let updatePayload: any = { status: newGuestStatus };

        // Fetch current guest to handle detailed confirmed_members
        const { data: currentGuest, error: fetchError } = await supabase
            .from('guests')
            .select('attendees_data, name')
            .eq('id', guest_id)
            .single();

        if (!fetchError && currentGuest) {
            let updatedAttendees = currentGuest.attendees_data;
            let attendingCount = status === 'confirmed' ? 1 : 0; // Default to 1 array length logic if no companions

            if (status === 'confirmed' && Array.isArray(confirmed_members)) {
                if (currentGuest.attendees_data && currentGuest.attendees_data.length > 0) {
                    updatedAttendees = currentGuest.attendees_data.map((member: any) => ({
                        ...member,
                        status: confirmed_members.includes(member.name) ? 'accepted' : 'declined'
                    }));
                }
                attendingCount = confirmed_members.length;
                
                // If primary guest is NOT in confirmed_members, but companions are, we should probably set primary status to declined
                // But generally, the primary row represents the 'Group' so we leave it as accepted if count > 0
                if (confirmed_members.length === 0) {
                    updatePayload.status = 'declined';
                }
            } else if (status === 'not_attending') {
                if (currentGuest.attendees_data && currentGuest.attendees_data.length > 0) {
                    updatedAttendees = currentGuest.attendees_data.map((member: any) => ({
                        ...member,
                        status: 'declined'
                    }));
                }
                attendingCount = 0;
            }

            updatePayload.attendees_data = updatedAttendees;
            updatePayload.attending_count = attendingCount;
        }

        const { error: guestUpdateError } = await supabase
            .from('guests')
            .update(updatePayload)
            .eq('id', guest_id);
            
        if (guestUpdateError) {
            console.error("Warning: Failed to update guest status in primary table:", guestUpdateError);
        }

        // 3. Send Thank You WhatsApp Message
        if (status === 'confirmed') {
            try {
                // Check if thank you message already sent
                const { data: existingLog } = await supabase
                    .from('whatsapp_logs')
                    .select('id')
                    .eq('event_id', event_id)
                    .eq('guest_id', guest_id)
                    .eq('message_type', 'thank_you')
                    .maybeSingle();

                if (!existingLog) {
                    // Fetch event and guest details
                    const { data: eventDetails } = await supabase
                        .from('events')
                        .select('name, date, location, slug, has_transport')
                        .eq('id', event_id)
                        .single();
                    
                    const { data: guestDetails } = await supabase
                        .from('guests')
                        .select('name')
                        .eq('id', guest_id)
                        .single();

                    if (eventDetails && guestDetails) {
                        const formattedDate = eventDetails.date ? format(new Date(eventDetails.date), "MMMM d, yyyy") : "";
                        const rsvpLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/confirm/${eventDetails.slug}`;

                        // Send First WhatsApp message: RSVP Confirmation
                        const result = await sendWhatsAppMessage({
                            phoneNumber: phone,
                            guestName: guestDetails.name,
                            eventName: eventDetails.name,
                            eventDate: formattedDate,
                            eventLocation: eventDetails.location,
                            rsvpLink: rsvpLink,
                            campaignName: process.env.AISENSY_RSVP_CONFIRM_CAMPAIGN || process.env.AISENSY_THANKYOU_CAMPAIGN || 'thankyou_template',
                            eventId: event_id,
                            guestId: guest_id,
                            messageType: undefined,
                            customParams: [
                                guestDetails.name,
                                eventDetails.name,
                                formattedDate // Correctly mapping {{3}} to Event Date
                            ]
                        });

                        if (result?.success || result?.success === true) {
                            // Insert log entry for first message
                            await supabase.from('whatsapp_logs').insert([{
                                event_id: event_id,
                                guest_id: guest_id,
                                phone: phone,
                                message_type: 'thank_you',
                                status: 'sent',
                                sent_at: new Date().toISOString()
                            }]);

                            // --- SECOND MESSAGE: Transport Pending Reminder (Asynchronous) ---
                            if (eventDetails.has_transport) {
                                // Background delay to avoid "spam" feel and not block the UI
                                setTimeout(async () => {
                                    try {
                                        await sendWhatsAppMessage({
                                            phoneNumber: phone,
                                            guestName: guestDetails.name,
                                            eventName: eventDetails.name,
                                            rsvpLink: rsvpLink,
                                            campaignName: process.env.AISENSY_TRANSPORT_PENDING_CAMPAIGN || 'rsvp_submit_transport_reminder',
                                            eventId: event_id,
                                            guestId: guest_id,
                                            messageType: 'Transport Reminder',
                                            customParams: [
                                                guestDetails.name,
                                                eventDetails.name,
                                                rsvpLink // Variables mapping: {{1}} Name, {{2}} Event, {{3}} Link
                                            ]
                                        });
                                    } catch (err) {
                                        console.error("Async Transport Reminder Error:", err);
                                    }
                                }, 8000); // 8 second delay
                            }
                        }
                    }
                }
            } catch (thankYouError) {
                console.error("Failed to process Thank You message:", thankYouError);
            }
        }

        return NextResponse.json({
            success: true,
            message: `RSVP registered successfully as ${status}`,
            data: rsvpData
        });

    } catch (error: any) {
        console.error("Confirm RSVP Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
