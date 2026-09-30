import { MODES, currentMode, debugOn } from './state.js';
import {
  SELECTORS,
  ATTACHMENT_TYPE_CONFIG,
  AI_NOTETAKER_PATTERNS,
  DEV_NOTIFICATION_PATTERNS,
  DEBUG_HIGHLIGHT_CLASS,
  FILTER_HIDDEN_CLASS,
} from './constants.js';

/**
 * Checks if an email row is a calendar invitation.
 * @stable
 */
export function isCalendarRow(row, chromeApi = globalThis.chrome) {
  const hasIcs = Array.from(row.querySelectorAll('[alt]')).some((icon) =>
    /\.ics(?![\p{L}\p{N}_.-])/iu.test(icon.getAttribute('alt') || ''),
  );
  const hasCalendarEventIcon = !!row.querySelector(SELECTORS.calendarIcon);
  const calendarEventAltText = chromeApi?.i18n?.getMessage?.('alt_calendar_event');
  const hasLocalizedCalendarAlt =
    !!calendarEventAltText &&
    Array.from(row.querySelectorAll('[alt]')).some(
      (icon) => icon.getAttribute('alt') === calendarEventAltText,
    );
  return hasIcs || hasCalendarEventIcon || hasLocalizedCalendarAlt;
}

/**
 * Checks if an email row has Google Doc attachments.
 * @stable
 */
