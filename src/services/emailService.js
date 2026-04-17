import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends a premium invitation email to a guest
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.guestName
 * @param {string} params.eventName
 * @param {string} params.eventDate
 * @param {string} params.eventLocation
 * @param {string} params.rsvpLink
 */
/**
 * Generates the HTML for a wedding invitation
 */
export const generateInviteHtml = ({ guestName, eventName, eventDate, eventLocation, rsvpLink }) => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                .card { background: #ffffff; border-radius: 24px; padding: 40px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
                .header { text-align: center; margin-bottom: 32px; }
                .event-name { font-size: 24px; font-weight: 800; margin-bottom: 8px; color: #000000; letter-spacing: -0.025em; }
                .greeting { font-size: 18px; font-weight: 600; margin-bottom: 24px; }
                .details { background: #f9fafb; border-radius: 16px; padding: 24px; margin-bottom: 32px; }
                .detail-item { margin-bottom: 12px; display: flex; align-items: center; }
                .detail-label { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; width: 80px; }
                .detail-value { font-size: 15px; font-weight: 600; color: #111827; }
                .cta-container { text-align: center; }
                .button { display: inline-block; background: #000000; color: #ffffff !important; padding: 16px 32px; border-radius: 100px; font-weight: 800; text-decoration: none; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
                .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #6b7280; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="card">
                    <div class="header">
                        <div class="event-name">${eventName}</div>
                        <div style="font-size: 14px; color: #6b7280; font-weight: 500;">Official Wedding Invitation</div>
                    </div>
                    
                    <div class="greeting">Dear ${guestName},</div>
                    
                    <p>We are delighted to invite you to join us for the celebration of <strong>${eventName}</strong>. Your presence would make our special day even more memorable.</p>
                    
                    <div class="details">
                        <div class="detail-item">
                            <span class="detail-label">Date</span>
                            <span class="detail-value">${eventDate}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Venue</span>
                            <span class="detail-value">${eventLocation}</span>
                        </div>
                    </div>
                    
                    <div class="cta-container">
                        <p style="font-size: 14px; color: #4b5563; margin-bottom: 24px;">Kindly RSVP by clicking the button below:</p>
                        <a href="${rsvpLink}" class="button">Confirm Attendance</a>
                    </div>
                </div>
                
                <div class="footer">
                    Sent via Shaadi Platform RSVP System<br>
                    If you have any questions, please contact the event coordinator.
                </div>
            </div>
        </body>
        </html>
    `;
};

/**
 * Sends multiple emails in a single batch call to avoid rate limits
 * @param {Array} emailPayloads - Array of objects containing to, subject, html, guestId, eventId
 */
export const sendBatchEmails = async (emailPayloads) => {
    if (!process.env.RESEND_API_KEY) {
        return { success: false, error: "Email API Key missing" };
    }

    const fromEmail = process.env.EMAIL_FROM || 'Shaadi Platform <no-reply@shaadiplatform.com>';

    // Prepare entries for Resend Batch API
    const entries = emailPayloads.map(payload => ({
        from: fromEmail,
        to: [payload.email],
        subject: payload.subject,
        html: payload.html
    }));

    try {
        const { data, error } = await resend.batch.send(entries);

        // Map results back to original payloads for logging
        for (let i = 0; i < emailPayloads.length; i++) {
            const payload = emailPayloads[i];
            const resultError = (data && data.data && data.data[i] && data.data[i].error) || error;

            try {
                await supabaseAdmin.from('email_logs').insert({
                    event_id: payload.eventId,
                    guest_id: payload.guestId,
                    email: payload.email,
                    message_type: payload.messageType || 'Invite',
                    status: resultError ? 'Failed' : 'Sent',
                    sent_at: new Date().toISOString()
                });
            } catch (logError) {
                console.error("Failed to log batch email:", logError);
            }
        }

        if (error) {
            console.error("Resend Batch Error:", error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error) {
        console.error("Batch Email Service Error:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Sends a single premium invitation email
 */
export const sendEmailInvite = async (params) => {
    const { email, guestName, eventName, eventDate, eventLocation, rsvpLink, guestId, eventId } = params;
    
    if (!email) return { success: false, error: "No email address provided" };

    const fromEmail = process.env.EMAIL_FROM || 'Shaadi Platform <no-reply@shaadiplatform.com>';
    const html = generateInviteHtml({ guestName, eventName, eventDate, eventLocation, rsvpLink });

    try {
        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: [email],
            subject: `Invitation: ${eventName}`,
            html: html
        });

        // Log the email attempt
        try {
            await supabaseAdmin.from('email_logs').insert({
                event_id: eventId,
                guest_id: guestId,
                email: email,
                message_type: 'Invite',
                status: error ? 'Failed' : 'Sent',
                sent_at: new Date().toISOString()
            });
        } catch (logError) {
            console.error("Failed to log email:", logError);
        }

        if (error) return { success: false, error: error.message };
        return { success: true, data };
    } catch (error) {
        console.error("Email Service Error:", error);
        return { success: false, error: error.message };
    }
};
