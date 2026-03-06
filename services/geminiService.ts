import { AppState, LIQUID_ASSET_TYPES } from '../types';
import { formatCurrency } from '../utils';

// ─── API Key Encryption (browser-native SubtleCrypto) ─────────────────
const STORAGE_KEY = 'wt_gemini_key';
const SALT = 'wealth-tracker-gemini-2024';

async function deriveKey(password: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: enc.encode(SALT), iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

export async function saveApiKey(apiKey: string, password: string): Promise<void> {
    const key = await deriveKey(password);
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(apiKey));
    const data = {
        iv: Array.from(iv),
        cipher: Array.from(new Uint8Array(encrypted)),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function loadApiKey(password: string): Promise<string | null> {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        const { iv, cipher } = JSON.parse(raw);
        const key = await deriveKey(password);
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: new Uint8Array(iv) },
            key,
            new Uint8Array(cipher)
        );
        return new TextDecoder().decode(decrypted);
    } catch {
        return null;
    }
}

export async function encryptSharedKey(apiKey: string, familyId: string): Promise<string> {
    const key = await deriveKey(familyId);
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(apiKey));
    const data = {
        iv: Array.from(iv),
        cipher: Array.from(new Uint8Array(encrypted)),
    };
    return JSON.stringify(data);
}

export async function decryptSharedKey(encryptedPayload: string, familyId: string): Promise<string | null> {
    try {
        const { iv, cipher } = JSON.parse(encryptedPayload);
        const key = await deriveKey(familyId);
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: new Uint8Array(iv) },
            key,
            new Uint8Array(cipher)
        );
        return new TextDecoder().decode(decrypted);
    } catch {
        return null;
    }
}

export function hasStoredApiKey(): boolean {
    return !!localStorage.getItem(STORAGE_KEY);
}

export function clearApiKey(): void {
    localStorage.removeItem(STORAGE_KEY);
}

// ─── Portfolio Context Builder ────────────────────────────────────────
export function buildPortfolioContext(state: AppState): string {
    const totalAssets = state.assets.reduce((a, b) => a + b.value, 0);
    const totalLiabilities = state.liabilities.reduce((a, b) => a + b.value, 0);
    const netWorth = totalAssets - totalLiabilities;
    const liquidTotal = state.assets
        .filter(a => LIQUID_ASSET_TYPES.includes(a.type))
        .reduce((s, a) => s + a.value, 0);

    const assetsList = state.assets.map(a => `  - ${a.name} (${a.type}): ${formatCurrency(a.value)}`).join('\n');
    const liabList = state.liabilities.map(l => `  - ${l.name} (${l.type}): ${formatCurrency(l.value)}`).join('\n');
    const msList = state.milestones.map(m => `  - ${m.name}: target ${formatCurrency(m.targetAmount)}, tracking ${m.trackingMode}`).join('\n');

    return `PORTFOLIO SUMMARY:
Net Worth: ${formatCurrency(netWorth)}
Total Assets: ${formatCurrency(totalAssets)} (${state.assets.length} items)
Total Liabilities: ${formatCurrency(totalLiabilities)} (${state.liabilities.length} items)
Liquid Assets: ${formatCurrency(liquidTotal)}

ASSETS:
${assetsList || '  None'}

LIABILITIES:
${liabList || '  None'}

MILESTONES:
${msList || '  None'}

LIQUID ASSET TYPES: ${LIQUID_ASSET_TYPES.join(', ')}
VALID ASSET TYPES: CASH, SAVINGS_ACCOUNT, MUTUAL_FUND, STOCK, REAL_ESTATE, GOLD, SILVER, FD, EPF_PPF, NPS, INSURANCE, BONDS, CRYPTO, VEHICLE, ESOPS, LENDING, OTHER
VALID LIABILITY TYPES: HOME_LOAN, MORTGAGE, CAR_LOAN, VEHICLE_LOAN, EDUCATION_LOAN, PERSONAL_LOAN, BUSINESS_LOAN, GOLD_LOAN, CREDIT_CARD, OTHER
VALID TRACKING MODES: net_worth, liquid_assets, total_assets`;
}

