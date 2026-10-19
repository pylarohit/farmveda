import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

/**
 * Migrates existing session stored in cookies by @supabase/ssr to localStorage,
 * and clears legacy chunked cookies to prevent HTTP 431 (Request Header Fields Too Large).
 */
function migrateAndCleanupCookies(url: string) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  try {
    const rawCookies = document.cookie || "";
    if (!rawCookies) return;

    const cookiePairs = rawCookies.split(";").map((c) => c.trim());
    const sbCookies = cookiePairs.filter((c) => c.startsWith("sb-") && c.includes("-auth-token"));

    if (sbCookies.length === 0) return;

    let projectRef = "";
    try {
      if (url) {
        projectRef = new URL(url).hostname.split(".")[0];
      }
    } catch {
      // Ignore URL parse error
    }

    const storageKey = projectRef ? `sb-${projectRef}-auth-token` : "";

    // If localStorage doesn't have the session yet, try to reconstruct it from cookies
    if (storageKey && !window.localStorage.getItem(storageKey)) {
      const chunkMap: Record<number, string> = {};
      let singleVal = "";

      for (const cookie of sbCookies) {
        const [name, ...rest] = cookie.split("=");
        const val = rest.join("=");
        const dotIdx = name.lastIndexOf(".");
        if (dotIdx !== -1) {
          const idx = parseInt(name.slice(dotIdx + 1), 10);
          if (!isNaN(idx)) {
            chunkMap[idx] = val;
            continue;
          }
        }
        singleVal = val;
      }

      let rawSession = "";
      const indices = Object.keys(chunkMap)
        .map(Number)
        .sort((a, b) => a - b);

      if (indices.length > 0) {
        rawSession = indices.map((i) => chunkMap[i]).join("");
      } else if (singleVal) {
        rawSession = singleVal;
      }

      if (rawSession) {
        try {
          let decoded = rawSession;
          if (decoded.startsWith("base64-")) {
            decoded = atob(decoded.slice(7));
          } else {
            decoded = decodeURIComponent(decoded);
          }
          if (decoded.includes("access_token")) {
            window.localStorage.setItem(storageKey, decoded);
          }
        } catch {
          // If decoding failed, continue to delete cookies
        }
      }
    }

    // Now delete all legacy sb-*-auth-token cookies to prevent HTTP 431
    const hostname = window.location.hostname;
    for (const cookie of sbCookies) {
      const name = cookie.split("=")[0].trim();
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
      if (hostname) {
        document.cookie = `${name}=; path=/; domain=${hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
        document.cookie = `${name}=; path=/; domain=.${hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
      }
    }
  } catch (err) {
    console.warn("Cookie migration/cleanup warning:", err);
  }
}

export function createClient(): SupabaseClient {
  if (client) return client;

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

  if (!url || !key) {
    console.warn("Supabase env variables are missing. Auth functions will fail.");
  }

  migrateAndCleanupCookies(url);

  client = createSupabaseClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  });

  return client;
}
