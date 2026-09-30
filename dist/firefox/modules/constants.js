/**
 * Storage key for current filter mode.
 * @stable
 */
export const KEY_MODE = 'siftMode';

/**
 * Storage key for debug mode.
 * @stable
 */
export const KEY_DEBUG = 'siftDebug';

/**
 * Storage key for button text visibility preference.
 * @stable
 */
export const SHOW_BUTTON_TEXT_KEY = 'siftShowButtonText';

/**
 * Storage key for favourites button visibility.
 * @stable
 */
export const SHOW_FAVOURITES_KEY = 'siftShowFavourites';

/**
 * Storage key for AI & Transcription button visibility.
 * @experimental
 * @since 2.3.0
 */
export const SHOW_AI_NOTETAKERS_KEY = 'siftShowAiNotetakers';

/**
 * Storage key for Dev Notifications button visibility.
 * @experimental
 * @since 2.4.0
 */
export const SHOW_DEV_NOTIFICATIONS_KEY = 'siftShowDevNotifications';

/**
 * Storage key for toolbar alignment preference.
 * @stable
 */
export const ALIGNMENT_KEY = 'siftToolbarAlignment';

/**
 * Storage key for theme preference.
 * @stable
 */
export const THEME_KEY = 'siftTheme';

/**
 * Theme options enum.
 * @stable
 */
export const THEMES = {
  SYSTEM: 'system',
  LIGHT: 'light',
  DARK: 'dark',
};

/**
 * Toolbar alignment options enum.
 * @stable
 */
export const ALIGNMENTS = {
  START: 'start',
  CENTER: 'center',
};

/**
 * Configuration for different attachment types.
 * Each key represents a filter mode.
 * - extensions: List of file extensions for standard attachments.
 * - gdriveIdentifier: String to identify Google Drive file types from the icon src.
 * - icon: Material Icon name for the filter button.
 * - labelKey: i18n message key for the button's label.
 * @stable
 */
export const ATTACHMENT_TYPE_CONFIG = {
  IMAGE: {
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
    gdriveIdentifier: 'icon_1_image',
    icon: 'image',
    labelKey: 'button_filter_images',
  },
  PDF: {
    extensions: ['pdf'],
    gdriveIdentifier: 'icon_1_pdf',
    icon: 'picture_as_pdf',
    labelKey: 'button_filter_pdfs',
  },
  DOCUMENT: {
    extensions: ['doc', 'docx', 'rtf', 'txt', 'odt'],
    gdriveIdentifier: 'icon_1_document',
    icon: 'article',
    labelKey: 'button_filter_documents',
  },
  SPREADSHEET: {
    extensions: ['xls', 'xlsx', 'csv', 'ods'],
    gdriveIdentifier: 'icon_1_spreadsheet',
    icon: 'assessment',
    labelKey: 'button_filter_spreadsheets',
  },
  PRESENTATION: {
    extensions: ['ppt', 'pptx', 'odp'],
    gdriveIdentifier: 'icon_1_presentation',
    icon: 'slideshow',
    labelKey: 'button_filter_presentations',
  },
};

/**
 * Regex patterns to match AI services and transcription tools.
 * Patterns are case-insensitive and match against sender display name.
 *
 * WHY: Product names that double as human names (Claude, Gemini, Fathom…) are anchored to the
 * whole display name (optionally with the vendor prefix / an "AI" suffix) — an unanchored
 * /claude/i would classify mail from a colleague named "Claude Dupont" as AI-notetaker mail.
 * Distinctive product names (chatgpt, otter.ai, fireflies.ai) stay as substring matches.
 * @experimental
 * @since 2.3.0
 */
export const AI_NOTETAKER_PATTERNS = [
  // 'Gemini', 'Google Gemini', 'Gemini for Google Workspace' — not 'Gemini Horoscope Daily'
  /^\s*(?:google\s+)?gemini(?:\s+(?:ai|advanced|for\s+google\s+workspace))?\s*$/i,
  /chatgpt/i, // OpenAI ChatGPT — distinctive, substring is safe
  /^\s*(?:anthropic\s+)?claude(?:\s+ai)?\s*$/i, // 'Claude', 'Anthropic Claude' — not 'Claude Dupont'
  /\bcopilot\s*$/i, // 'Copilot', 'Microsoft Copilot', 'Microsoft 365 Copilot', 'GitHub Copilot'
  /otter\.ai/i, // Otter.ai transcription service — distinctive, substring is safe
  /^\s*fathom(?:\s+(?:ai|notetaker|video))*\s*$/i, // 'Fathom', 'Fathom AI Notetaker' — not 'Fathom Analytics'
  /fireflies\.ai/i, // Fireflies.ai transcription service — distinctive, substring is safe
];

/**
 * Regex patterns to match dev platform notification email domains.
 * Patterns are case-insensitive and match against the domain portion of the sender email.
 * @experimental
 * @since 2.4.0
 */
export const DEV_NOTIFICATION_PATTERNS = [
  /(^|\.)github\.com$/i, // matches notifications@github.com, noreply@github.com
  /(^|\.)gitlab\.com$/i, // matches gitlab@mg.gitlab.com, noreply@gitlab.com
];

export const FILTER_WRAPPER_CLASS = 'gcal-filter-wrapper';

