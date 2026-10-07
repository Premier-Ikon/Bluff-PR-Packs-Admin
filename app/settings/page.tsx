"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminChrome } from "../components/AdminChrome";
import { adminApi } from "../lib/api";
import { useAuth } from "../lib/AuthProvider";

type SiteSettings = {
  bannerImageUrl: string;
  bannerHeading?: string;
  bannerText?: string;
  catalogCollectionHandle: string;
  catalogCollectionTitle?: string;
};

type StoreCollection = {
  handle: string;
  title: string;
};

const FALLBACK_BANNER =
  "https://gotbluff.com/cdn/shop/files/DSC01964_-_2.png?v=1790870251&width=3840";
const FALLBACK_HEADING = "Welcome to Bluff Friends";
const FALLBACK_TEXT =
  "Grab what you want. Browse what's available, select your items and sizes, and submit your order. We'll take care of the rest.";

export default function SettingsPage() {
  const { token } = useAuth();
  const [bannerImageUrl, setBannerImageUrl] = useState(FALLBACK_BANNER);
  const [bannerHeading, setBannerHeading] = useState(FALLBACK_HEADING);
  const [bannerText, setBannerText] = useState(FALLBACK_TEXT);
  const [collectionHandle, setCollectionHandle] = useState("all-product");
  const [collections, setCollections] = useState<StoreCollection[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    Promise.all([
      adminApi<{ settings: SiteSettings }>(token, { action: "getSiteSettings" }),
      adminApi<{ collections: StoreCollection[] }>(token, { action: "listCollections" }),
    ])
      .then(([settingsPayload, collectionsPayload]) => {
        if (cancelled) return;
        setBannerImageUrl(settingsPayload.settings?.bannerImageUrl || FALLBACK_BANNER);
        setBannerHeading(settingsPayload.settings?.bannerHeading ?? FALLBACK_HEADING);
        setBannerText(settingsPayload.settings?.bannerText ?? FALLBACK_TEXT);
        setCollectionHandle(settingsPayload.settings?.catalogCollectionHandle || "all-product");
        setCollections(collectionsPayload.collections || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load settings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setError("");
    setNotice("");
    const selected = collections.find((entry) => entry.handle === collectionHandle);
    try {
      const payload = await adminApi<{ settings: SiteSettings }>(token, {
        action: "updateSiteSettings",
        bannerImageUrl,
        bannerHeading,
        bannerText,
        catalogCollectionHandle: collectionHandle,
        catalogCollectionTitle: selected?.title || "",
      });
      setBannerImageUrl(payload.settings.bannerImageUrl);
      setBannerHeading(payload.settings.bannerHeading ?? "");
      setBannerText(payload.settings.bannerText ?? "");
      setCollectionHandle(payload.settings.catalogCollectionHandle);
      setNotice("Settings saved. The Friends Only page will use them on the next load.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  const preview = /^https:\/\//i.test(bannerImageUrl.trim()) ? bannerImageUrl.trim() : "";

  return (
    <AdminChrome>
      <main className="shell">
        <div className="top">
          <div>
            <h1>Settings</h1>
            <p className="muted">Friends Only banner and catalog order</p>
          </div>
        </div>

        {loading ? <p className="empty">Loading…</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {notice ? <p className="notice">{notice}</p> : null}

        {!loading ? (
          <form className="panel settings-panel" onSubmit={(event) => void onSave(event)}>
            <label>
              Banner image URL
              <input
                value={bannerImageUrl}
                onChange={(event) => setBannerImageUrl(event.target.value)}
                required
                inputMode="url"
                placeholder="https://gotbluff.com/cdn/shop/files/…"
                autoComplete="off"
              />
            </label>
            <p className="muted tiny">
              Paste an image URL from Shopify. It spans the top of Friends Only and scales with the screen.
            </p>
            <label>
              Banner heading
              <input
                value={bannerHeading}
                onChange={(event) => setBannerHeading(event.target.value)}
                placeholder="Welcome to Bluff Friends"
                autoComplete="off"
              />
            </label>
            <label>
              Banner text
              <textarea
                value={bannerText}
                onChange={(event) => setBannerText(event.target.value)}
                rows={3}
                placeholder="Grab what you want..."
              />
            </label>
            <p className="muted tiny">Leave the heading or text blank to hide it.</p>
            {preview ? (
              <div className="banner-preview">
                <img src={preview} alt="Banner preview" />
                {bannerHeading || bannerText ? (
                  <div className="banner-preview-copy">
                    {bannerHeading ? <strong>{bannerHeading}</strong> : null}
                    {bannerText ? <span>{bannerText}</span> : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            <label>
              Catalog order
              <select value={collectionHandle} onChange={(event) => setCollectionHandle(event.target.value)}>
                {!collections.some((entry) => entry.handle === collectionHandle) ? (
                  <option value={collectionHandle}>{collectionHandle}</option>
                ) : null}
                {collections.map((entry) => (
                  <option key={entry.handle} value={entry.handle}>
                    {entry.title}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted tiny">
              Products follow this Shopify collection. Reorder it in Shopify admin and Friends Only uses that order.
              Size filters use the SMALL through 6XLARGE collections from the store.
            </p>

            <button className="primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </button>
          </form>
        ) : null}
      </main>
    </AdminChrome>
  );
}
