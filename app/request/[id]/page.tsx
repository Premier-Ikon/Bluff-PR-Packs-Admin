"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AdminChrome } from "../../components/AdminChrome";
import { adminApi, type PrRequest } from "../../lib/api";
import { useAuth } from "../../lib/AuthProvider";
import { STATUSES, formatWhen, pieceCount, shipLine } from "../../lib/requestHelpers";

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
  const { token } = useAuth();
  const [request, setRequest] = useState<PrRequest | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [holdDays, setHoldDays] = useState(7);

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

  const pieces = request ? pieceCount(request) : 0;
  const hasOrder = Boolean(request?.shopifyOrderId);

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
                      {request.createdAt ? ` · ${formatWhen(request.createdAt)}` : ""}
                      {` · ${pieces} piece${pieces === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <div className="pills">
                    <span className={`pill${request.status === "new" ? " is-new" : ""}`}>
                      {request.status}
                    </span>
                    {request.emailed ? <span className="pill is-ok">Emailed</span> : null}
                    {hasOrder ? <span className="pill is-ok">Reserved</span> : null}
                  </div>
                </div>

                <div className="panel-grid">
                  <div>
                    <p className="section-label">Ship to</p>
                    <p className="detail-copy">{shipLine(request)}</p>
                  </div>
                  <div>
                    <p className="section-label">Details</p>
                    <p className="detail-copy">
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
                      Creates a complimentary Shopify order under <strong>info@gotbluff.com</strong>, ships to this
                      request address, and reserves the sizes.
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
            </aside>
          </div>
        ) : null}
      </main>
    </AdminChrome>
  );
}
