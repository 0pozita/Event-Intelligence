export interface SearchResult {
  title: string;
  url: string;
  publisher: string;
  snippet: string;
}

interface SearchProvider {
  name: string;
  search(query: string, count: number): Promise<SearchResult[]>;
}

// ─── Tavily ───────────────────────────────────────────────────────────────────

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

interface TavilyResponse {
  results: TavilyResult[];
}

class TavilyProvider implements SearchProvider {
  name = "tavily";
  constructor(private apiKey: string) {}

  async search(query: string, count: number): Promise<SearchResult[]> {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: this.apiKey,
        query,
        max_results: count,
        search_depth: "basic",
        include_answer: false,
        include_domains: [],
        exclude_domains: [],
      }),
    });

    if (!res.ok) {
      throw new Error(`Tavily error ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as TavilyResponse;
    return (data.results ?? []).map((r) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      publisher: extractPublisher(r.url ?? ""),
      snippet: r.content ?? "",
    }));
  }
}

// ─── Brave Web Search ─────────────────────────────────────────────────────────

interface BraveWebResult {
  title: string;
  url: string;
  description: string;
  profile?: { name?: string };
}

interface BraveWebResponse {
  web?: { results?: BraveWebResult[] };
}

class BraveProvider implements SearchProvider {
  name = "brave";
  constructor(private apiKey: string) {}

  async search(query: string, count: number): Promise<SearchResult[]> {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(count));
    url.searchParams.set("text_decorations", "0");

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": this.apiKey,
      },
    });

    if (!res.ok) {
      throw new Error(`Brave error ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as BraveWebResponse;
    return (data.web?.results ?? []).map((r) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      publisher: r.profile?.name ?? extractPublisher(r.url ?? ""),
      snippet: r.description ?? "",
    }));
  }
}

// ─── Serper (Google Search) ───────────────────────────────────────────────────

interface SerperOrganicResult {
  title: string;
  link: string;
  snippet: string;
  displayLink?: string;
}

interface SerperResponse {
  organic?: SerperOrganicResult[];
}

class SerperProvider implements SearchProvider {
  name = "serper";
  constructor(private apiKey: string) {}

  async search(query: string, count: number): Promise<SearchResult[]> {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": this.apiKey,
      },
      body: JSON.stringify({ q: query, num: count }),
    });

    if (!res.ok) {
      throw new Error(`Serper error ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as SerperResponse;
    return (data.organic ?? []).map((r) => ({
      title: r.title ?? "",
      url: r.link ?? "",
      publisher: r.displayLink ? cleanDisplayLink(r.displayLink) : extractPublisher(r.link ?? ""),
      snippet: r.snippet ?? "",
    }));
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function getSearchProvider(): SearchProvider | null {
  if (process.env.TAVILY_API_KEY) return new TavilyProvider(process.env.TAVILY_API_KEY);
  if (process.env.BRAVE_API_KEY) return new BraveProvider(process.env.BRAVE_API_KEY);
  if (process.env.SERPER_API_KEY) return new SerperProvider(process.env.SERPER_API_KEY);
  return null;
}

// ─── Web search entry point ───────────────────────────────────────────────────

const SPAM_PATTERNS = [
  /pinterest\./i,
  /quora\./i,
  /reddit\.com\/r\//i,
  /facebook\.com/i,
  /instagram\.com/i,
  /tiktok\.com/i,
  /twitter\.com/i,
  /x\.com/i,
  /amazon\./i,
  /ebay\./i,
  /etsy\./i,
  /yelp\./i,
];

export async function searchWeb(
  query: string,
  count = 8,
): Promise<{ results: SearchResult[]; provider: string } | null> {
  const provider = getSearchProvider();
  if (!provider) return null;

  const raw = await provider.search(query, Math.min(count + 4, 12));

  // Deduplicate by URL and filter spam/low-quality domains
  const seen = new Set<string>();
  const filtered = raw.filter((r) => {
    if (!r.url.startsWith("http")) return false;
    if (!r.snippet || r.snippet.length < 30) return false;
    if (SPAM_PATTERNS.some((p) => p.test(r.url))) return false;
    const key = normalizeUrl(r.url);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { results: filtered.slice(0, count), provider: provider.name };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractPublisher(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const parts = host.split(".");
    if (parts.length >= 2) {
      const tld = parts[parts.length - 1];
      const name = parts[parts.length - 2];
      if (tld === "gov" || tld === "edu") return host;
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return host;
  } catch {
    return "Unknown";
  }
}

function cleanDisplayLink(display: string): string {
  return display.replace(/^www\./, "").split("/")[0] ?? display;
}

function normalizeUrl(url: string): string {
  return url.toLowerCase().replace(/\/$/, "").replace(/^https?:\/\/(www\.)?/, "");
}
