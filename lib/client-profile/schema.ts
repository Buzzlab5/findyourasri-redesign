/**
 * The client profile form: every section and question, the rules that show or
 * hide a question, and the "team follow-ups" derived from the answers.
 *
 * Ported from the intake prototype (_src/Asri Client Profile.html), question
 * for question. Uploads sit where the prototype put them, under the answer that
 * asks for them ('file' fields); the files themselves are not answers and are
 * kept apart from them. The rail and headings carry no numbering.
 *
 * Answers are keyed by field id. A question that is hidden by its `show`
 * rule reads as empty, so a changed mind never leaves a stale answer behind.
 */

export type RefRow = { url: string; notes: string };
export type Answer = string | string[] | boolean | RefRow[];
export type Getter = (id: string) => Answer;
export type Cond = (get: Getter) => boolean;

export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'url'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checks'
  | 'refs'
  | 'consent'
  /** Brand colours: swatches picked on screen. The answer is one string, "#0C0A08, #C9A063". */
  | 'colors'
  /** An upload. Holds no answer: the files live apart, keyed by this field's id. */
  | 'file';

export type Field = {
  id: string;
  label: string;
  type: FieldType;
  req?: boolean;
  help?: string;
  ph?: string;
  opts?: readonly string[];
  show?: Cond;
  /** For 'file' fields: the category their files are filed under; 'auto' guesses from the file name. */
  category?: KitCategory | 'auto';
};

export type Section = {
  id: string;
  title: string;
  lede: string;
  note?: string;
  fields: Field[];
};

/* ---------- limits and categories for uploads ---------- */

/** Keep in step with MAX_FILE_BYTES and EXTENSIONS in supabase/functions/client-profile/index.ts. */
export const KIT_MAX_BYTES = 50 * 1024 * 1024;
export const KIT_MAX_FILES = 40;
export const KIT_EXTENSIONS = [
  'pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'tif', 'tiff', 'heic',
  'ai', 'eps', 'psd', 'indd', 'sketch', 'fig',
  'zip', 'doc', 'docx', 'ppt', 'pptx', 'key', 'pages', 'xls', 'xlsx', 'numbers', 'csv', 'txt',
  'ttf', 'otf', 'woff', 'woff2', 'mp4', 'mov',
] as const;
export const KIT_CATEGORIES = ['Logo', 'Brand guidelines', 'Photos', 'Renderings', 'Menu or price list', 'Press kit', 'Other'] as const;
export type KitCategory = (typeof KIT_CATEGORIES)[number];

/** A first guess at the category from the file name, so most files need no change. */
export function guessCategory(name: string): KitCategory {
  const n = name.toLowerCase();
  const ext = n.includes('.') ? n.split('.').pop()! : '';
  if (/logo|wordmark|monogram/.test(n)) return 'Logo';
  if (/guideline|brand[\s_-]?(book|guide|manual|kit)|style[\s_-]?guide/.test(n)) return 'Brand guidelines';
  if (/menu|rate|price|tariff/.test(n)) return 'Menu or price list';
  if (/press|media[\s_-]?kit/.test(n)) return 'Press kit';
  if (['jpg', 'jpeg', 'png', 'webp', 'heic', 'tif', 'tiff'].includes(ext)) return 'Photos';
  return 'Other';
}

/* ---------- conditions ---------- */

const is =
  (id: string, ...vals: string[]): Cond =>
  (get) => {
    const x = get(id);
    return Array.isArray(x) ? vals.some((v) => (x as string[]).includes(v)) : vals.includes(x as string);
  };

/** Answered, and not only with one of `vals`. An empty answer counts as hidden. */
const not =
  (id: string, ...vals: string[]): Cond =>
  (get) => {
    const x = get(id);
    if (x === '') return false;
    if (Array.isArray(x)) {
      const list = x as string[];
      return !(list.length === 0 || (vals.some((v) => list.includes(v)) && list.length === 1));
    }
    return !vals.includes(x as string);
  };

const filled =
  (id: string): Cond =>
  (get) => {
    const x = get(id);
    return Array.isArray(x) ? x.length > 0 : Boolean(x);
  };

const any =
  (...fs: Cond[]): Cond =>
  (get) =>
    fs.some((f) => f(get));

const YNS = ['Yes', 'No', 'Not sure'] as const;
const BUDGET = ['Under $2,000', '$2,000 to $5,000', '$5,000 to $10,000', '$10,000+', 'Prefer to discuss'] as const;
const ADSPEND = ['None', 'Under $500', '$500 to $2,000', '$2,000 to $5,000', '$5,000 to $15,000', '$15,000+'] as const;
const PLATFORMS = ['Instagram', 'TikTok', 'Facebook', 'YouTube', 'LinkedIn', 'Pinterest', 'X', 'Xiaohongshu (RED)', 'WeChat'] as const;

/* ---------- the form ---------- */