export function isGoogleDocAttachment(row) {
  const attachmentChips = row.querySelectorAll(SELECTORS.attachmentChip);
  for (const chip of attachmentChips) {
    const gdriveLink = chip.getAttribute('data-docurl');
    if (gdriveLink && isGoogleUrl(gdriveLink)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if an email row has any attachments.
 * @stable
 */
/**
 * Checks whether the row contains an element whose data-tooltip equals the extension-locale
 * translation of the given message key. Shared by the favourite/attachment detectors so the
 * escape-and-query logic lives in one place.
 */
function matchesLocalizedTooltip(
  row,
  messageKey,
  chromeApi,
  selectorPrefix = '',
  attribute = 'data-tooltip',
) {
  const localizedText = chromeApi?.i18n?.getMessage?.(messageKey);
  if (!localizedText) return false;
  const escapedText = localizedText.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return !!row.querySelector(`${selectorPrefix}[${attribute}="${escapedText}"]`);
}

export function hasAttachmentRow(row, chromeApi = globalThis.chrome) {
  const hasBywClass = row.classList.contains(SELECTORS.attachmentRowClass);
  const hasAttachmentTooltip = !!row.querySelector(SELECTORS.attachmentTooltip);
  const hasPaperclipIcon = !!row.querySelector(SELECTORS.attachmentIcon);

  // WHY: The static data-tooltip selector only matches English-UI Gmail. Mirror the localized-alt
  // technique used for calendar/starred detection so attachment detection also works when Gmail's
  // display language matches the browser locale.
  return (
    hasBywClass ||
    hasAttachmentTooltip ||
    matchesLocalizedTooltip(row, 'alt_has_attachment', chromeApi) ||
    // WHY: The SVG paperclip carries its label as `alt`; `title` is avoided because Gmail also
    // sets title="Has attachment" on the calendar-event icon.
    matchesLocalizedTooltip(row, 'alt_has_attachment', chromeApi, 'svg', 'alt') ||
    hasPaperclipIcon ||
    isGoogleDocAttachment(row)
  );
}

/**
 * Checks if an email row is starred/favourited.
 * @stable
 */
export function isFavouriteRow(row, chromeApi = globalThis.chrome) {
  if (row.querySelector(SELECTORS.starredIcon)) return true;
  return matchesLocalizedTooltip(row, 'alt_starred', chromeApi, 'span');
}

function isGoogleUrl(value) {
  if (!/^(?:https?:)?\/\//i.test(value)) {
    return false;
  }

  try {
    const url = new URL(value, 'https://mail.google.com');
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      (url.hostname === 'google.com' || url.hostname.endsWith('.google.com'))
    );
  } catch {
    return false;
  }
}

/**
 * Checks if an email row is from an AI service or transcription tool.
 * Matches sender name against patterns in AI_NOTETAKER_PATTERNS.
 * @experimental
 * @since 2.3.0
 * @param {HTMLElement} row - The DOM element for the email row.
 * @returns {boolean} True if sender matches any AI/notetaker pattern.
 */
export function isAiNotetakerRow(row) {
  // Try primary selector
  let senderElement = row.querySelector(SELECTORS.senderName);

  // Fallback: try to find any span with email attribute in the sender area
  if (!senderElement) {
    senderElement = row.querySelector('.yW span[email]');
  }

  // Fallback: try to find the sender name in the row's text content
  if (!senderElement) {
    const senderContainer = row.querySelector('.yW');
    if (senderContainer) {
      const textContent = senderContainer.textContent || '';
      return AI_NOTETAKER_PATTERNS.some((pattern) => pattern.test(textContent));
    }
    return false;
  }

  // Get sender name from name attribute, email attribute, or text content
  const senderName =
    senderElement.getAttribute('name') ||
    senderElement.getAttribute('email') ||
    senderElement.textContent ||
    '';

  const matches = AI_NOTETAKER_PATTERNS.some((pattern) => pattern.test(senderName));
  if (debugOn) console.log('[AI Filter Debug] Match:', matches);
  return matches;
}

/**
 * Checks if an email row is from a dev platform (GitHub, GitLab).
 * Matches sender email domain against patterns in DEV_NOTIFICATION_PATTERNS.
 * @experimental
 * @since 2.4.0
 * @param {HTMLElement} row - The DOM element for the email row.
 * @returns {boolean} True if sender matches any dev notification pattern.
 */
export function isDevNotificationRow(row) {
  // Try primary selector for sender email
  let senderElement = row.querySelector(SELECTORS.senderEmail);

  // Fallback: try to find any span with email attribute in the sender area
  if (!senderElement) {
    senderElement = row.querySelector('.yW span[email]');
  }

  if (!senderElement) {
    return false;
  }

  const email = senderElement.getAttribute('email') || '';
  // WHY: Extract domain portion to match against patterns. The @ split handles full email addresses.
  const domain = email.split('@').pop() || '';

  const matches = DEV_NOTIFICATION_PATTERNS.some((pattern) => pattern.test(domain));
  if (debugOn) console.log('[Dev Notifications Debug] Match:', matches);
  return matches;
}

/**
 * Checks if an email row contains a specific type of attachment.
 * @stable
 * @param {HTMLElement} row - The DOM element for the email row.
 * @param {string} attachmentType - The key from ATTACHMENT_TYPE_CONFIG (e.g., 'IMAGE').
 * @returns {boolean} True if a matching attachment is found, otherwise false.
 */
export function hasSpecificAttachmentType(row, attachmentType) {
  const config = ATTACHMENT_TYPE_CONFIG[attachmentType];
  if (!config) return false;

  const attachmentChips = row.querySelectorAll(SELECTORS.attachmentChip);

  for (const chip of attachmentChips) {
    // Check for standard attachments by file extension
    const title = chip.getAttribute('title') || chip.querySelector('span')?.textContent;
    if (title) {
      const parts = title.split('.');
      const extension = parts.length > 1 ? parts.pop().toLowerCase() : '';
      if (config.extensions.includes(extension)) {
        return true;
      }
    }

    // Check for Google Drive attachments by image src
    const gdriveLink = chip.getAttribute('data-docurl');
    if (gdriveLink && isGoogleUrl(gdriveLink)) {
      const img = chip.querySelector('img');
      if (img && img.src.includes(config.gdriveIdentifier)) {
        return true;
      }
    }
  }
  return false;
}

const FILTER_CONFIG = {
  [MODES.ALL]: {
    labelKey: 'btn_all',
    filterFn: () => false,
  },
  [MODES.EMAIL]: {
    labelKey: 'btn_mail',
    filterFn: (row) => isCalendarRow(row),
  },
  [MODES.CALENDAR]: {
    labelKey: 'btn_cal',
    filterFn: (row) => !isCalendarRow(row),
  },
  [MODES.ATTACH]: {
    labelKey: 'btn_attach',
    // WHY: Hide rows that lack attachments OR are calendar invites. Business logic dictates that calendar invites
    // should never appear in attachment view, even though they technically have .ics file attachments.
    filterFn: (row) => !hasAttachmentRow(row) || isCalendarRow(row),
  },
  [MODES.FAVOURITES]: {
    labelKey: 'btn_fav',
    filterFn: (row) => !isFavouriteRow(row),
  },
  [MODES.IMAGE]: {
    labelKey: 'button_filter_images',
    filterFn: (row) => !hasSpecificAttachmentType(row, MODES.IMAGE),
  },
  [MODES.PDF]: {
    labelKey: 'button_filter_pdfs',
    filterFn: (row) => !hasSpecificAttachmentType(row, MODES.PDF),
  },
  [MODES.DOCUMENT]: {
    labelKey: 'button_filter_documents',
    filterFn: (row) => !hasSpecificAttachmentType(row, MODES.DOCUMENT),
  },
  [MODES.SPREADSHEET]: {
    labelKey: 'button_filter_spreadsheets',
    filterFn: (row) => !hasSpecificAttachmentType(row, MODES.SPREADSHEET),
  },
  [MODES.PRESENTATION]: {
    labelKey: 'button_filter_presentations',
    filterFn: (row) => !hasSpecificAttachmentType(row, MODES.PRESENTATION),
  },
  [MODES.AI_NOTETAKERS]: {
    labelKey: 'btn_ai_notetakers',
    filterFn: (row) => !isAiNotetakerRow(row),
  },
  [MODES.DEV_NOTIFICATIONS]: {
    labelKey: 'btn_dev_notifications',
    filterFn: (row) => !isDevNotificationRow(row),
  },
};

export function applyFilter(doc = document) {
  const currentFilter = FILTER_CONFIG[currentMode];
  if (!currentFilter) return;

  doc.querySelectorAll(SELECTORS.emailRow).forEach((row) => {
    const hide = currentFilter.filterFn(row);

    // WHY: Debug highlighting uses a class backed by the --gcal-debug-overlay variable so the
    // overlay follows the active theme (and forced-colors mode) instead of a hardcoded light blue.
    if (debugOn) {
      row.classList.remove(FILTER_HIDDEN_CLASS);
      row.classList.toggle(DEBUG_HIGHLIGHT_CLASS, hide);
    } else {
      row.classList.remove(DEBUG_HIGHLIGHT_CLASS);
      row.classList.toggle(FILTER_HIDDEN_CLASS, hide);
    }
  });
}
