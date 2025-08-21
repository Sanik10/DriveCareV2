export interface NotificationChannel {
  email?: string;
  phone?: string;
}

export interface NotificationMessage {
  subject: string;
  text: string;
  html?: string;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
