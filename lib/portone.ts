export const portOneStoreId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
export const portOneChannelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;
export const portOneApiSecret = process.env.PORTONE_API_SECRET;

export function getPublicPortOneConfig() {
  return {
    storeId: portOneStoreId ?? null,
    channelKey: portOneChannelKey ?? null,
  };
}

export function requirePortOneApiSecret() {
  if (!portOneApiSecret) {
    throw new Error("Missing PORTONE_API_SECRET.");
  }

  return portOneApiSecret;
}
