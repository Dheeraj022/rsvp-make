/**
 * WhatsApp Service for AiSensy API integration
 * POST https://backend.aisensy.com/campaign/t1/api/v2
 */

export const sendWhatsAppMessage = async ({
    phoneNumber,
    guestName,
    eventName,
    eventDate,
    eventLocation,
    rsvpLink,
    campaignName
}) => {
    const apiKey = process.env.AISENSY_API_KEY;

    if (!apiKey) {
        console.error("AISENSY_API_KEY is not defined in environment variables");
        return { success: false, error: "API Key missing" };
    }

    // Prepare template parameters for the message
    // The order must match the placeholders {{1}}, {{2}}, etc. in your AiSensy template
    const templateParams = [
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

        if (!response.ok) {
            console.error("AiSensy API Error:", data);
            return { success: false, error: data.message || "Failed to send message" };
        }

        return { success: true, data };
    } catch (error) {
        console.error("WhatsApp Service Error:", error);
        return { success: false, error: error.message };
    }
};