export const sections: Section[] = [
  {
    id: 'about',
    title: 'You and your business',
    lede: 'The basics, and who we should be talking to.',
    fields: [
      { id: 'biz_name', label: 'Business or brand name', type: 'text', req: true },
      { id: 'legal_name', label: 'Registered company name', type: 'text', help: "Only if it's different from the brand name. We use it on contracts and invoices." },
      { id: 'contact_name', label: 'Your name', type: 'text', req: true },
      { id: 'contact_role', label: 'Your role', type: 'text', ph: 'Owner, GM, Marketing Manager...' },
      { id: 'contact_email', label: 'Email', type: 'email', req: true },
      { id: 'contact_phone', label: 'WhatsApp or phone', type: 'tel', ph: '812 3456 7890', help: 'Pick your country code, then type the number.' },
      { id: 'country', label: 'Country', type: 'text', req: true },
      { id: 'city', label: 'City or region', type: 'text' },
      { id: 'timezone', label: 'Your time zone', type: 'text', ph: 'e.g. GMT+8, Bali' },
      { id: 'approver', label: 'Who signs off on marketing decisions?', type: 'radio', opts: ['Me', 'Someone else', 'A group (owners, partners, board)'] },
      { id: 'approver_detail', label: 'Name, role and contact of the person or people who approve', type: 'text', show: not('approver', 'Me') },
      { id: 'billing', label: 'Should invoices go to you?', type: 'radio', opts: ['Yes', 'No, someone else'] },
      { id: 'billing_detail', label: 'Billing contact name and email', type: 'text', show: is('billing', 'No, someone else') },
      { id: 'comms', label: 'How do you prefer to communicate?', type: 'checks', opts: ['WhatsApp', 'Email', 'Slack', 'Video calls'] },
      { id: 'heard', label: 'How did you hear about Asri?', type: 'text' },
    ],
  },
  {
    id: 'business',
    title: 'What you do',
    lede: "Explain it as if we've never heard of you. We'd rather hear it in your words.",
    fields: [
      { id: 'sector', label: 'Which best describes you?', type: 'radio', req: true, opts: ['Hospitality (hotel, resort, villa, restaurant, beach club)', 'Travel or experience operator', 'Events or venue', 'Premium or luxury brand', 'Destination or tourism board', 'Other'] },
      { id: 'sector_other', label: 'Tell us what kind of business', type: 'text', show: is('sector', 'Other') },
      { id: 'one_liner', label: "Describe the business in a sentence or two, the way you'd explain it to a guest", type: 'textarea', req: true },
      { id: 'stage', label: 'Where is the business today?', type: 'radio', req: true, opts: ['Pre-launch or still being built', 'Open less than a year', 'Established 1 to 5 years', 'Established 5+ years'] },
      { id: 'open_date', label: 'Expected opening or launch date', type: 'text', help: 'A rough month is fine.', show: is('stage', 'Pre-launch or still being built') },
      { id: 'locations', label: 'How many locations or properties?', type: 'radio', opts: ['One', '2 to 5', '6 or more'] },
      { id: 'location_list', label: 'List each location', type: 'textarea', show: not('locations', 'One') },
      { id: 'sub_brands', label: 'Are there separate concepts, venues or sub-brands under this business?', type: 'radio', opts: ['Yes', 'No'] },
      { id: 'sub_brand_list', label: 'List each one and how it differs', type: 'textarea', help: 'For example a downstairs nightclub and an upstairs supper show, each with its own name and Instagram.', show: is('sub_brands', 'Yes') },
      { id: 'offerings', label: 'Your main products, services or experiences', type: 'textarea' },
      { id: 'price_point', label: 'How would you describe your pricing?', type: 'radio', opts: ['Accessible', 'Mid-range', 'Premium', 'Ultra-luxury'] },
      { id: 'avg_value', label: 'Average spend per guest, booking or order', type: 'text', ph: 'Include the currency' },
      { id: 'channels', label: 'Where do your bookings or sales come from today?', type: 'checks', opts: ['Direct website', 'OTAs (Booking.com, Expedia, Airbnb)', 'Travel agents or DMCs', 'Phone, WhatsApp or DMs', 'Walk-ins', 'Retail or stockists', 'Marketplaces', 'Not open yet'] },
      { id: 'seasonality', label: 'When are your peak and quiet seasons?', type: 'textarea' },
      { id: 'usp', label: 'What makes you different from the places or brands guests compare you with?', type: 'textarea' },
    ],
  },
  {
    id: 'goals',
    title: 'Goals',
    lede: 'What you want marketing to do for the business.',
    fields: [
      { id: 'goal_list', label: 'What matters most right now?', type: 'checks', opts: ['More direct bookings or sales', 'Opening or launch buzz', 'Awareness in new markets', 'Fill the quiet season', 'Grow social following', 'Show up on Google and in AI search', 'Grow the email list', 'Reposition the brand'] },
      { id: 'goal_90', label: 'What would make the first 90 days a success?', type: 'textarea', req: true },
      { id: 'goal_12', label: 'Where do you want the business to be in 12 months?', type: 'textarea' },
      { id: 'kpis', label: 'Which numbers do you watch?', type: 'checks', opts: ['Bookings or revenue', 'Enquiries or leads', 'Website traffic', 'Follower growth', 'Engagement', 'Search rankings', 'Return on ad spend', 'Press coverage'] },
      { id: 'key_dates', label: 'Important dates in the next six months', type: 'textarea', help: 'Launches, events, peak season, renovations, menu changes, collaborations.' },
    ],
  },
  {
    id: 'production',
    title: 'Production',
    lede: "Asri is a full production house as well as a marketing agency, with directors, photographers, videographers, drone pilots and editors in-house. This section is optional, but even if a shoot isn't on your list yet, it helps us see where film and photography could do the most for you.",
    fields: [
      { id: 'prod_interest', label: "Is production something you're considering?", type: 'radio', opts: ['Yes, we have a project in mind', "Maybe, we'd like ideas", 'Not right now'] },
      { id: 'prod_type', label: 'What kind of content?', type: 'checks', opts: ['Brand film', 'Short-form social (reels, TikTok)', 'Lifestyle and editorial photography', 'Food and drink', 'Interiors and architecture', 'Product and still life', 'Drone and aerial', 'Event and activation coverage', 'Documentary or expedition film', 'Team and founder stories', 'Talent-led campaign'], show: not('prod_interest', 'Not right now') },
      { id: 'prod_feel', label: 'What should the content make people feel, or do?', type: 'textarea', show: not('prod_interest', 'Not right now') },
      { id: 'prod_story', label: "Is there a story, moment or experience you've always wanted captured?", type: 'textarea', help: 'The sunrise from a particular deck, the kitchen at full service, the moment guests step off the boat.', show: not('prod_interest', 'Not right now') },
      { id: 'prod_refs', label: 'Films, photographers or campaigns whose look you love', type: 'textarea', help: 'Links are perfect. Tell us what you like about each.', show: not('prod_interest', 'Not right now') },
      { id: 'prod_use', label: 'Where will the content live?', type: 'checks', opts: ['Website', 'Social', 'Paid ads', 'OTA and booking listings', 'Press kit', 'Sales decks for agents and partners', 'Print', 'TV, cinema or in-flight'], show: not('prod_interest', 'Not right now') },
      { id: 'prod_formats', label: 'Formats you need', type: 'checks', opts: ['Landscape 16:9', 'Vertical 9:16', 'Square or 4:5 for feeds', 'High-res stills for print', 'Not sure'], show: not('prod_interest', 'Not right now') },
      { id: 'prod_deliverables', label: "Rough deliverables you're imagining", type: 'textarea', ph: 'e.g. one 60-second brand film, 15 reels, 80 edited photos', show: is('prod_interest', 'Yes, we have a project in mind') },
      { id: 'prod_people', label: 'Who should appear on camera?', type: 'checks', opts: ['Owners or founders', 'Staff', 'Real guests (with consent)', 'Models or talent we cast', 'Creators', 'No people'], show: not('prod_interest', 'Not right now') },
      { id: 'prod_extras', label: 'Will you need any of these?', type: 'checks', opts: ['Voiceover', 'Subtitles', 'Multiple language versions', 'Music licensed for paid ads', 'Raw footage handed over'], show: not('prod_interest', 'Not right now') },
      { id: 'prod_when', label: 'When would the shoot ideally happen?', type: 'text', help: "Think about season, light and how full you'll be.", show: not('prod_interest', 'Not right now') },
      { id: 'prod_where', label: 'Where would we shoot?', type: 'text', ph: "One location, several, or somewhere we'd travel to", show: not('prod_interest', 'Not right now') },
      { id: 'prod_logistics', label: 'What should we know for shoot days?', type: 'textarea', help: 'Can we film while open, closed areas, guest privacy, drone or filming permits, crew accommodation, weather windows.', show: not('prod_interest', 'Not right now') },
      { id: 'prod_past', label: 'Have you done a professional shoot before?', type: 'radio', opts: ['Yes', 'No'], show: not('prod_interest', 'Not right now') },
      { id: 'prod_past_detail', label: 'What did you like, or not like, about how it went?', type: 'textarea', show: is('prod_past', 'Yes') },
      { id: 'prod_budget', label: 'Production budget for this project (USD)', type: 'radio', opts: ['Under $5,000', '$5,000 to $15,000', '$15,000 to $50,000', '$50,000+', 'We need a quote first'], show: not('prod_interest', 'Not right now') },
    ],
  },
  {
    id: 'audience',
    title: 'Your guests and customers',
    lede: 'Who you serve now, and who you want more of.',
    fields: [
      { id: 'audience_desc', label: 'Describe your ideal guest or customer', type: 'textarea', req: true, help: 'What they do, what they value, how they travel or shop, why they choose you.' },
      { id: 'source_markets', label: 'Where do most customers come from today?', type: 'text', ph: 'Countries or cities' },
      { id: 'target_markets', label: 'New markets you want to reach', type: 'text' },
      { id: 'ages', label: 'Main age groups', type: 'checks', opts: ['Under 25', '25 to 34', '35 to 44', '45 to 54', '55+'] },
      { id: 'guest_type', label: 'Who are they?', type: 'checks', opts: ['Couples', 'Families', 'Groups of friends', 'Solo travellers', 'Corporate or MICE', 'Weddings and celebrations', 'Locals and residents', 'Remote workers'] },
      { id: 'languages', label: 'Languages your customers speak, or you want content in', type: 'text' },
      { id: 'not_for', label: "Is there anyone you don't want to attract?", type: 'textarea' },
    ],
  },
  {
    id: 'competitors',
    title: 'Competitors and inspiration',
    lede: 'This tells us more about your taste than almost anything else.',
    fields: [
      { id: 'competitors', label: 'Three to five direct competitors', type: 'textarea', help: 'Name plus website or Instagram, one per line.' },
      { id: 'admired', label: 'Brands or accounts you admire, and why', type: 'textarea', help: "They don't need to be in your industry." },
      { id: 'not_like', label: "Anything you definitely don't want to look or sound like", type: 'textarea' },
    ],
  },
  {
    id: 'brand',
    title: 'Brand identity',
    lede: 'Upload or link everything you have. Unfinished is fine, just tell us.',
    fields: [
      { id: 'has_guidelines', label: 'Do you have brand guidelines?', type: 'radio', opts: ['Yes', 'In progress', 'No'] },
      { id: 'guidelines_file', label: 'Upload your brand guidelines', type: 'file', category: 'Brand guidelines', show: is('has_guidelines', 'Yes') },
      { id: 'guidelines_link', label: 'Or paste a link to them', type: 'url', show: is('has_guidelines', 'Yes') },
      { id: 'has_logo', label: 'Is your logo finished?', type: 'radio', opts: ['Yes', 'Being designed', 'No'] },
      { id: 'logo_files', label: 'Upload all logo files', type: 'file', category: 'Logo', help: 'Vector files (AI, EPS, SVG or PDF) and transparent PNGs. Every version: primary, secondary, icon, light and dark. Include sub-brand logos too.', show: is('has_logo', 'Yes') },
      { id: 'logo_link', label: 'Or a link to a folder with your logos', type: 'url', show: is('has_logo', 'Yes') },
      { id: 'colors', label: 'Brand colours', type: 'colors', help: 'Pick each colour, or type its HEX code if you have it.' },
      { id: 'fonts', label: 'Brand fonts', type: 'text' },
      { id: 'tone', label: 'How should the brand feel?', type: 'checks', opts: ['Refined', 'Warm and personal', 'Playful', 'Adventurous', 'Bold', 'Minimal', 'Romantic', 'Witty', 'Earthy', 'Exclusive'] },
      { id: 'three_words', label: "Three words you'd want a guest to use about you", type: 'text' },
      { id: 'tagline', label: 'Tagline or slogan, if you have one', type: 'text' },
      { id: 'story', label: 'Your story', type: 'textarea', help: 'Who started it, why, and what it stands for.' },
      { id: 'avoid', label: 'Words, topics or imagery to avoid', type: 'textarea' },
      { id: 'compliance', label: 'Any legal or platform restrictions we should know about?', type: 'textarea', help: 'Alcohol or gambling advertising rules, health claims, parent company or franchise approvals, licensing conditions.' },
    ],
  },
  {
    id: 'assets',
    title: 'Photography, video and content',
    lede: "What we can work with from day one, and what we'd need to create.",
    fields: [
      { id: 'has_photo', label: 'Do you have professional brand photography?', type: 'radio', opts: ['Yes, a good library', 'Some, but limited or dated', 'No'] },
      { id: 'photo_link', label: 'Link to your photo library', type: 'url', help: 'Google Drive, Dropbox, WeTransfer or similar.', show: not('has_photo', 'No') },
      { id: 'photo_upload', label: 'Or upload your best images', type: 'file', category: 'Photos', show: not('has_photo', 'No') },
      { id: 'photo_rights', label: 'Do you own full usage rights to these photos, including for paid ads?', type: 'radio', opts: ['Yes', 'Only some', 'Not sure'], show: not('has_photo', 'No') },
      { id: 'photo_credit', label: 'Photographer credits we need to include', type: 'text', show: not('has_photo', 'No') },
      { id: 'has_video', label: 'Do you have video footage?', type: 'radio', opts: ['Yes', 'No'] },
      { id: 'video_link', label: 'Link to your footage', type: 'url', help: 'Google Drive, Dropbox, WeTransfer or similar. Video is usually too big to upload here.', show: is('has_video', 'Yes') },
      { id: 'renders', label: 'Do you have renderings, mood boards or architectural visuals?', type: 'radio', opts: ['Yes', 'No'], show: is('stage', 'Pre-launch or still being built') },
      { id: 'renders_upload', label: 'Upload them', type: 'file', category: 'Renderings', show: is('renders', 'Yes') },
      { id: 'other_assets', label: 'Which of these do you have?', type: 'checks', opts: ['Menus', 'Rate cards or price lists', 'Brochures or sales decks', 'Press kit', 'Floor plans', 'Product catalogue', 'Event calendar'] },
      { id: 'other_upload', label: 'Upload them here', type: 'file', category: 'auto', show: filled('other_assets') },
      { id: 'press', label: 'Press coverage, awards or notable partnerships', type: 'textarea' },
      { id: 'ugc', label: 'Do guests post about you?', type: 'radio', opts: ['Often', 'Sometimes', 'Rarely'] },
    ],
  },
  {
    id: 'website',
    title: 'Website',
    lede: 'Whether you have one or not, this shapes a lot of what we do.',
    fields: [
      { id: 'has_site', label: 'Do you have a website?', type: 'radio', req: true, opts: ['Yes', 'Not yet, but planned', 'No'] },
      { id: 'site_url', label: 'Website address', type: 'url', req: true, ph: 'https://', show: is('has_site', 'Yes') },
      { id: 'site_platform', label: 'What is it built on?', type: 'select', opts: ['WordPress', 'Shopify', 'Webflow', 'Wix', 'Squarespace', 'Custom build', 'Not sure'], show: is('has_site', 'Yes') },
      { id: 'site_manager', label: 'Who manages it today?', type: 'radio', opts: ['Our team', 'A developer or agency', 'No one really', 'Not sure'], show: is('has_site', 'Yes') },
      { id: 'site_manager_detail', label: 'Their name and contact', type: 'text', help: 'We may need to coordinate access or changes with them.', show: is('site_manager', 'A developer or agency') },
      { id: 'site_feel', label: 'How do you feel about the current site?', type: 'radio', opts: ['Happy with it', 'Needs improvements', 'Want a full rebuild'], show: is('has_site', 'Yes') },
      { id: 'site_issues', label: "What's not working on it?", type: 'textarea', show: is('site_feel', 'Needs improvements', 'Want a full rebuild') },
      { id: 'domain_owned', label: 'Do you own a domain name?', type: 'radio', opts: YNS },
      { id: 'domain_name', label: 'Domain name', type: 'text', ph: 'yourbrand.com', show: is('domain_owned', 'Yes') },
      { id: 'domain_registrar', label: 'Where is it registered?', type: 'text', ph: 'GoDaddy, Namecheap, Cloudflare...', show: is('domain_owned', 'Yes') },
      { id: 'domain_account', label: 'Is the domain in an account you control?', type: 'radio', opts: ['Yes', 'No, a developer or previous agency holds it', 'Not sure'], show: is('domain_owned', 'Yes') },
      { id: 'refs', label: 'Three to five websites you love, and why', type: 'refs', help: 'Tell us what you like or dislike about each: the look, how easy it is to book or buy, the pages, the feel.', show: any(not('has_site', 'Yes'), is('site_feel', 'Needs improvements', 'Want a full rebuild')) },
      { id: 'site_pages', label: 'Pages or features you think you need', type: 'textarea', help: 'Booking, menus, events calendar, gallery, shop, journal, multiple languages...', show: any(not('has_site', 'Yes'), is('site_feel', 'Want a full rebuild')) },
    ],
  },
  {
    id: 'social',
    title: 'Social media and listings',
    lede: 'Where people find you today.',
    fields: [
      { id: 'platforms', label: 'Which platforms are you on?', type: 'checks', opts: [...PLATFORMS, 'None yet'] },
      ...PLATFORMS.map((p): Field => ({ id: `url_${p.replace(/\W/g, '')}`, label: `${p} link`, type: 'url', show: is('platforms', p) })),
      { id: 'social_manager', label: 'Who runs your social media today?', type: 'radio', opts: ['Owner or staff', 'A freelancer', 'An agency', 'No one'], show: not('platforms', 'None yet') },
      { id: 'post_freq', label: 'How often do you post?', type: 'radio', opts: ['Daily', 'A few times a week', 'Weekly', 'Rarely'], show: not('platforms', 'None yet') },
      { id: 'social_keep', label: 'Anything we should keep doing, or stop doing, on social?', type: 'textarea', show: not('platforms', 'None yet') },
      { id: 'gbp', label: 'Do you have a Google Business Profile?', type: 'radio', opts: YNS, help: 'The listing that shows on Google Maps and in search.' },
      { id: 'gbp_link', label: 'Link to your Google listing', type: 'url', show: is('gbp', 'Yes') },
      { id: 'listings', label: 'Where else are you listed?', type: 'checks', opts: ['TripAdvisor', 'Booking.com', 'Expedia', 'Airbnb', 'OpenTable, SevenRooms or Resy', 'Yelp', 'Guides (Michelin, Condé Nast, Tatler)', 'None'] },
      { id: 'listing_links', label: 'Links to those listings', type: 'textarea', show: not('listings', 'None') },
      { id: 'reviews', label: 'Your rating and roughly how many reviews on your main platform', type: 'text' },
    ],
  },
  {
    id: 'tracking',
    title: 'Analytics, ads and tools',
    lede: "Answer what you can. If you're not sure, say so and we'll check.",
    note: "Please don't put passwords in this form. We'll request access through each platform's own invite system once we start.",
    fields: [
      { id: 'ga4', label: 'Google Analytics 4 (GA4)', type: 'radio', opts: YNS },
      { id: 'ga4_id', label: 'GA4 measurement ID, if you know it', type: 'text', ph: 'G-XXXXXXX', show: is('ga4', 'Yes') },
      { id: 'gsc', label: 'Google Search Console', type: 'radio', opts: YNS },
      { id: 'gtm', label: 'Google Tag Manager', type: 'radio', opts: YNS },
      { id: 'gtm_id', label: 'Tag Manager container ID, if you know it', type: 'text', ph: 'GTM-XXXXXX', show: is('gtm', 'Yes') },
      { id: 'meta_bm', label: 'Meta Business Suite (Business Manager)', type: 'radio', opts: YNS },
      { id: 'meta_pixel', label: 'Meta Pixel on your website', type: 'radio', opts: YNS },
      { id: 'google_ads', label: 'Google Ads account', type: 'radio', opts: YNS },
      { id: 'tiktok_ads', label: 'TikTok Ads account', type: 'radio', opts: YNS },
      { id: 'acct_owner', label: 'Who owns these accounts?', type: 'radio', opts: ['We do', 'A previous agency or developer', 'A mix', 'Not sure'], help: "Accounts should always belong to you. If someone else set them up, we'll help move them over." },
      { id: 'email_platform', label: 'Email marketing platform', type: 'select', opts: ['None', 'Mailchimp', 'Klaviyo', 'Brevo', 'HubSpot', 'Other'] },
      { id: 'email_list', label: 'Roughly how many subscribers?', type: 'text', show: not('email_platform', 'None') },
      { id: 'booking_system', label: 'Booking engine, reservations or ecommerce system', type: 'text', ph: 'SiteMinder, Cloudbeds, SevenRooms, Shopify...' },
      { id: 'crm', label: 'CRM, PMS or POS', type: 'text' },
      { id: 'other_tools', label: 'Any other tools we should know about', type: 'textarea', ph: 'Canva, Later, Linktree, review software...' },
    ],
  },
  {
    id: 'history',
    title: 'Marketing so far',
    lede: "What's been tried tells us where to start.",
    fields: [
      { id: 'marketed', label: 'Have you done marketing before?', type: 'radio', req: true, opts: ['Yes, with an agency', 'Yes, in-house or with freelancers', 'A little, nothing structured', 'No, this is our first time'] },
      { id: 'history_what', label: 'What have you done?', type: 'checks', opts: ['Social media', 'Paid ads', 'SEO', 'Email', 'Influencers or creators', 'PR', 'Photo or video shoots', 'Events or activations', 'Print or outdoor'], show: not('marketed', 'No, this is our first time') },
      { id: 'prev_agency', label: 'Which agency, and why did you move on?', type: 'textarea', show: is('marketed', 'Yes, with an agency') },
      { id: 'worked', label: 'What worked well?', type: 'textarea', show: not('marketed', 'No, this is our first time') },
      { id: 'didnt_work', label: "What didn't work?", type: 'textarea', show: not('marketed', 'No, this is our first time') },
      { id: 'ad_spend_now', label: 'Current monthly ad spend', type: 'select', opts: ADSPEND },
      { id: 'results', label: 'Any numbers you can share', type: 'textarea', help: 'Bookings from Instagram, your best campaign, cost per booking, website visitors a month.', show: not('marketed', 'No, this is our first time') },
    ],
  },
  {
    id: 'services',
    title: "What you'd like from Asri",
    lede: "Pick everything you're interested in. We'll recommend where to start.",
    fields: [
      { id: 'services', label: 'Services', type: 'checks', req: true, opts: ['Social media management', 'Website build', 'Website management and SEO', 'AI search visibility (ChatGPT, Gemini, Perplexity)', 'Paid ads (Meta, Google, TikTok)', 'Photo and video production', 'Creator and influencer campaigns', 'Brand activations and events', 'Email marketing', 'Brand strategy or identity', 'Not sure yet, advise us'] },
      { id: 'priority', label: 'If you could only start with one, which would it be?', type: 'text' },
      { id: 'ads_platforms', label: 'Which ad platforms?', type: 'checks', opts: ['Meta', 'Google Search', 'Google Hotel ads or Performance Max', 'TikTok', 'YouTube', 'LinkedIn', 'Not sure'], show: is('services', 'Paid ads (Meta, Google, TikTok)') },
      { id: 'creator_past', label: 'Have you worked with creators before?', type: 'radio', opts: ['Yes', 'No'], show: is('services', 'Creator and influencer campaigns') },
      { id: 'creator_host', label: 'Can you host creators (stays, meals, experiences) as part of a campaign?', type: 'radio', opts: ['Yes', 'Maybe', 'No'], show: is('services', 'Creator and influencer campaigns') },
      { id: 'event_desc', label: 'Tell us about the activation or event you have in mind', type: 'textarea', show: is('services', 'Brand activations and events') },
      { id: 'budget', label: 'Monthly budget for agency services, not including ad spend (USD)', type: 'radio', opts: BUDGET },
      { id: 'ad_budget', label: 'Planned monthly ad spend (USD)', type: 'select', opts: ADSPEND },
      { id: 'start', label: 'When would you like to start?', type: 'text' },
    ],
  },
  {
    id: 'working',
    title: 'Working together',
    lede: 'So we set the rhythm right from the start.',
    fields: [
      { id: 'approvals', label: 'How would you like to approve content?', type: 'radio', opts: ['Approve a monthly content plan, then trust us to run it', 'Sign off on campaigns and launches only'], help: 'Day-to-day posts run from the approved plan, so content stays consistent and on time.' },
      { id: 'turnaround', label: 'How quickly can you usually give feedback?', type: 'radio', opts: ['Same day', 'Within 1 to 2 days', 'Within a week'] },
      { id: 'reporting', label: 'How often would you like a results report?', type: 'radio', opts: ['Monthly', 'Quarterly'] },
      { id: 'report_to', label: 'Who should receive reports?', type: 'text', ph: 'Names and emails' },
      { id: 'meetings', label: 'How often would you like to meet?', type: 'radio', opts: ['Monthly', 'Quarterly', 'Only when needed'] },
      { id: 'off_limits', label: 'Anything off limits, sensitive, or that has gone wrong with an agency before?', type: 'textarea' },
      { id: 'anything_else', label: 'Anything else we should know?', type: 'textarea' },
      { id: 'consent', label: 'I confirm we have the right to share the materials provided, and Asri may use them to deliver our marketing.', type: 'consent', req: true },
    ],
  },
];

