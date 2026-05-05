import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// API key is configured at build time and forwarded as a header on every
// request made by the SDK (it works alongside the user-level access token).
const apiKey = import.meta.env.VITE_BASE44_API_KEY;

export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  requiresAuth: false,
  appBaseUrl,
  ...(apiKey ? { headers: { api_key: apiKey } } : {}),
});
