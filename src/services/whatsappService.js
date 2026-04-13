import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * @param {Object} params
 * @param {string} params.phoneNumber
 * @param {string} params.guestName
 * @param {string} [params.eventName]
 * @param {string} [params.eventDate]
 * @param {string} [params.eventLocation]
 * @param {string} [params.rsvpLink]
 * @param {string} params.campaignName
 * @param {string} [params.eventId]
 * @param {string} [params.guestId]
 * @param {string} [params.messageType]
 * @param {any[]} [params.customParams]
 */
export const sendWhatsAppMessage = async ({
    phoneNumber,
    guestName,
    eventName,
    eventDate,
    eventLocation,
    rsvpLink,
    campaignName,
    eventId,
    guestId,
    messageType,
    customParams
}) => {
    const apiKey = process.env.AISENSY_API_KEY;

    if (!apiKey) {
        console.error("AISENSY_API_KEY is not defined in environment variables");
        return { success: false, error: "API Key missing" };
    }

    // Prepare template parameters for the message
    // The order must match the placeholders {{1}}, {{2}}, etc. in your AiSensy template
    const templateParams = customParams || [
        guestName,
        eventName,
        eventDate,
        eventLocation,
        rsvpLink
    ];

    const payload = {
        apiKey: apiKey,
        campaignName: campaignName,
        destination: phoneNumber,
        userName: guestName,
        templateParams: templateParams
    };

    try {
        const response = await fetch("https://backend.aisensy.com/campaign/t1/api/v2", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });


        const data = await response.json();

        const success = response.ok;
        let errorMsg = "";

        if (!success) {
            console.error("AiSensy API Error:", data);
            
            // Extract the most human-readable error possible
            if (data.errorMessage) errorMsg = data.errorMessage;
            else if (data.message) errorMsg = data.message;
            else if (data.error) errorMsg = data.error;
            else if (data.msg) errorMsg = data.msg;
            else if (data.errors && data.errors[0]) errorMsg = data.errors[0];
            else if (typeof data === 'string') errorMsg = data;
            else errorMsg = "Failed to send message";
        }

        // --- Log to database ---
        if (eventId && guestId && messageType) {
            try {
                const { error: logError } = await supabaseAdmin.from('whatsapp_logs').insert([{
                    event_id: eventId,
                    guest_id: guestId,
                    phone: phoneNumber,
                    message_type: messageType,
                    status: success ? 'Sent' : 'Failed'
                }]);
                if (logError) throw logError;
            } catch (logError) {
                console.error("CRITICAL: WhatsApp Log Database Error:", logError);
            }
        }

        if (!success) return { success: false, error: errorMsg };
        return { success: true, data };

    } catch (error) {
        console.error("WhatsApp Service Error:", error);
        
        // Log failure if IDs provided
        if (eventId && guestId && messageType) {
            try {
                await supabaseAdmin.from('whatsapp_logs').insert([{
                    event_id: eventId,
                    guest_id: guestId,
                    phone: phoneNumber,
                    message_type: messageType,
                    status: 'Failed'
                }]);
            } catch (ignore) {}
        }

        return { success: false, error: error.message };
    }
};
