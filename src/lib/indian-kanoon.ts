const IK_API_URL = "https://api.indiankanoon.org";
const IK_TOKEN = process.env.INDIAN_KANOON_TOKEN || "";

interface IKSearchResult {
  tid: string;
  title: string;
  headline: string;
  docsource: string;
  publishdate?: string;
}

interface IKSearchResponse {
  docs: IKSearchResult[];
  found: number;
}

interface IKDocResponse {
  doc: string;
  title?: string;
}

interface IKDocMeta {
  title: string;
  publishdate: string;
  author: string;
  bench: string;
  citation: string[];
  numcitedby: number;
}

/**
 * Search Indian Kanoon for case law / statutes
 */
export async function searchCaseLaw(
  query: string,
  options?: {
    doctypes?: string; // e.g. "supremecourt", "kerala", "highcourts", "judgments"
    fromDate?: string; // DD-MM-YYYY
    toDate?: string;   // DD-MM-YYYY
    pagenum?: number;
  }
): Promise<{ results: IKSearchResult[]; totalFound: number }> {
  if (!IK_TOKEN) {
    throw new Error("Indian Kanoon API token not configured");
  }

  const params = new URLSearchParams();
  params.set("formInput", query);
  params.set("pagenum", String(options?.pagenum ?? 0));

  if (options?.doctypes) params.set("doctypes", options.doctypes);
  if (options?.fromDate) params.set("fromdate", options.fromDate);
  if (options?.toDate) params.set("todate", options.toDate);

  const res = await fetch(`${IK_API_URL}/search/?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${IK_TOKEN}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Indian Kanoon search failed: ${res.status} - ${text}`);
  }

  const data: IKSearchResponse = await res.json();
  return {
    results: data.docs || [],
    totalFound: data.found || 0,
  };
}

/**
 * Get a document fragment matching a query (cheapest — Rs 0.05/request)
 */
export async function getDocFragment(docId: string, query: string): Promise<string> {
  if (!IK_TOKEN) throw new Error("Indian Kanoon API token not configured");

  const params = new URLSearchParams();
  params.set("formInput", query);

  const res = await fetch(`${IK_API_URL}/docfragment/${docId}/?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${IK_TOKEN}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Indian Kanoon doc fragment failed: ${res.status}`);
  }

  const data = await res.json();
  return data.fragment || "";
}

/**
 * Get document metadata (cheapest — Rs 0.02/request)
 */
export async function getDocMeta(docId: string): Promise<IKDocMeta | null> {
  if (!IK_TOKEN) throw new Error("Indian Kanoon API token not configured");

  const res = await fetch(`${IK_API_URL}/docmeta/${docId}/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${IK_TOKEN}`,
    },
  });

  if (!res.ok) return null;
  return await res.json();
}

/**
 * Get full document text (Rs 0.20/request)
 */
export async function getFullDoc(docId: string): Promise<string> {
  if (!IK_TOKEN) throw new Error("Indian Kanoon API token not configured");

  const res = await fetch(`${IK_API_URL}/doc/${docId}/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${IK_TOKEN}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Indian Kanoon doc fetch failed: ${res.status}`);
  }

  const data: IKDocResponse = await res.json();
  // Strip HTML tags from the document
  return (data.doc || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Search and return enriched results with fragments for the AI context
 * This is the main function used by the chat integration
 */
export async function searchAndSummarize(
  query: string,
  maxResults: number = 5
): Promise<string> {
  if (!IK_TOKEN) return "";

  try {
    const { results, totalFound } = await searchCaseLaw(query, {
      doctypes: "judgments",
    });

    if (results.length === 0) return "";

    const topResults = results.slice(0, maxResults);

    // Fetch fragments for each result (Rs 0.05 each — cost-effective)
    const enriched = await Promise.all(
      topResults.map(async (r) => {
        let fragment = "";
        try {
          fragment = await getDocFragment(r.tid, query);
          // Strip HTML
          fragment = fragment.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        } catch {
          // Use headline as fallback
          fragment = (r.headline || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        }

        return {
          title: (r.title || "").replace(/<[^>]*>/g, ""),
          source: r.docsource || "Unknown Court",
          date: r.publishdate || "",
          fragment: fragment.substring(0, 1500),
          docId: r.tid,
        };
      })
    );

    const lines = enriched.map((r, i) => {
      return `[Case ${i + 1}]: ${r.title}\nCourt: ${r.source} | Date: ${r.date}\nExcerpt: ${r.fragment}\nRef: indiankanoon.org/doc/${r.docId}/`;
    });

    return `[INDIAN KANOON — CASE LAW SEARCH]\nQuery: "${query}" | Found: ${totalFound} results\n\n${lines.join("\n\n")}`;
  } catch (err) {
    console.error("Indian Kanoon search failed:", err);
    return "";
  }
}
