import { AppState, Asset, Liability, AssetType, LiabilityType, MilestoneTrackingMode, Milestone, LIQUID_ASSET_TYPES } from '../types';
import { formatCurrency } from '../utils';

// ─── Types ────────────────────────────────────────────────────────────
export type IntentType =
    | 'ADD_ASSET' | 'ADD_LIABILITY' | 'DELETE_ASSET' | 'DELETE_LIABILITY'
    | 'UPDATE_ASSET' | 'QUERY_NET_WORTH' | 'QUERY_ASSETS' | 'QUERY_LIABILITIES'
    | 'QUERY_LIQUID' | 'ADD_MILESTONE' | 'SUMMARY' | 'HELP' | 'UNKNOWN';

interface ParsedIntent {
    type: IntentType;
    name?: string;
    value?: number;
    assetType?: AssetType;
    liabilityType?: LiabilityType;
    trackingMode?: MilestoneTrackingMode;
    raw: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'bot';
    text: string;
    timestamp: number;
}

// ─── Indian Number Parser ─────────────────────────────────────────────
// Supports: "5L", "5 lakhs", "10 lakh", "2 crore", "2cr", "25,00,000", "5000", "₹10L"
const parseIndianAmount = (text: string): number | null => {
    // Remove currency symbols and commas
    let cleaned = text.replace(/[₹,]/g, '').trim();

    // Pattern: number + multiplier
    const match = cleaned.match(/(\d+(?:\.\d+)?)\s*(cr(?:ore)?s?|l(?:akh)?s?|k|thousand)?/i);
    if (!match) return null;

    let num = parseFloat(match[1]);
    const unit = (match[2] || '').toLowerCase();

    if (unit.startsWith('cr')) num *= 10000000;
    else if (unit.startsWith('l') || unit === 'lac' || unit === 'lacs') num *= 100000;
    else if (unit === 'k' || unit.startsWith('thousand')) num *= 1000;

    return num > 0 ? num : null;
};

// ─── Fuzzy Asset Type Matcher ─────────────────────────────────────────
const TYPE_KEYWORDS: Record<string, AssetType> = {
    'cash': 'CASH', 'money': 'CASH',
    'savings': 'SAVINGS_ACCOUNT', 'savings account': 'SAVINGS_ACCOUNT', 'bank': 'SAVINGS_ACCOUNT',
    'mutual fund': 'MUTUAL_FUND', 'mf': 'MUTUAL_FUND', 'sip': 'MUTUAL_FUND',
    'stock': 'STOCK', 'stocks': 'STOCK', 'shares': 'STOCK', 'equity': 'STOCK',
    'real estate': 'REAL_ESTATE', 'property': 'REAL_ESTATE', 'flat': 'REAL_ESTATE', 'house': 'REAL_ESTATE', 'plot': 'REAL_ESTATE', 'land': 'REAL_ESTATE',
    'gold': 'GOLD', 'sgb': 'GOLD',
    'silver': 'SILVER',
    'fd': 'FD', 'fixed deposit': 'FD', 'rd': 'FD', 'recurring deposit': 'FD',
    'epf': 'EPF_PPF', 'ppf': 'EPF_PPF', 'pf': 'EPF_PPF', 'provident fund': 'EPF_PPF',
    'nps': 'NPS', 'pension': 'NPS',
    'insurance': 'INSURANCE', 'ulip': 'INSURANCE', 'lic': 'INSURANCE',
    'bonds': 'BONDS', 'debentures': 'BONDS',
    'crypto': 'CRYPTO', 'bitcoin': 'CRYPTO', 'btc': 'CRYPTO', 'eth': 'CRYPTO',
    'vehicle': 'VEHICLE', 'car': 'VEHICLE', 'bike': 'VEHICLE',
    'esops': 'ESOPS', 'esop': 'ESOPS', 'rsu': 'ESOPS', 'rsus': 'ESOPS', 'options': 'ESOPS',
    'lending': 'LENDING', 'lent': 'LENDING', 'given': 'LENDING', 'loan given': 'LENDING',
};

