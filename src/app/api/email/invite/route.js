import { NextResponse } from 'next/server';
import { format } from 'date-fns';
import { generateInviteHtml, sendBatchEmails } from '@/services/emailService';

/**
 * Controller for sending bulk Email invites
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

        const validGuests = guests.filter(g => g.email);
        if (validGuests.length === 0) {
            return NextResponse.json({ message: "No valid email addresses found", successes: 0, failures: 0 });
        }

        // Format the date for the email
        const formattedDate = event.date ? format(new Date(event.date), "MMMM d, yyyy") : "";
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

        // Prepare payloads for batch sending
        const payloads = validGuests.map(guest => ({
            email: guest.email,
            subject: `Invitation: ${event.name}`,
            html: generateInviteHtml({
                guestName: guest.name,
                eventName: event.name,
                eventDate: formattedDate,
                eventLocation: event.location,
                rsvpLink: `${baseUrl}/confirm/${event.slug}`
            }),
            guestId: guest.id,
            eventId: event.id,
            messageType: 'Invite'
        }));

        // Send in batches of 100 (Resend limit)
        const CHUNK_SIZE = 100;
        let successes = 0;
        let failures = 0;
        const errors = [];

        for (let i = 0; i < payloads.length; i += CHUNK_SIZE) {
            const chunk = payloads.slice(i, i + CHUNK_SIZE);
            const result = await sendBatchEmails(chunk);
            
            if (result.success) {
                // In batch, we assume success for the chunk if the API call succeeded
                // (Individual failures are logged inside sendBatchEmails)
                successes += chunk.length;
            } else {
                failures += chunk.length;
                errors.push(result.error);
                console.error("Batch Chunk Error:", result.error);
            }
        }

        return NextResponse.json({
            message: `Processed ${payloads.length} email invites. Sent: ${successes}, Errors: ${failures}`,
            successes,
            failures,
            errors
        });

    } catch (error) {
        console.error("Email Invite API Route Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
