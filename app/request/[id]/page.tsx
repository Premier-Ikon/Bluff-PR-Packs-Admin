"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminChrome } from "../../components/AdminChrome";
import { adminApi, type PrRequest } from "../../lib/api";
import { useAuth } from "../../lib/AuthProvider";
import { STATUSES, formatWhen, pieceCount, shipLine } from "../../lib/requestHelpers";

const CARRIERS = ["UPS", "USPS", "FedEx", "DHL", "Other"];

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7.5 7.5 8.4 19h7.2l.9-11.5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M10.5 11v5M13.5 11v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function formatReserveDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params.id || "");
  const router = useRouter();
  const { token } = useAuth();
  const [request, setRequest] = useState<PrRequest | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingTracking, setSavingTracking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [holdDays, setHoldDays] = useState(7);
  const [trackingCarrier, setTrackingCarrier] = useState("UPS");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [shippingNote, setShippingNote] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(true);

  useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    async function loadRequest() {
      try {
        let next: PrRequest | null = null;
        try {
          const payload = await adminApi<{ request: PrRequest }>(token, { action: "getRequest", id });
          next = payload.request;
        } catch (err) {
          const message = err instanceof Error ? err.message : "";
          if (!/unknown action/i.test(message)) throw err;
          const listed = await adminApi<{ requests: PrRequest[] }>(token, { action: "listRequests" });
          next = (listed.requests || []).find((entry) => entry.id === id) || null;
          if (!next) throw new Error("That request was not found.");
        }
        if (cancelled || !next) return;
        setRequest(next);
        setTrackingCarrier(next.trackingCarrier || "UPS");
        setTrackingNumber(next.trackingNumber || "");
        setTrackingUrl(next.trackingUrl || "");
        setShippingNote(next.shippingNote || "");
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load request.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadRequest();
    return () => {
      cancelled = true;
    };
  }, [token, id]);

  async function changeStatus(status: string) {
    if (!token || !request) return;
    setSaving(true);
    setError("");
    try {
      const payload = await adminApi<{ request: PrRequest }>(token, {
        action: "updateRequest",
        id: request.id,
        status,
      });
      setRequest(payload.request);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update request.");
    } finally {
      setSaving(false);
    }
  }

  async function onCreateOrder() {
    if (!token || !request) return;
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const payload = await adminApi<{ request: PrRequest; message?: string }>(token, {
        action: "createShopifyOrder",
        id: request.id,
        holdDays,
      });
      setRequest(payload.request);
      setNotice(payload.message || "Shopify order created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create Shopify order.");
    } finally {
      setCreating(false);
    }
  }

  async function onDelete() {
    if (!token || !request) return;
    setDeleting(true);
    setError("");
    setNotice("");
    try {
      await adminApi(token, { action: "deleteRequest", id: request.id });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete that request.");
      setDeleting(false);
    }
  }

  async function onSaveTracking(event: FormEvent) {
    event.preventDefault();
    if (!token || !request) return;
    setSavingTracking(true);
    setError("");
    setNotice("");
    try {
      const payload = await adminApi<{ request: PrRequest; message?: string }>(token, {
        action: "updateTracking",
        id: request.id,
        trackingCarrier,
        trackingNumber,
        trackingUrl,
        shippingNote,
        notify: notifyCustomer,
      });
      setRequest(payload.request);
      setTrackingCarrier(payload.request.trackingCarrier || trackingCarrier);
      setTrackingNumber(payload.request.trackingNumber || trackingNumber);
      setTrackingUrl(payload.request.trackingUrl || trackingUrl);
      setShippingNote(payload.request.shippingNote || shippingNote);
      setNotice(payload.message || "Tracking saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save tracking.");
    } finally {
      setSavingTracking(false);
    }
  }

  const pieces = request ? pieceCount(request) : 0;
  const hasOrder = Boolean(request?.shopifyOrderId);
  const hasTracking = Boolean(request?.trackingNumber);

  return (
    <AdminChrome>
      <main className="shell detail-shell">
        <Link className="back-link" href="/">
          ← All requests
        </Link>

        {loading ? <p className="empty">Loading…</p> : null}
        {error ? <p className="error banner-error">{error}</p> : null}
        {notice ? <p className="notice banner-notice">{notice}</p> : null}

        {!loading && request ? (
          <div className="detail-layout">
            <div className="detail-main">
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <p className="section-label">Customer</p>
                    <h1>{request.name}</h1>
                    <p className="request-meta">
                      <a href={`mailto:${request.email}`}>{request.email}</a>
                      {request.phone ? (
                        <>
                          {" · "}
                          <a href={`tel:${request.phone}`}>{request.phone}</a>
                        </>
                      ) : null}
                      {request.createdAt ? ` · ${formatWhen(request.createdAt)}` : ""}
                      {` · ${pieces} piece${pieces === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <div className="head-tools">
                    <div className="pills">
                      <span className={`pill${request.status === "new" ? " is-new" : ""}`}>
                        {request.status}
                      </span>
                      {request.emailed ? <span className="pill is-ok">Emailed</span> : null}
                      {hasOrder ? <span className="pill is-ok">Reserved</span> : null}
                      {hasTracking ? <span className="pill is-ok">Tracked</span> : null}
                    </div>
                    <button
                      className="icon-btn"
                      type="button"
                      aria-label="Delete request"
                      disabled={deleting}
                      onClick={() => setConfirmDelete((open) => !open)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
                {confirmDelete ? (
                  <div className="delete-confirm">
                    <p>
                      {hasOrder
                        ? "Delete this request and cancel the Shopify order? Inventory will be restocked. The customer is not emailed."
                        : "Delete this request from the dashboard?"}
                    </p>
                    <div className="delete-confirm-actions">
                      <button className="ghost" type="button" disabled={deleting} onClick={() => setConfirmDelete(false)}>
                        Keep
                      </button>
                      <button className="primary" type="button" disabled={deleting} onClick={() => void onDelete()}>
                        {deleting ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="panel-grid">
                  <div>
                    <p className="section-label">Ship to</p>
                    <p className="detail-copy">{shipLine(request)}</p>
                  </div>
                  <div>
                    <p className="section-label">Details</p>
                    <p className="detail-copy">
                      {request.phone ? (
                        <>
                          <a href={`tel:${request.phone}`}>{request.phone}</a>
                          <br />
                        </>
                      ) : (
                        <>
                          No phone
                          <br />
                        </>
                      )}
                      {request.company || "—"}
                      <br />
                      {request.instagram || "No Instagram"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="panel">
                <div className="panel-head tight">
                  <p className="section-label">Requested items</p>
                </div>
                <div className="detail-items">
                  {request.items.map((item, index) => (
                    <div className="item-row" key={`${request.id}-${index}`}>
                      <div className="item-thumb">
                        {item.image ? <img src={item.image} alt={item.title} /> : null}
                      </div>
                      <div className="item-copy">
                        <strong>
                          {item.qty}× {item.title}
                        </strong>
                        <span>
                          {item.size}
                          {item.color ? ` · ${item.color}` : ""}
                        </span>
                      </div>
                      <span className="item-qty">{item.qty}</span>
                    </div>
                  ))}
                </div>
              </section>

              {request.notes ? (
                <section className="panel">
                  <p className="section-label">Notes</p>
                  <p className="detail-copy">{request.notes}</p>
                </section>
              ) : null}
            </div>

            <aside className="detail-side">
              <section className="panel side-panel">
                <p className="section-label">Status</p>
                <label className="side-label">
                  Workflow
                  <select
                    value={request.status}
                    disabled={saving}
                    onChange={(event) => void changeStatus(event.target.value)}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="muted tiny">ID {request.id}</p>
              </section>

              <section className="panel side-panel">
                <p className="section-label">Shopify</p>
                {hasOrder ? (
                  <div className="shopify-done">
                    <strong>{request.shopifyOrderName}</strong>
                    <p className="detail-copy">
                      Under info@gotbluff.com · inventory reserved
                      {request.shopifyReservedUntil
                        ? ` through ${formatReserveDate(request.shopifyReservedUntil)}`
                        : ""}
                      .
                    </p>
                    {request.shopifyOrderUrl ? (
                      <a className="primary side-btn" href={request.shopifyOrderUrl} target="_blank" rel="noreferrer">
                        Open in Shopify
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <p className="detail-copy side-copy">
                      Creates a Shopify order under <strong>info@gotbluff.com</strong> with catalog prices, a 100%
                      product discount, and a $50 shipping fee. The order is marked paid and the sizes are reserved.
                    </p>

                    <label className="side-label">
                      Hold for
                      <select value={holdDays} onChange={(event) => setHoldDays(Number(event.target.value))}>
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                        <option value={3}>3 days</option>
                      </select>
                    </label>

                    <button
                      className="primary side-btn"
                      type="button"
                      disabled={creating}
                      onClick={() => void onCreateOrder()}
                    >
                      {creating ? "Creating…" : "Create order & reserve"}
                    </button>
                    <p className="muted tiny">
                      Requester details stay in the order note. Cancel the Shopify order if you will not ship.
                    </p>
                  </>
                )}
              </section>

              <section className="panel side-panel">
                <p className="section-label">Shipping</p>
                <p className="detail-copy side-copy">
                  When ShipStation adds tracking in Shopify, it shows up here and the customer is emailed. You can
                  also enter a number manually.
                </p>
                <form className="tracking-form" onSubmit={(event) => void onSaveTracking(event)}>
                  <label className="side-label">
                    Carrier
                    <select
                      value={trackingCarrier}
                      onChange={(event) => setTrackingCarrier(event.target.value)}
                    >
                      {CARRIERS.map((carrier) => (
                        <option key={carrier} value={carrier}>
                          {carrier}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="side-label">
                    Tracking number
                    <input
                      value={trackingNumber}
                      onChange={(event) => setTrackingNumber(event.target.value)}
                      required
                      placeholder="1Z…"
                      autoComplete="off"
                    />
                  </label>
                  <label className="side-label">
                    Tracking link
                    <input
                      value={trackingUrl}
                      onChange={(event) => setTrackingUrl(event.target.value)}
                      placeholder="Optional — auto-filled for UPS / USPS / FedEx / DHL"
                      autoComplete="off"
                    />
                  </label>
                  <label className="side-label">
                    Note to customer
                    <textarea
                      value={shippingNote}
                      onChange={(event) => setShippingNote(event.target.value)}
                      rows={3}
                      placeholder="Optional message included in the email"
                    />
                  </label>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={notifyCustomer}
                      onChange={(event) => setNotifyCustomer(event.target.checked)}
                    />
                    Email customer with tracking
                  </label>
                  <button className="primary side-btn" type="submit" disabled={savingTracking}>
                    {savingTracking
                      ? "Saving…"
                      : notifyCustomer
                        ? "Save & email tracking"
                        : "Save tracking"}
                  </button>
                </form>
                {hasTracking ? (
                  <div className="tracking-saved">
                    {request.trackingUrl ? (
                      <a href={request.trackingUrl} target="_blank" rel="noreferrer">
                        Open tracking
                      </a>
                    ) : null}
                    <p className="muted tiny">
                      {request.trackingEmailed
                        ? `Customer emailed${
                            request.trackingEmailedAt ? ` · ${formatWhen(request.trackingEmailedAt)}` : ""
                          }`
                        : "Tracking saved · customer not emailed yet"}
                      {request.trackingSource === "shopify" ? " · Synced from Shopify" : ""}
                    </p>
                  </div>
                ) : null}
              </section>
            </aside>
          </div>
        ) : null}
      </main>
    </AdminChrome>
  );
}
