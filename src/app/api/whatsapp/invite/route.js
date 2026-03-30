import { NextResponse } from 'next/server';
import { format } from 'date-fns';
import { sendWhatsAppMessage } from '@/services/whatsappService';

/**
 * Controller for sending bulk WhatsApp invites after guest upload
 */
export async function POST(request) {
    try {
        const { guests, event } = await request.json();

        if (!guests || !Array.isArray(guests)) {
            return NextResponse.json({ error: "No guests provided" }, { status: 400 });
        }

        if (!event) {
            return NextResponse.json({ error: "No event details provided" }, { status: 400 });
        }

        const campaignName = process.env.AISENSY_INVITE_CAMPAIGN || "GUEST_INVITE";
        
        // Format the date for the WhatsApp message
        const formattedDate = event.date ? format(new Date(event.date), "MMMM d, yyyy") : "";

        // Send invites asynchronously and track results
        const results = await Promise.allSettled(
            guests.filter(g => g.phone).map(guest => 
                sendWhatsAppMessage({
                    phoneNumber: guest.phone,
                    guestName: guest.name,
                    eventName: event.name,
                    eventDate: formattedDate,
                    eventLocation: event.location,
                    rsvpLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/r/${event.slug}`,
                    campaignName: campaignName
                })
            )
        );

        const successes = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failedDetails = results
            .filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success))
            .map(r => r.status === 'rejected' ? r.reason : r.value.error);
        
        const failures = results.length - successes;

        return NextResponse.json({
            message: `Processed ${results.length} invites. Sent: ${successes}, Errors: ${failures}`,
            successes,
            failures,
            errors: failedDetails
        });

    } catch (error) {
        console.error("Invite API Route Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
