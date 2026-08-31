export const whatsappService = {
  isConfigured: () => Boolean(process.env.WHATSAPP_TOKEN),
  async sendMessage(to, message) {
    if (!this.isConfigured()) {
      return { success: true, mode: 'demo', warning: 'WhatsApp credentials missing. Message simulated in Demo Mode.' };
    }
    // Live WhatsApp Cloud API call would go here
    return { success: true, mode: 'live', recipient: to, message };
  }
};