export const fields: Record<string, Field> = Object.fromEntries(sections.flatMap((s) => s.fields.map((f) => [f.id, f])));

/* ---------- reading answers ---------- */

export const emptyFor = (f: Field): Answer => (f.type === 'checks' || f.type === 'refs' ? [] : f.type === 'consent' ? false : '');

export function hasValue(x: Answer): boolean {
  if (Array.isArray(x)) return (x as unknown[]).some((r) => (typeof r === 'string' ? r : r && ((r as RefRow).url || (r as RefRow).notes)));
  return x === true || (typeof x === 'string' && x.trim() !== '');
}

/** A getter over raw answers that applies the show rules: hidden questions read as empty. */
export function makeGetter(answers: Record<string, Answer>): Getter {
  const get: Getter = (id) => {
    const f = fields[id];
    if (!f) return '';
    if (f.show && !f.show(get)) return emptyFor(f);
    const x = answers[id];
    return x === undefined ? emptyFor(f) : x;
  };
  return get;
}

export const isVisible = (f: Field, get: Getter) => !f.show || f.show(get);

/** Everything the client should be sent: visible questions with an answer, nothing else. */
export function collectAnswers(get: Getter): Record<string, Answer> {
  const out: Record<string, Answer> = {};
  for (const s of sections) {
    for (const f of s.fields) {
      if (!isVisible(f, get)) continue;
      const x = get(f.id);
      if (hasValue(x)) out[f.id] = f.type === 'refs' ? (x as RefRow[]).filter((r) => r.url || r.notes) : x;
    }
  }
  return out;
}

