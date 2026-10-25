import { Resend } from 'resend';

export const getResendApiKey = () => process.env.RESEND_API_KEY || '';

export const isResendConfigured = () => {
  const apiKey = getResendApiKey();
  return Boolean(apiKey && apiKey !== 're_123456789' && apiKey.startsWith('re_'));
};

export const getResendClient = () => {
  const apiKey = getResendApiKey();
  return new Resend(apiKey || 're_fallback_key');
};

export const resend = getResendClient();
