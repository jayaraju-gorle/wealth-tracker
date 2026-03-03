// MF API wrapper for mfapi.in (free, no auth, CORS-enabled)

const BASE_URL = 'https://api.mfapi.in/mf';

export interface MFSearchResult {
    schemeCode: number;
    schemeName: string;
}

export interface MFSchemeData {
    schemeName: string;
    fundHouse: string;
    schemeCode: number;
    nav: number;
    date: string;
}

// Simple in-memory cache
const navCache = new Map<number, { data: MFSchemeData; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Search mutual funds by name
 * Uses the undocumented search endpoint from mfapi.in
 */
export async function searchMutualFunds(query: string): Promise<MFSearchResult[]> {
    if (!query || query.length < 2) return [];

    try {
        const res = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        const data = await res.json();

        // API returns array of { schemeCode, schemeName }
        if (Array.isArray(data)) {
            return data.slice(0, 20).map((item: any) => ({
                schemeCode: Number(item.schemeCode),
                schemeName: String(item.schemeName),
            }));
        }
        return [];
    } catch (err) {
        console.error('[MFAPI] Search error:', err);
        return [];
    }
}

/**
 * Get latest NAV for a scheme code
 */
export async function getLatestNAV(schemeCode: number): Promise<MFSchemeData | null> {
    // Check cache
    const cached = navCache.get(schemeCode);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    try {
        const res = await fetch(`${BASE_URL}/${schemeCode}/latest`);
        if (!res.ok) throw new Error(`NAV fetch failed: ${res.status}`);
        const json = await res.json();

        if (json.status !== 'SUCCESS' || !json.data?.length) {
            // Fallback: try without /latest
            const res2 = await fetch(`${BASE_URL}/${schemeCode}`);
            if (!res2.ok) return null;
            const json2 = await res2.json();
            if (!json2.data?.length) return null;

            const latestNav = json2.data[0];
            const result: MFSchemeData = {
                schemeName: json2.meta?.scheme_name || `Scheme ${schemeCode}`,
                fundHouse: json2.meta?.fund_house || '',
                schemeCode,
                nav: parseFloat(latestNav.nav),
                date: latestNav.date,
            };
            navCache.set(schemeCode, { data: result, timestamp: Date.now() });
            return result;
        }

        const latestNav = json.data[0];
        const result: MFSchemeData = {
            schemeName: json.meta?.scheme_name || `Scheme ${schemeCode}`,
            fundHouse: json.meta?.fund_house || '',
            schemeCode,
            nav: parseFloat(latestNav.nav),
            date: latestNav.date,
        };

        navCache.set(schemeCode, { data: result, timestamp: Date.now() });
        return result;
    } catch (err) {
        console.error('[MFAPI] NAV fetch error:', err);
        return null;
    }
}
