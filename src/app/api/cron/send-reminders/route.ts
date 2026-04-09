import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { format, differenceInCalendarDays, differenceInHours } from 'date-fns';
import { sendWhatsAppMessage } from '@/services/whatsappService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // Optional: Check authorization header for Vercel Cron. 
        // Not enforcing failure if CRON_SECRET is empty so manual testing is easy.
        const authHeader = request.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch upcoming events
        const { data: events, error: eventsError } = await supabase
            .from('events')
            .select('id, name, date, location, slug');

        if (eventsError) throw eventsError;

        let processedCount = 0;
        let sentCount = 0;
        let failedCount = 0;

        const now = new Date();

        for (const event of events) {
            if (!event.date) continue;
            const eventDate = new Date(event.date);

            // Skip past events
            if (eventDate < now) continue;

            const daysDiff = differenceInCalendarDays(eventDate, now);
            const hoursDiff = differenceInHours(eventDate, now);

            // Determine which reminders should be sent for this event right now.
            // 72 hours reminder (within 72 hour window)
            // 7 days reminder (exactly 7 days out)
            const remindersToSend: string[] = [];
            
            if (daysDiff === 7) {
                remindersToSend.push('reminder_7_days');
            }
            if (hoursDiff <= 72) {
                remindersToSend.push('reminder_72_hours');
            }

            if (remindersToSend.length === 0) continue;

            // 2. Fetch all pending guests for this event
            const { data: guests, error: guestsError } = await supabase
                .from('guests')
                .select('id, name, phone, status')
                .eq('event_id', event.id)
                .eq('status', 'pending');

            if (guestsError) {
                console.error(`Error fetching guests for event ${event.id}:`, guestsError);
                continue;
            }

            if (!guests || guests.length === 0) continue;

            const formattedDate = format(eventDate, "MMMM d, yyyy");
            const rsvpLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/confirm/${event.slug}`;

            // 3. Process each guest and each valid reminder type
            for (const guest of guests) {
                if (!guest.phone) continue;

                for (const messageType of remindersToSend) {
                    // Check if already scheduled/sent for this specific message_type
                    const { data: existingRecords } = await supabase
                        .from('whatsapp_scheduled_messages')
                        .select('id')
                        .eq('event_id', event.id)
                        .eq('guest_id', guest.id)
                        .eq('message_type', messageType);

                    if (existingRecords && existingRecords.length > 0) {
                        continue; // Already processed
                    }

                    // Insert pending record
                    const { error: insertError } = await supabase
                        .from('whatsapp_scheduled_messages')
                        .insert([{
                            event_id: event.id,
                            guest_id: guest.id,
                            message_type: messageType,
                            status: 'pending'
                        }]);
                    
                    if (insertError) {
                        console.error("Error inserting pending reminder:", insertError);
                        continue; // Skip if we can't lock
                    }

                    processedCount++;

                    // Send message
                    const result = await sendWhatsAppMessage({
                        phoneNumber: guest.phone,
                        guestName: guest.name,
                        eventName: event.name,
                        eventDate: formattedDate,
                        eventLocation: event.location,
                        rsvpLink: rsvpLink,
                        campaignName: process.env.AISENSY_REMINDER_CAMPAIGN || 'rsvp_reminder', // Use environment variable with fallback
                        eventId: event.id,
                        guestId: guest.id,
                        messageType: messageType,
                        customParams: [
                            guest.name,
                            event.name,
                            event.slug
                        ]
                    });

                    // Update status
                    const finalStatus = result.success ? 'sent' : 'failed';
                    if (result.success) sentCount++;
                    else failedCount++;

                    await supabase
                        .from('whatsapp_scheduled_messages')
                        .update({ 
                            status: finalStatus,
                            sent_at: result.success ? new Date().toISOString() : null
                        })
                        .eq('event_id', event.id)
                        .eq('guest_id', guest.id)
                        .eq('message_type', messageType);
                }
            }
        }

        return NextResponse.json({
            message: "Cron job executed successfully",
            processed: processedCount,
            sent: sentCount,
            failed: failedCount
        });

    } catch (error: any) {
        console.error("Cron Reminder Job Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