const LIABILITY_KEYWORDS: Record<string, LiabilityType> = {
    'home loan': 'HOME_LOAN', 'housing loan': 'HOME_LOAN',
    'mortgage': 'MORTGAGE',
    'car loan': 'CAR_LOAN', 'auto loan': 'CAR_LOAN',
    'vehicle loan': 'VEHICLE_LOAN', 'bike loan': 'VEHICLE_LOAN',
    'education loan': 'EDUCATION_LOAN', 'student loan': 'EDUCATION_LOAN',
    'personal loan': 'PERSONAL_LOAN',
    'business loan': 'BUSINESS_LOAN',
    'gold loan': 'GOLD_LOAN',
    'credit card': 'CREDIT_CARD', 'cc': 'CREDIT_CARD',
};

const matchAssetType = (text: string): AssetType | undefined => {
    const lower = text.toLowerCase();
    // Try longest match first
    const keys = Object.keys(TYPE_KEYWORDS).sort((a, b) => b.length - a.length);
    for (const key of keys) {
        if (lower.includes(key)) return TYPE_KEYWORDS[key];
    }
    return undefined;
};

const matchLiabilityType = (text: string): LiabilityType | undefined => {
    const lower = text.toLowerCase();
    const keys = Object.keys(LIABILITY_KEYWORDS).sort((a, b) => b.length - a.length);
    for (const key of keys) {
        if (lower.includes(key)) return LIABILITY_KEYWORDS[key];
    }
    return undefined;
};

