const TELEGRAM_API_BASE = 'https://api.telegram.org';

export interface TelegramStatus {
  configured: boolean;
  botTokenHint: string;
  chatId: string | null;
  message: string;
}

export interface TelegramSendResult {
  messageId: number;
  chatId: string | number;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export class TelegramProvider {
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN;
  private readonly chatId = process.env.TELEGRAM_CHAT_ID;

  isConfigured(): boolean {
    return Boolean(this.botToken && this.chatId);
  }

  status(): TelegramStatus {
    const hint = this.botToken ? `${this.botToken.slice(0, 8)}…` : '(not set)';
    if (!this.botToken) {
      return { configured: false, botTokenHint: hint, chatId: null, message: 'TELEGRAM_BOT_TOKEN is not set' };
    }
    if (!this.chatId) {
      return {
        configured: false,
        botTokenHint: hint,
        chatId: null,
        message: 'TELEGRAM_CHAT_ID is not set — call GET /api/v1/notifications/telegram/setup to auto-discover it',
      };
    }
    return {
      configured: true,
      botTokenHint: hint,
      chatId: this.chatId,
      message: `Telegram active — bot ${hint}, chat ${this.chatId}`,
    };
  }

  async sendMessage(htmlText: string): Promise<TelegramSendResult> {
    if (!this.botToken || !this.chatId) {
      throw new Error('Telegram not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)');
    }
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${this.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: this.chatId, text: htmlText, parse_mode: 'HTML' }),
    });
    if (!res.ok) {
      throw new Error(`Telegram API ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as any;
    return { messageId: data.result.message_id, chatId: data.result.chat.id };
  }

  async discoverChatId(): Promise<{ chatId: string; username: string | null; firstName: string | null } | null> {
    if (!this.botToken) throw new Error('TELEGRAM_BOT_TOKEN is not set');
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${this.botToken}/getUpdates?limit=10`);
    if (!res.ok) throw new Error(`Telegram getUpdates ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as any;
    const updates: any[] = data.result ?? [];
    const latest = [...updates].reverse().find((u) => u.message?.chat);
    if (!latest) return null;
    const chat = latest.message.chat;
    return { chatId: String(chat.id), username: chat.username ?? null, firstName: chat.first_name ?? null };
  }

  formatMessage(title: string, body: string): string {
    return `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(body)}`;
  }
}