/* ---------- follow-ups for the team ---------- */

export type FollowUp = { kind: 'setup' | 'check' | 'note'; text: string };

/**
 * What the team should do next, read off the answers. Stored with the profile
 * and never shown to the client: it is written for us.
 */
export function followUps(get: Getter, kitFiles: number): FollowUp[] {
  const out: FollowUp[] = [];
  const add = (kind: FollowUp['kind'], text: string) => out.push({ kind, text });
  const v = (id: string) => get(id);
  const inc = (id: string, val: string) => {
    const x = get(id);
    return Array.isArray(x) ? (x as string[]).includes(val) : x === val;
  };

  if (inc('stage', 'Pre-launch or still being built')) add('note', `Pre-launch. Target opening: ${v('open_date') || 'not given'}. Plan coming-soon content and expect the date to move.`);
  if (inc('sub_brands', 'Yes')) add('check', 'Several concepts under one business. Agree the account structure and how content is split before posting.');
  if (v('has_site') && v('has_site') !== 'Yes') add('setup', 'No website yet. Use their reference sites to brief the build.');
  if (v('domain_owned') && v('domain_owned') !== 'Yes') add('setup', "No confirmed domain. Register one in the client's own name.");
  if (inc('domain_account', 'No, a developer or previous agency holds it') || inc('domain_account', 'Not sure')) add('check', "Domain may sit in someone else's account. Get it moved into the client's control.");
  if (inc('site_manager', 'No one really') || inc('site_manager', 'Not sure')) add('check', 'Nobody clearly owns the website. Confirm admin access.');
  if (v('has_guidelines') && v('has_guidelines') !== 'Yes') add('setup', 'No finished brand guidelines. Put together a one-page brand sheet before producing content.');
  if (v('has_logo') && v('has_logo') !== 'Yes') add('setup', 'Logo not final. Confirm what we can use in the meantime.');
  if (kitFiles === 0 && !['guidelines_link', 'logo_link', 'photo_link', 'video_link'].some((id) => hasValue(v(id)))) add('check', 'No brand files or links received. Ask for logos and any guidelines before design work starts.');
  if (inc('has_photo', 'No')) add('setup', 'No brand photography. Quote a shoot and use licensed stock until then.');
  if (inc('has_photo', 'Some, but limited or dated')) add('note', 'Photo library is thin or dated. Plan a shoot early.');
  if (inc('photo_rights', 'Only some') || inc('photo_rights', 'Not sure')) add('check', 'Photo usage rights unclear. Confirm licensing before using images in paid ads.');
  if (inc('gbp', 'No')) add('setup', 'No Google Business Profile. Create and verify one.');
  if (inc('gbp', 'Not sure')) add('check', 'Check whether a Google Business Profile exists and who controls it.');
  ([['ga4', 'GA4'], ['gsc', 'Search Console'], ['gtm', 'Tag Manager'], ['meta_bm', 'Meta Business Suite'], ['meta_pixel', 'Meta Pixel']] as const).forEach(([id, name]) => {
    if (inc(id, 'No')) add('setup', `${name} not set up.`);
    else if (inc(id, 'Not sure')) add('check', `${name}: client unsure whether it exists.`);
  });
  if (inc('acct_owner', 'A previous agency or developer') || inc('acct_owner', 'A mix') || inc('acct_owner', 'Not sure')) add('check', "Account ownership unclear. Move analytics and ad accounts into the client's name.");
  if (hasValue(v('compliance'))) add('check', 'Client flagged legal or platform restrictions. Read them before writing any ad copy.');
  if (inc('services', 'Not sure yet, advise us')) add('note', 'Client wants a recommendation on services. Prepare a proposal.');
  const services = v('services') as string[];
  if (inc('budget', 'Under $2,000') && services.length > 2) add('check', `Budget under $2,000 a month with ${services.length} services requested. Set scope expectations early.`);
  if (inc('prod_interest', 'Yes, we have a project in mind')) add('note', 'Production project in mind. Brief the director and prepare a treatment and quote.');
  if (inc('prod_interest', "Maybe, we'd like ideas")) add('note', 'Open to production. Bring a shoot concept to the first strategy call.');
  if (inc('prod_people', 'Real guests (with consent)')) add('check', 'Guests on camera. Prepare release forms before the shoot.');
  if (inc('turnaround', 'Within a week')) add('note', 'Feedback can take a week. Plan content further ahead.');
  return out;
}

