import SupportConfig from '../models/SupportConfig.model.js';

/**
 * Get the support configuration
 * GET /api/support-config
 */
export const getSupportConfig = async (req, res) => {
    try {
        let config = await SupportConfig.findOne();

        // If no config exists, create the default one
        if (!config) {
            config = await SupportConfig.create({});
        }

        res.status(200).json({
            success: true,
            data: config
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error fetching support configuration'
        });
    }
};

/**
 * Update the support configuration
 * PUT /api/admin/support-config
 */
export const updateSupportConfig = async (req, res) => {
    try {
        const { heroTitle, heroSubtitle, phone, phoneTitle, email, emailTitle, whatsapp, whatsappTitle, whatsappDesc, whatsappButtonText, faqTitle, callHours, emailResponse, faqs, instagram, facebook, youtube } = req.body;

        let config = await SupportConfig.findOne();

        if (config) {
            config.heroTitle = heroTitle || config.heroTitle;
            config.heroSubtitle = heroSubtitle || config.heroSubtitle;
            config.phone = phone || config.phone;
            config.phoneTitle = phoneTitle || config.phoneTitle;
            config.email = email || config.email;
            config.emailTitle = emailTitle || config.emailTitle;
            config.whatsapp = whatsapp || config.whatsapp;
            config.whatsappTitle = whatsappTitle || config.whatsappTitle;
            config.whatsappDesc = whatsappDesc || config.whatsappDesc;
            config.whatsappButtonText = whatsappButtonText || config.whatsappButtonText;
            config.faqTitle = faqTitle || config.faqTitle;
            config.callHours = callHours || config.callHours;
            config.emailResponse = emailResponse || config.emailResponse;
            if (instagram !== undefined) config.instagram = instagram;
            if (facebook !== undefined) config.facebook = facebook;
            if (youtube !== undefined) config.youtube = youtube;
            if (faqs) config.faqs = faqs;

            await config.save();
        } else {
            config = await SupportConfig.create({
                heroTitle, heroSubtitle, phone, phoneTitle, email, emailTitle, whatsapp, whatsappTitle, whatsappDesc, whatsappButtonText, faqTitle, callHours, emailResponse, faqs, instagram, facebook, youtube
            });
        }

        res.status(200).json({
            success: true,
            message: 'Support configuration updated successfully',
            data: config
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error updating support configuration'
        });
    }
};
