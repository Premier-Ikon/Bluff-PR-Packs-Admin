"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminChrome } from "./components/AdminChrome";
import { adminApi, type PrRequest } from "./lib/api";
import { useAuth } from "./lib/AuthProvider";
import { STATUSES, formatWhen, pieceCount } from "./lib/requestHelpers";

export default function AdminPage() {
  const { token, user } = useAuth();
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("new");
  const [requests, setRequests] = useState<PrRequest[]>([]);

  async function load() {
    if (!token) return;
    const payload = await adminApi<{ requests: PrRequest[] }>(token, { action: "listRequests" });
    setRequests(payload.requests || []);
  }

  useEffect(() => {
    if (!token) return;
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load requests."));
  }, [token]);

  async function onRefresh() {
    setRefreshing(true);
    setError("");
    try {
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh.");
    } finally {
      setRefreshing(false);
    }
  }

  const visible = useMemo(() => {
    if (filter === "all") return requests;
    return requests.filter((request) => request.status === filter);
  }, [requests, filter]);

  const counts = useMemo(() => {
    const next: Record<string, number> = { all: requests.length };
    for (const status of STATUSES) next[status] = 0;
    for (const request of requests) {
      next[request.status] = (next[request.status] || 0) + 1;
    }
    return next;
  }, [requests]);

  return (
    <AdminChrome onRefresh={() => void onRefresh()} refreshing={refreshing}>
      <main className="shell">
        <div className="top">
          <div>
            <h1>PR requests</h1>
            <p className="muted">{user?.email}</p>
          </div>
        </div>

        <div className="stats">
          <div className="stat">
            <strong>{counts.all || 0}</strong>
            <span>Total</span>
          </div>
          <div className="stat">
            <strong>{counts.new || 0}</strong>
            <span>New</span>
          </div>
          <div className="stat">
            <strong>{counts.reviewing || 0}</strong>
            <span>Reviewing</span>
          </div>
          <div className="stat">
            <strong>{counts.approved || 0}</strong>
            <span>Approved</span>
          </div>
          <div className="stat">
            <strong>{counts.shipped || 0}</strong>
            <span>Shipped</span>
          </div>
        </div>

        <div className="filters">
          <button
            type="button"
            className={`filter-chip${filter === "all" ? " is-on" : ""}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          {STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              className={`filter-chip${filter === status ? " is-on" : ""}`}
              onClick={() => setFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>

        {error ? <p className="error">{error}</p> : null}
        {!visible.length ? <p className="empty">No requests in this view yet.</p> : null}

        <section className="request-list">
          {visible.map((request) => {
            const pieces = pieceCount(request);
            const thumb = request.items.find((item) => item.image)?.image || "";
            return (
              <Link className="request-row" href={`/request/${request.id}`} key={request.id}>
                <div className="request-row-thumb">
                  {thumb ? <img src={thumb} alt="" /> : null}
                </div>
                <div className="request-row-main">
                  <div className="request-row-top">
                    <h2>{request.name}</h2>
                    <span className={`pill${request.status === "new" ? " is-new" : ""}`}>
                      {request.status}
                    </span>
                    {request.shopifyOrderId ? <span className="pill is-ok">Reserved</span> : null}
                    {request.trackingNumber ? <span className="pill is-ok">Tracked</span> : null}
                  </div>
                  <p className="request-meta">
                    {request.email}
                    {request.phone ? ` · ${request.phone}` : ""}
                    {request.createdAt ? ` · ${formatWhen(request.createdAt)}` : ""}
                    {` · ${pieces} piece${pieces === 1 ? "" : "s"}`}
                    {request.trackingNumber
                      ? ` · ${[request.trackingCarrier, request.trackingNumber].filter(Boolean).join(" ")}`
                      : ""}
                  </p>
                </div>
                <span className="request-row-chevron" aria-hidden>
                  →
                </span>
              </Link>
            );
          })}
        </section>
      </main>
    </AdminChrome>
  );
}
