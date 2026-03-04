export type Language = 'en' | 'hi' | 'te';

export const LANGUAGE_OPTIONS: { code: Language; label: string; native: string }[] = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'te', label: 'Telugu', native: 'తెలుగు' },
];

type TranslationKeys = typeof en;

const en = {
    // ─── Navigation ─────────────────────────────────────────
    nav_dashboard: 'Dashboard',
    nav_assets: 'Assets & Liabilities',
    nav_history: 'Time Machine',
    app_tagline: 'Track. Sync. Grow.',

    // ─── Dashboard ──────────────────────────────────────────
    welcome: 'Welcome back 👋',
    net_worth: 'Net Worth',
    total_assets: 'Total Assets',
    total_liabilities: 'Total Liabilities',
    top_assets: 'Top Assets',
    no_assets_yet: 'No assets tracked yet.',
    add_first_asset: '+ Add your first asset',
    from_last_entry: 'from last entry',

    // ─── Assets & Liabilities ──────────────────────────────
    portfolio_manager: 'Portfolio Manager',
    assets_tab: 'Assets',
    liabilities_tab: 'Liabilities',
    name: 'Name',
    type: 'Type',
    value: 'Value (₹)',
    growth_pct: 'Growth %',
    balance: 'Balance (₹)',
    interest_pct: 'Interest %',
    add_asset: 'Add Asset',
    add_liability: 'Add Liability',
    no_assets_tracked: 'No assets tracked yet',
    start_by_adding: 'Start by adding your savings, investments, or property',
    no_liabilities_tracked: 'No liabilities tracked',
    add_loans_or_cc: 'Add loans or credit card balances',
    asset_allocation: 'Asset Allocation',
    by_category: 'By category',
    monthly_surplus: 'Monthly Surplus / SIP Investment',
    how_much_save: 'How much do you save or invest each month?',
    computed_value: 'Computed Value',

    // ─── Smart Pricing ─────────────────────────────────────
    smart_pricing: '⚡ Smart Pricing',
    manual_value: '✏️ Manual Value',
    search_link_fund: 'Search & Link Fund',
    units_held: 'Units Held',
    quantity: 'Quantity',
    price_per_share: 'Price per Share (₹)',
    weight_grams: 'Weight (grams)',
    per_gram_rate: '₹ per gram (market rate)',
    monthly_sip: 'Monthly SIP (₹)',
    sip_day: 'SIP Day',

    // ─── Tracking Details ──────────────────────────────────
    portal_url: 'Portal URL',
    username: 'Username',
    password: 'Password',
    notes: 'Notes',
    notes_placeholder_asset: 'Maturity date, folio number, nominee info, or any other notes...',
    notes_placeholder_liability: 'EMI details, tenure, prepayment plans, or any other notes...',

    // ─── Sync Manager ──────────────────────────────────────
    cloud_sync_active: 'Cloud Sync Active',
    saving: 'Saving',
    saved: 'Saved',
    error: 'Error',
    idle: 'Idle',
    disconnect: 'Disconnect',
    invite: 'Invite',
    start_new_sync: 'Start New Sync',
    join_existing: 'Join Existing',
    enter_sync_key: 'Enter Sync Key',
    join: 'Join',
    back: 'Back',
    sync_title: 'Cloud Sync',
    sync_desc: 'Sync your data across devices. Share a key with family to collaborate.',
    new_sync_desc: 'Create a new sync key for your data',
    join_sync_desc: 'Join an existing sync using a shared key',

    // ─── Milestones ──────────────────────────────────────────
    milestones_title: 'Financial Milestones',
    milestones_goals: 'goals',
    milestones_no_goals: 'No milestones set',
    milestones_set_goals: 'Set financial goals to track your progress',
    milestones_target: 'Target',
    milestones_current: 'Current',
    milestones_achieved: 'Achieved!',
    milestones_goal_name: 'Goal Name',
    milestones_target_amount: 'Target Amount (₹)',
    milestones_track_against: 'Track Against',
    milestones_add_goal: 'Add Goal',
    milestones_net_worth: 'Net Worth',
    milestones_liquid: 'Liquid Assets',
    milestones_total: 'Total Assets',
    milestones_placeholder_name: 'e.g. Dream Home, Emergency Fund',
    milestones_placeholder_amount: 'e.g. 25,00,000',

    // ─── Privacy ────────────────────────────────────────────
    privacy_title: 'Your Privacy Matters',
    privacy_message: 'We never collect or store your identity. All data is synced anonymously using only your sync key — no emails, no phone numbers, no tracking.',

    // ─── Misc ───────────────────────────────────────────────
    snapshot_toast: '📸 Today\'s net worth snapshot saved',
};