/* ---------- plain text copy of the answers ---------- */

export function formatAnswer(f: Field, x: Answer): string {
  if (f.type === 'refs') return (x as RefRow[]).filter((r) => r.url || r.notes).map((r) => (r.url || '(no link)') + (r.notes ? `: ${r.notes}` : '')).join('\n');
  if (f.type === 'consent') return x ? 'Confirmed' : '';
  if (Array.isArray(x)) return (x as string[]).join(', ');
  return String(x).trim();
}

/** The answers as plain text, for the "copy my answers" button when sending fails or after it succeeds. */
export function answersAsText(get: Getter, kit: { name: string; category: string; field: string }[]): string {
  const lines: string[] = [`Client profile: ${get('biz_name') as string}`, ''];
  for (const s of sections) {
    const rows = s.fields.filter((f) => isVisible(f, get) && hasValue(get(f.id)));
    const sectionFiles = kit.filter((k) => s.fields.some((f) => f.id === k.field));
    if (!rows.length && !sectionFiles.length) continue;
    lines.push(s.title.toUpperCase());
    rows.forEach((f) => {
      const t = formatAnswer(f, get(f.id));
      lines.push(t.includes('\n') ? `${f.label}:\n${t}` : `${f.label}: ${t}`);
    });
    if (sectionFiles.length) lines.push(`Files sent: ${sectionFiles.map((k) => `${k.name} (${k.category})`).join(', ')}`);
    lines.push('');
  }
  return lines.join('\n');
}
