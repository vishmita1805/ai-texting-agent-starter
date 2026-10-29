import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 3000),
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  openaiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? '',
  validateSignature: process.env.VALIDATE_TWILIO_SIGNATURE === 'true',
  publicUrl: process.env.PUBLIC_URL ?? '',
  maxTurns: Number(process.env.MAX_TURNS ?? 10),
  systemPrompt:
    process.env.SYSTEM_PROMPT ??
    'You are a friendly assistant replying over text message. Keep replies short, in plain text, and under 300 characters unless the user asks for more.',
};
