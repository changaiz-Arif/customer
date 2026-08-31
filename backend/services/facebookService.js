export const facebookService = {
  isConfigured: () => Boolean(process.env.FB_PAGE_ACCESS_TOKEN),
  async sendMessage(recipientId, text) {
    if (!this.isConfigured()) {
      return { success: true, mode: 'demo', warning: 'Facebook Page token missing. Handled in Demo Mode.' };
    }
    return { success: true, mode: 'live', recipientId, text };
  }
};

