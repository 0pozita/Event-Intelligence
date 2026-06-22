// Known-domain credibility scores (0–100)
// Higher = more authoritative, factual, editorial standards
const DOMAIN_SCORES: Record<string, number> = {
  // Wire services — most reliable
  "reuters.com": 95,
  "apnews.com": 95,

  // Public broadcasters / major international press
  "bbc.com": 92,
  "bbc.co.uk": 92,
  "npr.org": 90,
  "pbs.org": 88,
  "dw.com": 88,
  "rfi.fr": 85,
  "aljazeera.com": 82,
  "france24.com": 83,
  "abc.net.au": 85,
  "theguardian.com": 88,
  "economist.com": 90,
  "ft.com": 90,

  // Broadsheets / quality press
  "nytimes.com": 88,
  "washingtonpost.com": 87,
  "wsj.com": 87,
  "latimes.com": 84,
  "chicagotribune.com": 82,
  "bostonglobe.com": 84,
  "politico.com": 82,
  "theatlantic.com": 85,
  "newyorker.com": 86,
  "slate.com": 75,
  "vox.com": 78,
  "axios.com": 82,
  "bloomberg.com": 88,
  "businessinsider.com": 72,
  "forbes.com": 72,
  "fortune.com": 74,

  // Broadcast / network news
  "cnn.com": 80,
  "nbcnews.com": 82,
  "cbsnews.com": 83,
  "abcnews.go.com": 82,
  "foxnews.com": 68,
  "msnbc.com": 72,
  "sky.com": 80,
  "itv.com": 78,
  "time.com": 80,
  "newsweek.com": 72,
  "thehill.com": 75,
  "usatoday.com": 78,

  // Science / academic publishers
  "nature.com": 96,
  "science.org": 96,
  "cell.com": 94,
  "thelancet.com": 95,
  "nejm.org": 97,
  "bmj.com": 94,
  "jamanetwork.com": 94,
  "pubmed.ncbi.nlm.nih.gov": 95,
  "plos.org": 88,
  "sciencedirect.com": 88,
  "springer.com": 88,
  "wiley.com": 87,

  // Reference / encyclopedias
  "wikipedia.org": 72,
  "britannica.com": 85,

  // International / inter-governmental
  "who.int": 95,
  "un.org": 94,
  "unicef.org": 90,
  "worldbank.org": 90,
  "imf.org": 90,
  "nato.int": 88,
  "ec.europa.eu": 90,
  "europarl.europa.eu": 88,
  "amnesty.org": 82,
  "hrw.org": 84,
  "icrc.org": 90,
};

// TLD patterns for fallback scoring
const GOV_PATTERN = /\.(gov|mil)(\.|\b)/i;
const EDU_PATTERN = /\.(edu|ac\.[a-z]{2})(\.|\b)/i;
const ORG_PATTERN = /\.org(\.|\b)/i;

export function getSourceCredibility(url: string): number {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");

    // Exact domain match
    if (host in DOMAIN_SCORES) return DOMAIN_SCORES[host];

    // Subdomain match (e.g. news.bbc.co.uk → bbc.co.uk)
    const parts = host.split(".");
    for (let i = 1; i < parts.length - 1; i++) {
      const parent = parts.slice(i).join(".");
      if (parent in DOMAIN_SCORES) return DOMAIN_SCORES[parent];
    }

    // Pattern-based fallback
    if (GOV_PATTERN.test(host)) return 92;
    if (EDU_PATTERN.test(host)) return 87;
    if (ORG_PATTERN.test(host)) return 68;

    // Default for unknown domains
    return 55;
  } catch {
    return 50;
  }
}