// ─── Name Extractor ───────────────────────────────────────────────────
// Extracts a name from phrases like "Add 5L in Swiggy stocks" → "Swiggy"
// or "Add gold worth 2 lakhs called Wedding Jewellery" → "Wedding Jewellery"
const extractName = (text: string, assetType?: string): string => {
    // Check for "called X" or "named X" pattern
    const calledMatch = text.match(/(?:called|named|name)\s+["']?(.+?)["']?\s*$/i);
    if (calledMatch) return calledMatch[1].trim();

    // Check for "in X" pattern: "Add 5L in Swiggy stocks"
    const inMatch = text.match(/\bin\s+(.+?)(?:\s+(?:stock|share|fund|mf|fd|gold|silver|crypto|bond|cash|saving)s?\b)/i);
    if (inMatch) return inMatch[1].trim();

    // Check for quoted name
    const quotedMatch = text.match(/["'](.+?)["']/);
    if (quotedMatch) return quotedMatch[1].trim();

    // Check for "at/from X" pattern: "5L FD at SBI"
    const atMatch = text.match(/(?:at|from|in)\s+(.+?)$/i);
    if (atMatch) return atMatch[1].trim();

    return assetType ? `New ${assetType}` : 'New Asset';
};

// ─── Fuzzy Search ─────────────────────────────────────────────────────
const fuzzyMatch = (items: { id: string; name: string }[], query: string) => {
    const lower = query.toLowerCase();
    // Exact match first
    const exact = items.find(i => i.name.toLowerCase() === lower);
    if (exact) return exact;
    // Partial match
    return items.find(i => i.name.toLowerCase().includes(lower) || lower.includes(i.name.toLowerCase()));
};

// ─── Intent Parser ────────────────────────────────────────────────────
export const parseIntent = (message: string): ParsedIntent => {
    const msg = message.trim();
    const lower = msg.toLowerCase();

    // ── HELP ──
    if (/\b(help|what can you do|commands|how to use|guide)\b/i.test(lower)) {
        return { type: 'HELP', raw: msg };
    }

    // ── SUMMARY ──
    if (/\b(summary|overview|portfolio|dashboard|report)\b/i.test(lower)) {
        return { type: 'SUMMARY', raw: msg };
    }

    // ── QUERY NET WORTH ──
    if (/\b(net\s*worth|total\s*worth|kitna\s*hai|how\s+much\s+.*worth)\b/i.test(lower)) {
        return { type: 'QUERY_NET_WORTH', raw: msg };
    }

    // ── QUERY LIQUID ──
    if (/\b(liquid|emergency|easily\s+accessible)\b/i.test(lower)) {
        return { type: 'QUERY_LIQUID', raw: msg };
    }

    // ── QUERY ASSETS ──
    if (/\b(show|list|what|how much)\b.*\b(asset|investment|saving|holding)\b/i.test(lower) && !/\b(add|create|new|remove|delete)\b/i.test(lower)) {
        return { type: 'QUERY_ASSETS', raw: msg };
    }

    // ── QUERY LIABILITIES ──
    if (/\b(show|list|what|how much)\b.*\b(liabilit|debt|loan|owe|borrow)\b/i.test(lower) && !/\b(add|create|new|remove|delete)\b/i.test(lower)) {
        return { type: 'QUERY_LIABILITIES', raw: msg };
    }

    // ── DELETE ASSET ──
    if (/\b(delete|remove|drop)\b.*\b(asset|investment)?\b/i.test(lower) && !/\b(liabilit|loan|debt)\b/i.test(lower)) {
        // Try to extract the name after "delete/remove"
        const nameMatch = msg.match(/(?:delete|remove|drop)\s+(?:the\s+)?(?:asset\s+)?(.+)/i);
        return { type: 'DELETE_ASSET', name: nameMatch?.[1]?.trim(), raw: msg };
    }

    // ── DELETE LIABILITY ──
    if (/\b(delete|remove|drop)\b.*\b(liabilit|loan|debt)\b/i.test(lower)) {
        const nameMatch = msg.match(/(?:delete|remove|drop)\s+(?:the\s+)?(?:liability\s+|loan\s+|debt\s+)?(.+)/i);
        return { type: 'DELETE_LIABILITY', name: nameMatch?.[1]?.trim(), raw: msg };
    }

    // ── ADD MILESTONE ──
    if (/\b(goal|milestone|target)\b/i.test(lower) && /\b(add|set|create|new)\b/i.test(lower)) {
        // Parse: "Set goal buy car for 15L" or "Add milestone: Dream home 3 crore"
        const amounts = msg.match(/(\d+(?:\.\d+)?)\s*(cr(?:ore)?s?|l(?:akh)?s?|k|thousand)?/i);
        const value = amounts ? parseIndianAmount(amounts[0]) : null;
        // Extract name by removing known patterns
        let name = msg.replace(/\b(add|set|create|new|goal|milestone|target|for|of|worth|:)\b/gi, '').trim();
        if (amounts) name = name.replace(amounts[0], '').trim();
        name = name.replace(/\s+/g, ' ').trim() || 'New Goal';

        return { type: 'ADD_MILESTONE', name, value: value || undefined, raw: msg };
    }

    // ── ADD LIABILITY ──
    if (/\b(add|create|new|took)\b/i.test(lower) && /\b(liabilit|loan|debt|emi|borrow|credit\s*card)\b/i.test(lower)) {
        const amounts = msg.match(/(\d+(?:\.\d+)?)\s*(cr(?:ore)?s?|l(?:akh)?s?|k|thousand)?/i);
        const value = amounts ? parseIndianAmount(amounts[0]) : null;
        const liabType = matchLiabilityType(msg) || 'PERSONAL_LOAN';
        let name = msg.replace(/\b(add|create|new|took|loan|debt|liability|of|worth|for|:)\b/gi, '').trim();
        if (amounts) name = name.replace(amounts[0], '').trim();
        name = name.replace(/\s+/g, ' ').trim() || `New ${liabType.replace(/_/g, ' ').toLowerCase()}`;

        return { type: 'ADD_LIABILITY', name, value: value || 0, liabilityType: liabType, raw: msg };
    }

    // ── UPDATE ASSET ──
    if (/\b(update|change|set|modify|edit)\b/i.test(lower) && /\b(value|amount|price|worth)\b/i.test(lower)) {
        const amounts = msg.match(/(\d+(?:\.\d+)?)\s*(cr(?:ore)?s?|l(?:akh)?s?|k|thousand)?/i);
        const value = amounts ? parseIndianAmount(amounts[0]) : null;
        const nameMatch = msg.match(/(?:update|change|set|modify|edit)\s+(?:the\s+)?(.+?)(?:\s+(?:value|amount|price|worth|to))/i);
        return { type: 'UPDATE_ASSET', name: nameMatch?.[1]?.trim(), value: value || undefined, raw: msg };
    }

    // ── ADD ASSET (most general — last) ──
    if (/\b(add|create|new|bought|invested|have)\b/i.test(lower)) {
        const amounts = msg.match(/(\d+(?:\.\d+)?)\s*(cr(?:ore)?s?|l(?:akh)?s?|k|thousand)?/i);
        const value = amounts ? parseIndianAmount(amounts[0]) : null;
        const assetType = matchAssetType(msg) || 'OTHER';
        const name = extractName(msg, assetType);

        return { type: 'ADD_ASSET', name, value: value || 0, assetType, raw: msg };
    }

    return { type: 'UNKNOWN', raw: msg };
};

// ─── Intent Executor ──────────────────────────────────────────────────
export const executeIntent = (
    intent: ParsedIntent,
    state: AppState,
    updateState: (updates: Partial<AppState>) => void
): string => {
    switch (intent.type) {

        case 'HELP':
            return `🤖 Here's what I can do:\n\n` +
                `• **Add assets**: "Add 5 lakhs in Swiggy stocks"\n` +
                `• **Add loans**: "Add home loan of 50 lakhs"\n` +
                `• **Set goals**: "Set goal: buy car for 15L"\n` +
                `• **Check net worth**: "What's my net worth?"\n` +
                `• **View liquid assets**: "Show liquid assets"\n` +
                `• **Portfolio summary**: "Give me a summary"\n` +
                `• **Delete items**: "Remove Swiggy shares"\n` +
                `• **Update values**: "Update gold value to 2L"\n\n` +
                `💡 I understand Indian amounts: 5L, 10 lakhs, 2 crore, 25,00,000`;

        case 'QUERY_NET_WORTH': {
            const totalAssets = state.assets.reduce((a, b) => a + b.value, 0);
            const totalLiabilities = state.liabilities.reduce((a, b) => a + b.value, 0);
            const netWorth = totalAssets - totalLiabilities;
            return `💰 **Your Net Worth: ${formatCurrency(netWorth)}**\n\n` +
                `📈 Total Assets: ${formatCurrency(totalAssets)}\n` +
                `📉 Total Liabilities: ${formatCurrency(totalLiabilities)}\n` +
                `📊 ${state.assets.length} assets, ${state.liabilities.length} liabilities`;
        }

        case 'QUERY_LIQUID': {
            const liquidAssets = state.assets.filter(a => LIQUID_ASSET_TYPES.includes(a.type));
            const liquidTotal = liquidAssets.reduce((a, b) => a + b.value, 0);
            const list = liquidAssets.length > 0
                ? liquidAssets.map(a => `  • ${a.name}: ${formatCurrency(a.value)}`).join('\n')
                : '  None';
            return `💧 **Liquid Assets: ${formatCurrency(liquidTotal)}**\n\n${list}\n\n` +
                `_These are assets easily convertible to cash._`;
        }

        case 'QUERY_ASSETS': {
            if (state.assets.length === 0) return '📭 You have no assets tracked yet. Try "Add 5L in stocks"';
            const total = state.assets.reduce((a, b) => a + b.value, 0);
            const list = state.assets
                .sort((a, b) => b.value - a.value)
                .slice(0, 10)
                .map(a => `  • ${a.name} (${a.type.replace(/_/g, ' ')}): ${formatCurrency(a.value)}`)
                .join('\n');
            return `📊 **Your Assets: ${formatCurrency(total)}**\n\n${list}` +
                (state.assets.length > 10 ? `\n  _...and ${state.assets.length - 10} more_` : '');
        }

        case 'QUERY_LIABILITIES': {
            if (state.liabilities.length === 0) return '🎉 Great news! You have no liabilities!';
            const total = state.liabilities.reduce((a, b) => a + b.value, 0);
            const list = state.liabilities
                .sort((a, b) => b.value - a.value)
                .map(l => `  • ${l.name}: ${formatCurrency(l.value)}`)
                .join('\n');
            return `📉 **Your Liabilities: ${formatCurrency(total)}**\n\n${list}`;
        }

        case 'SUMMARY': {
            const totalAssets = state.assets.reduce((a, b) => a + b.value, 0);
            const totalLiabilities = state.liabilities.reduce((a, b) => a + b.value, 0);
            const netWorth = totalAssets - totalLiabilities;
            const liquidTotal = state.assets.filter(a => LIQUID_ASSET_TYPES.includes(a.type)).reduce((a, b) => a + b.value, 0);
            const topAssets = state.assets.sort((a, b) => b.value - a.value).slice(0, 3);
            const milestonesDone = state.milestones.filter(m => {
                const val = m.trackingMode === 'liquid_assets' ? liquidTotal : m.trackingMode === 'total_assets' ? totalAssets : netWorth;
                return val >= m.targetAmount;
            }).length;

            return `📋 **Portfolio Summary**\n\n` +
                `💰 Net Worth: **${formatCurrency(netWorth)}**\n` +
                `📈 Total Assets: ${formatCurrency(totalAssets)} (${state.assets.length} items)\n` +
                `📉 Liabilities: ${formatCurrency(totalLiabilities)} (${state.liabilities.length} items)\n` +
                `💧 Liquid: ${formatCurrency(liquidTotal)}\n` +
                `🏆 Milestones: ${milestonesDone}/${state.milestones.length} achieved\n\n` +
                (topAssets.length > 0 ? `**Top Assets:**\n${topAssets.map(a => `  • ${a.name}: ${formatCurrency(a.value)}`).join('\n')}` : '');
        }

        case 'ADD_ASSET': {
            const newAsset: Asset = {
                id: crypto.randomUUID(),
                name: intent.name || 'New Asset',
                value: intent.value || 0,
                type: intent.assetType || 'OTHER',
                growthRate: 0.06,
                valuationMode: 'manual',
            };
            updateState({ assets: [...state.assets, newAsset] });
            return `✅ Added asset: **${newAsset.name}**\n` +
                `  💰 Value: ${formatCurrency(newAsset.value)}\n` +
                `  📁 Type: ${newAsset.type.replace(/_/g, ' ')}\n\n` +
                `_Go to Assets & Liabilities to edit details._`;
        }

        case 'ADD_LIABILITY': {
            const newLiab: Liability = {
                id: crypto.randomUUID(),
                name: intent.name || 'New Liability',
                value: intent.value || 0,
                type: intent.liabilityType || 'PERSONAL_LOAN',
                interestRate: 0.10,
            };
            updateState({ liabilities: [...state.liabilities, newLiab] });
            return `✅ Added liability: **${newLiab.name}**\n` +
                `  📉 Amount: ${formatCurrency(newLiab.value)}\n` +
                `  📁 Type: ${newLiab.type.replace(/_/g, ' ')}\n\n` +
                `_Go to Assets & Liabilities to set interest rate and details._`;
        }

        case 'ADD_MILESTONE': {
            const newMilestone: Milestone = {
                id: crypto.randomUUID(),
                name: intent.name || 'New Goal',
                targetAmount: intent.value || 0,
                color: `hsl(${Math.random() * 360}, 70%, 50%)`,
                trackingMode: intent.trackingMode || 'net_worth',
            };
            updateState({ milestones: [...state.milestones, newMilestone] });
            return `🎯 Goal set: **${newMilestone.name}**\n` +
                `  🏁 Target: ${formatCurrency(newMilestone.targetAmount)}\n` +
                `  📊 Tracking: ${newMilestone.trackingMode.replace(/_/g, ' ')}\n\n` +
                `_You can change the tracking mode in the Milestones section._`;
        }

        case 'DELETE_ASSET': {
            if (!intent.name) return '❓ Which asset should I delete? Tell me the name.';
            const match = fuzzyMatch(state.assets, intent.name);
            if (!match) return `🔍 Couldn't find an asset matching "${intent.name}". Try the exact name.`;
            updateState({ assets: state.assets.filter(a => a.id !== match.id) });
            return `🗑️ Deleted asset: **${match.name}**`;
        }

        case 'DELETE_LIABILITY': {
            if (!intent.name) return '❓ Which liability should I delete? Tell me the name.';
            const match = fuzzyMatch(state.liabilities, intent.name);
            if (!match) return `🔍 Couldn't find a liability matching "${intent.name}". Try the exact name.`;
            updateState({ liabilities: state.liabilities.filter(l => l.id !== match.id) });
            return `🗑️ Deleted liability: **${match.name}**`;
        }

        case 'UPDATE_ASSET': {
            if (!intent.name) return '❓ Which asset should I update? Tell me the name.';
            if (!intent.value) return '❓ What should the new value be?';
            const match = fuzzyMatch(state.assets, intent.name);
            if (!match) return `🔍 Couldn't find an asset matching "${intent.name}". Try the exact name.`;
            updateState({
                assets: state.assets.map(a => a.id === match.id ? { ...a, value: intent.value! } : a)
            });
            return `✏️ Updated **${match.name}** value to ${formatCurrency(intent.value)}`;
        }

        case 'UNKNOWN':
        default:
            return `🤔 I didn't understand that. Try asking:\n\n` +
                `• "What's my net worth?"\n` +
                `• "Add 5L in stocks"\n` +
                `• "Show summary"\n` +
                `• "Help"\n\n` +
                `_Type **help** for all commands._`;
    }
};
