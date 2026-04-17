import { NextResponse } from 'next/server';
import { format } from 'date-fns';
import { sendEmailInvite } from '@/services/emailService';

/**
 * POST /api/email/send
 * Specifically for dashboard individual sends (Invite, Reminder, etc.)
 */
export async function POST(request: Request) {
    try {
        const { guest, event, messageType } = await request.json();

        if (!guest || !event) {
            return NextResponse.json({ error: "Guest and Event details are required" }, { status: 400 });
        }

        const formattedDate = event.date ? format(new Date(event.date), "MMMM d, yyyy") : "";
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

        // currently we only have sendEmailInvite, we'll use it but can extend messageType logic later
        const result = await sendEmailInvite({
            email: guest.email,
            guestName: guest.name,
            eventName: event.name,
            eventDate: formattedDate,
            eventLocation: event.location,
            rsvpLink: `${baseUrl}/confirm/${event.slug}`,
            guestId: guest.id,
            eventId: event.id
        });

        if (result.success) {
            return NextResponse.json({ message: "Email sent successfully", data: result.data });
        } else {
            return NextResponse.json({ error: result.error || "Failed to send email" }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Email Send API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
