// lib/metaEmbeddedSignup.ts

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v23.0';
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

type ExchangeCodeResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

type PhoneNumberResponse = {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
};

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getMetaClientConfig() {
  return {
    appId: requiredEnv('META_APP_ID'),
    configId: requiredEnv('META_EMBEDDED_SIGNUP_CONFIG_ID'),
    apiVersion: GRAPH_VERSION,
  };
}

export async function exchangeEmbeddedSignupCode(code: string) {
  const clientId = requiredEnv('META_APP_ID');
  const clientSecret = requiredEnv('META_APP_SECRET');
  const redirectUri = process.env.META_EMBEDDED_SIGNUP_REDIRECT_URI;

  const url = new URL(`${GRAPH_BASE_URL}/oauth/access_token`);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('client_secret', clientSecret);
  url.searchParams.set('code', code);

  if (redirectUri) {
    url.searchParams.set('redirect_uri', redirectUri);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    cache: 'no-store',
  });

  const data = (await response.json()) as ExchangeCodeResponse & {
    error?: { message?: string };
  };

  if (!response.ok || !data.access_token) {
    throw new Error(data?.error?.message || 'Falha ao trocar code por token');
  }

  return data;
}

export async function getPhoneNumberDetails(phoneNumberId: string, businessToken: string) {
  const url = new URL(`${GRAPH_BASE_URL}/${phoneNumberId}`);
  url.searchParams.set('fields', 'id,display_phone_number,verified_name,quality_rating');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${businessToken}`,
    },
    cache: 'no-store',
  });

  const data = (await response.json()) as PhoneNumberResponse & {
    error?: { message?: string };
  };

  if (!response.ok || !data.id) {
    throw new Error(data?.error?.message || 'Falha ao buscar telefone');
  }

  return data;
}

export async function subscribeAppToWaba(wabaId: string, businessToken: string) {
  const response = await fetch(`${GRAPH_BASE_URL}/${wabaId}/subscribed_apps`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${businessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const data = (await response.json()) as {
    success?: boolean;
    error?: { message?: string };
  };

  if (!response.ok || !data.success) {
    throw new Error(data?.error?.message || 'Falha ao assinar app no WABA');
  }

  return data;
}

export async function registerPhoneNumber(
  phoneNumberId: string,
  businessToken: string,
  pin?: string
) {
  const body = pin ? { messaging_product: 'whatsapp', pin } : { messaging_product: 'whatsapp' };

  const response = await fetch(`${GRAPH_BASE_URL}/${phoneNumberId}/register`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${businessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = (await response.json()) as {
    success?: boolean;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Falha ao registrar número');
  }

  return data;
}