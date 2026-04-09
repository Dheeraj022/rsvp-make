import { NextResponse } from 'next/server';
import { format } from 'date-fns';
import { sendWhatsAppMessage } from '@/services/whatsappService';

/**
 * Controller for sending individual WhatsApp messages for various event templates
 */
export async function POST(request) {
    try {
        const { guest, event, messageType } = await request.json();

        if (!guest || !guest.phone) {
            return NextResponse.json({ error: "Missing guest phone number" }, { status: 400 });
        }

        if (!event) {
            return NextResponse.json({ error: "No event details provided" }, { status: 400 });
        }

        // Map UI labels to campaign environment variables
        const campaignMaps = {
            'Invite': process.env.AISENSY_INVITE_CAMPAIGN || "GUEST_INVITE",
            'Reminder': process.env.AISENSY_REMINDER_CAMPAIGN || "rsvp_reminder",
            'Thank You': process.env.AISENSY_THANKYOU_CAMPAIGN || "thankyou_template",
            'Arrival': process.env.AISENSY_ARRIVAL_CAMPAIGN || "GUEST_ARRIVAL",
            'Departure': process.env.AISENSY_DEPARTURE_CAMPAIGN || "GUEST_DEPARTURE",
            'RSVP Confirm': process.env.AISENSY_CONFIRM_CAMPAIGN || "RSVP_CONFIRM"
        };

        const campaignName = campaignMaps[messageType] || campaignMaps['Invite'];
        
        // Format the date for the WhatsApp message
        const formattedDate = event.date ? format(new Date(event.date), "MMMM d, yyyy") : "";

        // Define custom parameters based on message type
        let customParams = undefined;

        if (messageType === 'Thank You') {
            // {{1}} Guest Name, {{2}} Event Name, {{3}} RSVP Link
            customParams = [
                guest.name,
                event.name,
                `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/r/${event.slug}`
            ];
        }

        // Send message using the service
        const response = await sendWhatsAppMessage({
            phoneNumber: guest.phone,
            guestName: guest.name,
            eventName: event.name,
            eventDate: formattedDate,
            eventLocation: event.location,
            rsvpLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/r/${event.slug}`,
            campaignName: campaignName,
            eventId: event.id,
            guestId: guest.id,
            messageType: messageType,
            customParams: customParams
        });

        if (response.success) {
            return NextResponse.json({ 
                success: true, 
                message: `${messageType} message sent successfully.` 
            });
        } else {
            console.error(`WhatsApp Service failed for ${messageType}:`, response.error);
            return NextResponse.json({ 
                success: false, 
                error: response.error || `Failed to send ${messageType}` 
            }, { status: 500 });
        }

    } catch (error) {
        console.error("WhatsApp Send API Route Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