const hi: TranslationKeys = {
    // ─── Navigation ─────────────────────────────────────────
    nav_dashboard: 'डैशबोर्ड',
    nav_assets: 'संपत्ति और देनदारी',
    nav_history: 'टाइम मशीन',
    app_tagline: 'ट्रैक करें। सिंक करें। बढ़ाएं।',

    // ─── Dashboard ──────────────────────────────────────────
    welcome: 'वापसी पर स्वागत 👋',
    net_worth: 'कुल संपत्ति',
    total_assets: 'कुल एसेट्स',
    total_liabilities: 'कुल देनदारी',
    top_assets: 'मुख्य एसेट्स',
    no_assets_yet: 'अभी तक कोई एसेट ट्रैक नहीं।',
    add_first_asset: '+ पहला एसेट जोड़ें',
    from_last_entry: 'पिछली एंट्री से',

    // ─── Assets & Liabilities ──────────────────────────────
    portfolio_manager: 'पोर्टफोलियो मैनेजर',
    assets_tab: 'एसेट्स',
    liabilities_tab: 'देनदारी',
    name: 'नाम',
    type: 'प्रकार',
    value: 'मूल्य (₹)',
    growth_pct: 'वृद्धि %',
    balance: 'बकाया (₹)',
    interest_pct: 'ब्याज %',
    add_asset: 'एसेट जोड़ें',
    add_liability: 'देनदारी जोड़ें',
    no_assets_tracked: 'अभी तक कोई एसेट ट्रैक नहीं हुआ',
    start_by_adding: 'अपनी बचत, निवेश या संपत्ति जोड़ें',
    no_liabilities_tracked: 'कोई देनदारी ट्रैक नहीं हुई',
    add_loans_or_cc: 'लोन या क्रेडिट कार्ड बैलेंस जोड़ें',
    asset_allocation: 'एसेट आवंटन',
    by_category: 'श्रेणी के अनुसार',
    monthly_surplus: 'मासिक बचत / SIP निवेश',
    how_much_save: 'हर महीने कितना बचत या निवेश करते हैं?',
    computed_value: 'गणना मूल्य',

    // ─── Smart Pricing ─────────────────────────────────────
    smart_pricing: '⚡ स्मार्ट मूल्य',
    manual_value: '✏️ मैन्युअल मूल्य',
    search_link_fund: 'फंड खोजें और जोड़ें',
    units_held: 'यूनिट्स',
    quantity: 'मात्रा',
    price_per_share: 'प्रति शेयर कीमत (₹)',
    weight_grams: 'वज़न (ग्राम)',
    per_gram_rate: '₹ प्रति ग्राम (बाज़ार दर)',
    monthly_sip: 'मासिक SIP (₹)',
    sip_day: 'SIP दिन',

    // ─── Tracking Details ──────────────────────────────────
    portal_url: 'पोर्टल URL',
    username: 'यूज़रनेम',
    password: 'पासवर्ड',
    notes: 'नोट्स',
    notes_placeholder_asset: 'मेच्योरिटी तारीख, फोलियो नंबर, नॉमिनी जानकारी...',
    notes_placeholder_liability: 'EMI विवरण, अवधि, प्रीपेमेंट योजना...',

    // ─── Sync Manager ──────────────────────────────────────
    cloud_sync_active: 'क्लाउड सिंक चालू',
    saving: 'सेव हो रहा',
    saved: 'सेव हुआ',
    error: 'त्रुटि',
    idle: 'निष्क्रिय',
    disconnect: 'डिस्कनेक्ट',
    invite: 'आमंत्रण',
    start_new_sync: 'नया सिंक शुरू करें',
    join_existing: 'मौजूदा में जुड़ें',
    enter_sync_key: 'सिंक की दर्ज करें',
    join: 'जुड़ें',
    back: 'वापस',
    sync_title: 'क्लाउड सिंक',
    sync_desc: 'अपने डेटा को डिवाइस में सिंक करें। परिवार के साथ शेयर करें।',
    new_sync_desc: 'अपने डेटा के लिए नई सिंक की बनाएं',
    join_sync_desc: 'शेयर की गई key से मौजूदा सिंक में जुड़ें',

    // ─── Milestones ──────────────────────────────────────────
    milestones_title: 'आर्थिक लक्ष्य',
    milestones_goals: 'लक्ष्य',
    milestones_no_goals: 'कोई लक्ष्य नहीं',
    milestones_set_goals: 'अपनी प्रगति को ट्रैक करने के लिए लक्ष्य बनाएं',
    milestones_target: 'लक्ष्य',
    milestones_current: 'वर्तमान',
    milestones_achieved: 'हासिल!',
    milestones_goal_name: 'लक्ष्य का नाम',
    milestones_target_amount: 'लक्ष्य राशि (₹)',
    milestones_track_against: 'ट्रैक',
    milestones_add_goal: 'लक्ष्य जोड़ें',
    milestones_net_worth: 'नेट वर्थ',
    milestones_liquid: 'तरल संपत्ति',
    milestones_total: 'कुल संपत्ति',
    milestones_placeholder_name: 'उदा. ड्रीम होम, आपातकालीन फंड',
    milestones_placeholder_amount: 'उदा. 25,00,000',

    // ─── Privacy ────────────────────────────────────────────
    privacy_title: 'आपकी गोपनीयता हमारी प्राथमिकता',
    privacy_message: 'हम आपकी पहचान कभी नहीं लेते। सब डेटा सिर्फ़ सिंक key से गुमनाम रूप से सिंक होता है — न ईमेल, न फ़ोन नंबर, न ट्रैकिंग।',

    // ─── Misc ───────────────────────────────────────────────
    snapshot_toast: '📸 आज का नेट वर्थ स्नैपशॉट सेव हुआ',
};

