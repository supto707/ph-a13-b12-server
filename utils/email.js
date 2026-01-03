/**
 * Simple email helper to satisfy requirements.
 * Logs email content to console in development/demo environments.
 */
const sendEmail = async (to, subject, text, html) => {
    console.log('\n--- 📧 EMAIL NOTIFICATION ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Message: ${text}`);
    if (html) {
        console.log(`HTML Body: [HTML Content Provided]`);
    }
    console.log('-----------------------------\n');
    return { success: true, message: 'Email sent (simulated)' };
};

module.exports = { sendEmail };