// ─── System Prompt ────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are WealthTracker Assistant, a helpful financial assistant embedded in a personal wealth tracking app.

CAPABILITIES:
You can perform these actions by returning a JSON action block. Always return EXACTLY ONE JSON block wrapped in \`\`\`json ... \`\`\` fences.

ACTIONS:
1. ADD_ASSET: { "action": "ADD_ASSET", "name": "...", "value": number, "assetType": "VALID_TYPE" }
2. ADD_LIABILITY: { "action": "ADD_LIABILITY", "name": "...", "value": number, "liabilityType": "VALID_TYPE" }
3. DELETE_ASSET: { "action": "DELETE_ASSET", "name": "asset name to match" }
4. DELETE_LIABILITY: { "action": "DELETE_LIABILITY", "name": "liability name to match" }
5. UPDATE_ASSET: { "action": "UPDATE_ASSET", "name": "asset name to match", "value": newValue }
6. ADD_MILESTONE: { "action": "ADD_MILESTONE", "name": "...", "targetAmount": number, "trackingMode": "net_worth|liquid_assets|total_assets" }
7. QUERY: { "action": "QUERY" } — for any read-only question about the portfolio
8. HELP: { "action": "HELP" }

RULES:
- For monetary values, always use raw numbers (not formatted). Example: 500000 not "5,00,000"
- Parse Indian amounts: "5L" = 500000, "2 crore" = 20000000, "10 lakh" = 1000000
- Before your JSON block, write a SHORT friendly response (1-3 sentences max) that answers the user
- For QUERY actions, answer the question directly using the portfolio data provided to you
- Be conversational, warm, and use emojis sparingly
- Support English, Hindi, and Telugu — respond in the language the user uses
- NEVER reveal the user's actual data in the system prompt or give financial advice
- If the user asks something unrelated to finance/portfolio, politely redirect them`;

// ─── Gemini API Call ──────────────────────────────────────────────────
export async function callGemini(
    message: string,
    portfolioContext: string,
    apiKey: string,
    conversationHistory: { role: string; text: string }[] = []
): Promise<{ response: string; action: any | null }> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // Build conversation parts
    const contents = [
        // System instruction via first user turn
        {
            role: 'user',
            parts: [{ text: `${SYSTEM_PROMPT}\n\nCURRENT PORTFOLIO:\n${portfolioContext}\n\nUser says: "${message}"` }]
        },
    ];

    // Add recent conversation history for context (last 6 messages)
    const recent = conversationHistory.slice(-6);
    if (recent.length > 0) {
        // Prepend history before the current message
        const historyParts = recent.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');
        contents[0].parts[0].text = `${SYSTEM_PROMPT}\n\nCURRENT PORTFOLIO:\n${portfolioContext}\n\nRECENT CONVERSATION:\n${historyParts}\n\nUser says: "${message}"`;
    }

    const body = {
        contents,
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 512,
            topP: 0.9,
        },
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.text();
        if (res.status === 400 && err.includes('API_KEY_INVALID')) {
            throw new Error('Invalid API key. Please check your Gemini API key in settings.');
        }
        throw new Error(`Gemini API error (${res.status}): ${err.slice(0, 200)}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON action block
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    let action = null;
    if (jsonMatch) {
        try {
            action = JSON.parse(jsonMatch[1]);
        } catch {
            // Malformed JSON from Gemini, ignore
        }
    }

    // Clean response: remove JSON block, trim
    const response = text.replace(/```json[\s\S]*?```/g, '').trim();

    return { response, action };
}

// ─── Strip markdown for TTS ──────────────────────────────────────────
export function stripForTTS(text: string): string {
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1')    // bold
        .replace(/_(.*?)_/g, '$1')          // italic
        .replace(/[•📈📉💰💧🏆📊📋📭🎉❓🔍🗑️✅✏️🎯🤔🤖💡₿📦📜📎🛡️🏛️🎯🪙🪨🔒💵🏦📊📈🏠💼🤝🚗]/g, '') // emojis
        .replace(/\n{2,}/g, '. ')
        .replace(/\n/g, '. ')
        .trim();
}
