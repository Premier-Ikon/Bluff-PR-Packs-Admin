import type { PrRequest } from "./api";

export const STATUSES = ["new", "reviewing", "approved", "shipped", "declined"] as const;

export function formatWhen(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function shipLine(request: PrRequest) {
  if (request.formattedAddress) return request.formattedAddress;
  return [
    request.address,
    request.address2,
    [request.city, request.region, request.postal].filter(Boolean).join(", "),
    request.country,
  ]
    .filter(Boolean)
    .join(", ");
}

export function pieceCount(request: PrRequest) {
  return request.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
}
