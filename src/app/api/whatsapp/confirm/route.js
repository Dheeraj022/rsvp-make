import { NextResponse } from 'next/server';
import { format } from 'date-fns';
import { sendWhatsAppMessage } from '@/services/whatsappService';

/**
 * Controller for sending WhatsApp confirmation after RSVP submission
 */
export async function POST(request) {
    try {
        const { guest, event } = await request.json();

        if (!guest || !guest.phone) {
            return NextResponse.json({ error: "Guest phone number is required" }, { status: 400 });
        }

        if (!event) {
            return NextResponse.json({ error: "Event details provided are required" }, { status: 400 });
        }

        // Check if WhatsApp is enabled for this event
        if (event.is_whatsapp_enabled === false) {
            return NextResponse.json({ message: "WhatsApp is disabled for this event. Skipping message." });
        }

        const campaignName = process.env.AISENSY_RSVP_CONFIRM_CAMPAIGN || process.env.AISENSY_THANKYOU_CAMPAIGN || process.env.AISENSY_CONFIRM_CAMPAIGN || "thankyou_template";
        
        // Format the date for the WhatsApp message
        const formattedDate = event.date ? format(new Date(event.date), "MMMM d, yyyy") : "";

        const rsvpLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/r/${event.slug}`;

        const result = await sendWhatsAppMessage({
            phoneNumber: guest.phone,
            guestName: guest.name,
            eventName: event.name,
            eventDate: formattedDate,
            eventLocation: event.location,
            rsvpLink: rsvpLink,
            campaignName: campaignName,
            eventId: event.id,
            guestId: guest.id,
            messageType: 'RSVP Confirm',
            customParams: [
                guest.name,
                event.name,
                formattedDate
            ]
        });

        if (result.success) {
            // --- SECOND MESSAGE: Transport Pending Reminder (Asynchronous) ---
            if (event.has_transport === true) {
                // Background delay to avoid "spam" feel and not block the UI
                setTimeout(async () => {
                    try {
                        await sendWhatsAppMessage({
                            phoneNumber: guest.phone,
                            guestName: guest.name,
                            eventName: event.name,
                            rsvpLink: rsvpLink,
                            campaignName: process.env.AISENSY_TRANSPORT_PENDING_CAMPAIGN || 'rsvp_submit_transport_reminder',
                            eventId: event.id,
                            guestId: guest.id,
                            messageType: 'Transport Reminder',
                            customParams: [
                                guest.name,
                                event.name,
                                rsvpLink // Variables mapping: {{1}} Name, {{2}} Event, {{3}} Link
                            ]
                        });
                    } catch (err) {
                        console.error("Async Transport Reminder Error:", err);
                    }
                }, 8000); // 8 second delay
            }
        }

        if (!result.success) {
            return NextResponse.json({ error: result.error || "Failed to send WhatsApp message" }, { status: 500 });
        }

        return NextResponse.json({
            message: "WhatsApp confirmation sent successfully",
            data: result.data
        });

    } catch (error) {
        console.error("Confirmation API Route Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
