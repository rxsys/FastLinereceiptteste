
import { messagingApi } from '@line/bot-sdk';

const { MessagingApiClient } = messagingApi;

/**
 * Factory to create a LINE client dynamically based on company credentials.
 */
export function getLineClient(accessToken: string) {
  return new MessagingApiClient({
    channelAccessToken: accessToken,
  });
}

// Default config for legacy/fallback (optional)
export const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};
