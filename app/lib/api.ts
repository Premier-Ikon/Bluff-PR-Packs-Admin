export type PrRequestItem = {
  title: string;
  size: string;
  color?: string;
  qty: number;
  image?: string;
  handle?: string;
  variantId?: string;
  productId?: string;
};

export type ShopifyCustomer = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  ordersCount?: number;
  address?: string;
};

export type PrRequest = {
  id: string;
  status: string;
  name: string;
  email: string;
  phone?: string;
  company: string;
  instagram: string;
  formattedAddress?: string;
  address: string;
  address2?: string;
  city: string;
  region: string;
  postal: string;
  country: string;
  notes: string;
  emailed: boolean;
  emailedTeam?: boolean;
  emailedRequester?: boolean;
  trackingCarrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippingNote?: string;
  trackingEmailed?: boolean;
  trackingEmailedAt?: string | null;
  trackingUpdatedAt?: string | null;
  shopifyCustomerId?: string;
  shopifyCustomerEmail?: string;
  shopifyDraftOrderId?: string;
  shopifyDraftOrderName?: string;
  shopifyDraftOrderUrl?: string;
  shopifyOrderId?: string;
  shopifyOrderName?: string;
  shopifyOrderUrl?: string;
  shopifyReservedUntil?: string | null;
  shopifyReservedAt?: string | null;
  createdAt: string | null;
  updatedAt?: string | null;
  items: PrRequestItem[];
};

const API_URL = process.env.NEXT_PUBLIC_PR_API_URL || "";

async function postApi<T>(body: Record<string, unknown>, token = ""): Promise<T> {
  if (!API_URL) throw new Error("PR API URL is not configured.");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(API_URL, {
    method: "POST",
    headers,
    cache: "no-store",
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as T & { success?: boolean; error?: string };
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || "Could not reach the PR API.");
  }
  return payload;
}

export async function adminApi<T>(token: string, body: Record<string, unknown>): Promise<T> {
  return postApi<T>(body, token);
}

export async function requestAdminCode(email: string) {
  return postApi<{ message?: string }>({ action: "requestAdminCode", email });
}

export async function verifyAdminCode(email: string, code: string) {
  return postApi<{ token: string; email: string; message?: string }>({
    action: "verifyAdminCode",
    email,
    code,
  });
}
