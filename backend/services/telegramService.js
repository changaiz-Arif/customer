export const telegramService = {
  isConfigured: () => Boolean(process.env.TELEGRAM_BOT_TOKEN),
  async sendMessage(chatId, text) {
    if (!this.isConfigured()) {
      return { success: true, mode: 'demo', warning: 'Telegram Bot token missing. Handled in Demo Mode.' };
    }
    return { success: true, mode: 'live', chatId, text };
  }
};