const te: TranslationKeys = {
    // ─── Navigation ─────────────────────────────────────────
    nav_dashboard: 'డాష్‌బోర్డ్',
    nav_assets: 'ఆస్తులు & బాధ్యతలు',
    nav_history: 'టైమ్ మెషిన్',
    app_tagline: 'ట్రాక్. సింక్. పెంచు.',

    // ─── Dashboard ──────────────────────────────────────────
    welcome: 'తిరిగి స్వాగతం 👋',
    net_worth: 'నికర విలువ',
    total_assets: 'మొత్తం ఆస్తులు',
    total_liabilities: 'మొత్తం అప్పులు',
    top_assets: 'ముఖ్య ఆస్తులు',
    no_assets_yet: 'ఇంకా ఆస్తులు ట్రాక్ చేయలేదు.',
    add_first_asset: '+ మొదటి ఆస్తిని జోడించండి',
    from_last_entry: 'గత ఎంట్రీ నుండి',

    // ─── Assets & Liabilities ──────────────────────────────
    portfolio_manager: 'పోర్ట్‌ఫోలియో మేనేజర్',
    assets_tab: 'ఆస్తులు',
    liabilities_tab: 'అప్పులు',
    name: 'పేరు',
    type: 'రకం',
    value: 'విలువ (₹)',
    growth_pct: 'వృద్ధి %',
    balance: 'బాకీ (₹)',
    interest_pct: 'వడ్డీ %',
    add_asset: 'ఆస్తి జోడించండి',
    add_liability: 'అప్పు జోడించండి',
    no_assets_tracked: 'ఇంకా ఆస్తులు ట్రాక్ చేయలేదు',
    start_by_adding: 'మీ పొదుపు, పెట్టుబడులు లేదా ఆస్తిని జోడించండి',
    no_liabilities_tracked: 'అప్పులు ట్రాక్ చేయలేదు',
    add_loans_or_cc: 'లోన్‌లు లేదా క్రెడిట్ కార్డ్ బాకీలు జోడించండి',
    asset_allocation: 'ఆస్తి కేటాయింపు',
    by_category: 'వర్గం ప్రకారం',
    monthly_surplus: 'నెలవారీ మిగులు / SIP పెట్టుబడి',
    how_much_save: 'ప్రతి నెలా ఎంత ఆదా చేస్తారు?',
    computed_value: 'లెక్కించిన విలువ',

    // ─── Smart Pricing ─────────────────────────────────────
    smart_pricing: '⚡ స్మార్ట్ ధర',
    manual_value: '✏️ మాన్యువల్ విలువ',
    search_link_fund: 'ఫండ్ వెతికి జోడించండి',
    units_held: 'యూనిట్లు',
    quantity: 'పరిమాణం',
    price_per_share: 'ప్రతి షేర్ ధర (₹)',
    weight_grams: 'బరువు (గ్రాములు)',
    per_gram_rate: '₹ ప్రతి గ్రాము (మార్కెట్ రేట్)',
    monthly_sip: 'నెలవారీ SIP (₹)',
    sip_day: 'SIP రోజు',

    // ─── Tracking Details ──────────────────────────────────
    portal_url: 'పోర్టల్ URL',
    username: 'యూజర్‌నేమ్',
    password: 'పాస్‌వర్డ్',
    notes: 'నోట్స్',
    notes_placeholder_asset: 'మెచ్యూరిటీ తేదీ, ఫోలియో నంబర్, నామినీ సమాచారం...',
    notes_placeholder_liability: 'EMI వివరాలు, కాలవ్యవధి, ప్రీపేమెంట్ ప్రణాళికలు...',

    // ─── Sync Manager ──────────────────────────────────────
    cloud_sync_active: 'క్లౌడ్ సింక్ ఆన్',
    saving: 'సేవ్ అవుతోంది',
    saved: 'సేవ్ అయింది',
    error: 'లోపం',
    idle: 'నిష్క్రియ',
    disconnect: 'డిస్‌కనెక్ట్',
    invite: 'ఆహ్వానం',
    start_new_sync: 'కొత్త సింక్ ప్రారంభించండి',
    join_existing: 'ఇప్పటికే ఉన్నదాంట్లో చేరండి',
    enter_sync_key: 'సింక్ కీ ఎంటర్ చేయండి',
    join: 'చేరండి',
    back: 'వెనుకకు',
    sync_title: 'క్లౌడ్ సింక్',
    sync_desc: 'మీ డేటాను పరికరాల్లో సింక్ చేయండి. కుటుంబంతో షేర్ చేయండి.',
    new_sync_desc: 'మీ డేటా కోసం కొత్త సింక్ కీ సృష్టించండి',
    join_sync_desc: 'షేర్ చేసిన కీతో ఇప్పటికే ఉన్న సింక్‌లో చేరండి',

    // ─── Milestones ──────────────────────────────────────────
    milestones_title: 'ఆర్థిక మైలురాళ్ళు',
    milestones_goals: 'లక్ష్యాలు',
    milestones_no_goals: 'లక్ష్యాలు లేవు',
    milestones_set_goals: 'మీ పురోగతిని ట్రాక్ చేయడానికి లక్ష్యాలను సెట్ చేయండి',
    milestones_target: 'లక్ష్యం',
    milestones_current: 'ప్రస్తుతం',
    milestones_achieved: 'సాధించారు!',
    milestones_goal_name: 'లక్ష్యం పేరు',
    milestones_target_amount: 'లక్ష్య మొత్తం (₹)',
    milestones_track_against: 'ట్రాక్',
    milestones_add_goal: 'లక్ష్యం జోడించండి',
    milestones_net_worth: 'నికర విలువ',
    milestones_liquid: 'ద్రవ ఆస్తులు',
    milestones_total: 'మొత్తం ఆస్తులు',
    milestones_placeholder_name: 'ఉదా. డ్రీమ్ హోమ్, ఎమర్జెన్సీ ఫండ్',
    milestones_placeholder_amount: 'ఉదా. 25,00,000',

    // ─── Privacy ────────────────────────────────────────────
    privacy_title: 'మీ గోప్యత మాకు ముఖ్యం',
    privacy_message: 'మేము మీ గుర్తింపును ఎప్పుడూ సేకరించము. మొత్తం డేటా సింక్ కీతో అనామకంగా సింక్ అవుతుంది — ఈమెయిల్‌లు, ఫోన్ నంబర్‌లు, ట్రాకింగ్ లేవు.',

    // ─── Misc ───────────────────────────────────────────────
    snapshot_toast: '📸 ఈ రోజు నెట్ వర్త్ స్నాప్‌షాట్ సేవ్ అయింది',
};

export const translations: Record<Language, TranslationKeys> = { en, hi, te };
