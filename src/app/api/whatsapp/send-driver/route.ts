import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/services/whatsappService';

/**
 * Controller for sending Driver Assignment WhatsApp messages
 */
export async function POST(request: Request) {
    try {
        const { guest, driver, eventId, eventName } = await request.json();

        if (!guest || !guest.phone) {
            return NextResponse.json({ error: "Missing guest phone number" }, { status: 400 });
        }

        if (!driver || !driver.name || !driver.phone) {
            return NextResponse.json({ error: "Missing driver details" }, { status: 400 });
        }

        if (!eventId) {
            return NextResponse.json({ error: "No event details provided" }, { status: 400 });
        }

        const messageType = "driver_assigned";

        // Step 1: Check Database for existing driver assignment log for this guest
        const { data: existingLog, error: logError } = await supabase
            .from('whatsapp_logs')
            .select('*')
            .eq('guest_id', guest.id)
            .eq('event_id', eventId)
            .eq('message_type', messageType)
            .eq('status', 'Sent')
            .single();

        if (existingLog) {
            return NextResponse.json({ 
                success: false, 
                error: "Deduplication: Driver notification already sent to this guest.",
                duplicate: true
            }, { status: 400 });
        }

        const campaignName = process.env.AISENSY_DRIVER_CAMPAIGN || "driver_assigned";
        
        // Define Custom Template Params (Specifically 4 params as requested)
        // {{1}} Guest Name, {{2}} Event Name, {{3}} Driver Name, {{4}} Driver Phone
        const customParams = [
            guest.name,
            eventName || "the event",
            driver.name,
            driver.phone
        ];

        // Step 2: Send message using the service
        const response = await sendWhatsAppMessage({
            phoneNumber: guest.phone,
            guestName: guest.name,
            eventName: eventName || "the event",
            eventDate: "",
            eventLocation: "",
            rsvpLink: "",
            campaignName: campaignName,
            eventId: eventId,
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
        console.error("WhatsApp Send Driver API Route Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