/**
 * CSS class applied to filtered-out rows while debug mode is on.
 * Styled in styles.css via the theme-aware --gcal-debug-overlay variable.
 * @stable
 */
export const DEBUG_HIGHLIGHT_CLASS = 'gcal-debug-highlight';
export const FILTER_HIDDEN_CLASS = 'gcal-filter-hidden';

/**
 * DOM selectors for Gmail elements.
 * @stable
 */
export const SELECTORS = {
  /**
   * Selector for the primary Gmail toolbar (current Gmail).
   * WHY: Gmail dropped both `role="toolbar"` and the `.G6` class from the action bar, which broke
   * every selector below it. `gh="tm"` ("toolbar, main") is Gmail's own long-lived hook, is not
   * locale-dependent, and sits inside the `.aeH` header the toolbar is injected against.
   */
  gmailToolbarMain: '.aeH [gh="tm"]',
  /**
   * Selector for the primary Gmail toolbar (older versions).
   * Targets the main action bar where buttons like "Archive", "Report spam" are located.
   */
  gmailToolbar: '.G-atb .G6[role="toolbar"]',
  /**
   * Selector for the Gmail toolbar (older versions/fallback).
   * Targets the main action bar where buttons like "Archive", "Report spam" are located.
   */
  gmailToolbarLegacy: '.G-atb[role="toolbar"]',
  /**
   * Selector for the Gmail toolbar using ARIA label (alternative fallback).
   * Targets the main action bar where buttons like "Archive", "Report spam" are located.
   */
  gmailToolbarAria: 'div[aria-label="Main toolbar"]',
  /**
   * Structural fallback selector for the Gmail toolbar: any ARIA toolbar inside the header element.
   * WHY: The aria-label fallback above only matches English-UI Gmail; this locale-independent
   * fallback keeps the extension working in the other 24 shipped locales if Gmail's class names rotate.
   */
  gmailToolbarStructural: '.aeH [role="toolbar"]',
  /**
   * Selector for the header element containing the Gmail toolbar.
   * This is typically the parent container that wraps the toolbar.
   */
  gmailToolbarHeader: '.aeH',
  /**
   * Selector for individual email rows in the Gmail message list.
   * Targets the `<tr>` elements that represent each email in the inbox.
   */
  emailRow: '.UI tr.zA',
  /**
   * Selector for the email subject line within an email row.
   * Targets the element displaying the subject of an email.
   */
  emailSubject: '.bog',
  /**
   * Selector for the main email list container.
   * This is the `div` element that holds all the email rows.
   */
  emailList: '.UI',
  /**
   * Selector for the container of all attachments in a row.
   * Note: A fallback to the second div in the parent td may be needed.
   */
  attachmentRow: 'div.brd',
  /**
   * Selector for an individual attachment "chip" within an attachment row.
   */
  attachmentChip: 'div.brc',
  /**
   * Selector for the attachment icon within an email row.
   * Targets the paperclip icon that indicates an email has an attachment.
   * WHY: Gmail replaced the `img.aSK` paperclip with an inline Material "attach_file" `<svg>`. The
   * path prefix is locale-independent; the img form is kept for older Gmail.
   */
  attachmentIcon: 'img.aSK, svg path[d^="M18 16.5H7.5c-2.21 0-4-1.79-4-4"]',
  /**
   * CSS class applied to email rows that have attachments.
   * This class is used by Gmail to style rows with attachments.
   */
  attachmentRowClass: 'byw',
  /**
   * Selector for the tooltip indicating an email has an attachment.
   * Targets elements with a `data-tooltip` attribute set to "Has attachment".
   */
  attachmentTooltip: '[data-tooltip="Has attachment"]',
  /**
   * Selector for the calendar-event icon in an email row.
   * WHY: Gmail replaced the `<img src=".../mail/images/calendar...">` icon with an inline Material
   * "event" `<svg>`. The path prefix is locale-independent; the img form is kept for older Gmail.
   */
  calendarIcon: 'img[src*="/mail/images/calendar"], svg path[d^="M19 3h-1V1h-2v2H8V1H6v2H5"]',
  starredIcon: '.T-KT-Jp, [aria-checked="true"].T-KT',
  /**
   * Selector for the custom filter bar injected by the extension.
   * This is the main container for the extension's toolbar.
   */
  filterBar: '.gcal-filter-bar',
  /**
   * Selector for the wrapper element around the custom filter bar.
   * This element helps with positioning the toolbar within Gmail's UI.
   */
  filterWrapper: `.${FILTER_WRAPPER_CLASS}`,
  /**
   * Selector for the filter buttons within the custom toolbar.
   * Targets all buttons that have a `data-mode` attribute.
   */
  filterButtons: '.gcal-filter-bar button[data-mode]',
  /**
   * Selector for the ARIA live region used for accessibility announcements.
   * This region is used to announce filter status updates to screen readers.
   */
  liveRegion: '.gcal-live-region',
  /**
   * Selector for the sender name element within an email row.
   * Targets the span containing the sender's display name.
   * @experimental - Used by AI & Transcription filter
   */
  senderName: '.yW span.zF[name]',
  /**
   * Selector for the sender email element within an email row.
   * Targets the span with an email attribute containing the sender's address.
   * @experimental - Used by Dev Notifications filter
   */
  senderEmail: '.yW span.yP[email]',
};
