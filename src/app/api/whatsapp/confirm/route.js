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

        const campaignName = process.env.AISENSY_CONFIRM_CAMPAIGN || "RSVP_CONFIRM_TEMPLATE";
        
        // Format the date for the WhatsApp message
        const formattedDate = event.date ? format(new Date(event.date), "MMMM d, yyyy") : "";

        const result = await sendWhatsAppMessage({
            phoneNumber: guest.phone,
            guestName: guest.name,
            eventName: event.name,
            eventDate: formattedDate,
            eventLocation: event.location,
            rsvpLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/r/${event.slug}`,
            campaignName: campaignName
        });

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
