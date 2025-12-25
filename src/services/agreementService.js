// services/agreementService.js (New File)

/**
 * Generates the full HTML content for the agreement preview.
 * This HTML uses INLINE CSS for email compatibility and Tailwind-like appearance.
 * @param {object} userData - User and GSTIN details.
 * @param {string} agreementText - The raw agreement text.
 * @returns {string} The styled HTML string.
 */
export const generateAgreementPreviewHtml = (userData, agreementText) => {
    // This is where you apply INLINE CSS for a better look.
    // Tailwind classes will NOT work here, only direct HTML/Inline CSS.

    const legalName = userData.gstinDetails?.legalName || userData.name || '[N/A]';
    const gstin = userData.gstinDetails?.gstin || '[N/A]';

    // We structure the HTML document here with inline styles
    return `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; background-color: #ffffff;">
            
            <div style="border-bottom: 4px solid #4F46E5; padding: 20px 0; text-align: center; background-color: #EEF2FF; margin-bottom: 20px;">
                <h2 style="font-size: 24px; color: #3730A3; margin: 0;">CLIENT ENTITY VERIFICATION</h2>
                <p style="font-size: 14px; color: #6366F1; margin-top: 5px;">Review the data used in the legal agreement below.</p>
            </div>

            <div style="padding: 0 30px;">
                <div style="display: flex; flex-wrap: wrap; margin-bottom: 20px; border: 1px solid #E0E7FF; padding: 15px; background-color: #F8FAFF; border-radius: 6px;">
                    <p style="flex: 1 1 50%; margin: 5px 0; font-size: 14px;"><strong style="color: #1F2937;">Legal Name:</strong> ${legalName}</p>
                    <p style="flex: 1 1 50%; margin: 5px 0; font-size: 14px;"><strong style="color: #1F2937;">Trade Name:</strong> ${userData.gstinDetails?.tradeName || '[N/A]'}</p>
                    <p style="flex: 1 1 50%; margin: 5px 0; font-size: 14px;"><strong style="color: #1F2937;">GSTIN:</strong> ${gstin}</p>
                    <p style="flex: 1 1 50%; margin: 5px 0; font-size: 14px;"><strong style="color: #1F2937;">Email:</strong> ${userData.email || '[N/A]'}</p>
                </div>
            </div>

            <div style="padding: 20px 30px;">
                <h3 style="font-size: 20px; color: #1F2937; border-bottom: 1px solid #D1D5DB; padding-bottom: 5px; margin-bottom: 15px;">Complete Service Agreement Text</h3>
                <div style="background-color: #fff; padding: 20px; border: 1px solid #CCC; border-radius: 8px;">
                    <pre style="white-space: pre-wrap; font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.8; margin: 0; color: #1F2937;">
${agreementText}
                    </pre>
                </div>
            </div>
        </div>
    `;
};