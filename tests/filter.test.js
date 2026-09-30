import { describe, beforeEach, test, expect } from '@jest/globals';
import {
  applyFilter,
  isCalendarRow,
  hasAttachmentRow,
  isFavouriteRow,
  hasSpecificAttachmentType,
  isGoogleDocAttachment,
  isAiNotetakerRow,
  isDevNotificationRow,
} from '../src/modules/filter.js';
import {
  MODES,
  setCurrentMode,
  setDebugOn,
  setShowFavouritesButton,
  setToolbarAlignment,
  setThemePreference,
} from '../src/modules/state.js';
import { makeEmailRow, makeMailDocument } from './factories/index.js';

const { useChromeMock } = global;

beforeEach(() => {
  useChromeMock({
    i18n: {
      getMessage: (key, substitutions) => {
        if (key === 'label_toolbar') return 'Calendar filter';
        if (key === 'label_options') return 'Calendar options:';
        if (key === 'filter_status_update') return `Filter set to ${substitutions?.[0] ?? ''}`;
        if (key === 'btn_all') return 'Everything';
        if (key === 'btn_mail') return 'Emails';
        if (key === 'btn_cal') return 'Calendar';
        if (key === 'btn_attach') return 'Attachments';
        if (key === 'btn_fav') return 'Favourites';
        if (key === 'alt_starred') return 'Starred';
        if (key === 'button_filter_images') return 'Images Only';
        if (key === 'button_filter_pdfs') return 'PDFs Only';
        if (key === 'button_filter_documents') return 'Documents Only';
        if (key === 'button_filter_spreadsheets') return 'Spreadsheets Only';
        if (key === 'button_filter_presentations') return 'Presentations Only';
        if (key === 'alt_calendar_event') return 'Calendar event';
        return key;
      },
    },
  });
});

const prepareDocument = (config) => {
  const doc = makeMailDocument();
  const { row } = makeEmailRow(config, doc);
  global.document = doc;
  return { document: doc, row };
};

const expectFiltered = (row, filtered) => {
  expect(row.classList.contains('gcal-filter-hidden')).toBe(filtered);
};

describe('isCalendarRow', () => {
  test('returns true when ICS icon present', () => {
    const { row } = prepareDocument({ isCalendar: true });
    expect(isCalendarRow(row)).toBe(true);
  });

  test.each(['INVITE.ICS', 'invite.IcS', 'invite.ics: 10 KB', 'invite.ics]'])(
    'detects invitation with %s filename',
    (filename) => {
      const { row } = prepareDocument();
      const icon = row.ownerDocument.createElement('img');
      icon.alt = filename;
      row.appendChild(icon);
      expect(isCalendarRow(row)).toBe(true);
    },
  );

  test('does not treat an ics substring as a file extension', () => {
    const { row } = prepareDocument();
    const icon = row.ownerDocument.createElement('img');
    icon.alt = 'topics';
    row.appendChild(icon);
    expect(isCalendarRow(row)).toBe(false);
  });

  test.each(['invite.icsx', 'invite.ics.gz', 'invite.ics-copy'])(
    'does not treat %s as an ICS filename',
    (filename) => {
      const { row } = prepareDocument();
      const icon = row.ownerDocument.createElement('img');
      icon.alt = filename;
      row.appendChild(icon);
      expect(isCalendarRow(row)).toBe(false);
    },
  );

  test('detects a language-independent Gmail calendar icon URL', () => {
    const { row } = prepareDocument();
    const icon = row.ownerDocument.createElement('img');
    icon.src = 'https://ssl.gstatic.com/ui/v1/icons/mail/images/calendar_2x.png';
    icon.alt = 'Kalendertermin';
    row.appendChild(icon);
    expect(isCalendarRow(row)).toBe(true);
  });

  test('falls back to the localized calendar alt text', () => {
    const { row } = prepareDocument();
    const icon = row.ownerDocument.createElement('img');
    icon.src = 'https://example.test/unknown-icon.png';
    icon.alt = 'Calendar event';
    row.appendChild(icon);
    expect(isCalendarRow(row)).toBe(true);
  });

  test('detects the inline SVG calendar icon regardless of locale', () => {
    const { row } = prepareDocument();
    row.innerHTML =
      '<svg viewBox="0 0 24 24" alt="Kalendertermin"><path d="M19 3h-1V1h-2v2H8V1H6v2H5a2 2 0 0 0-2 2v14"></path></svg>';
    expect(isCalendarRow(row)).toBe(true);
  });

  test('falls back to the localized calendar alt text on an SVG icon', () => {
    const { row } = prepareDocument();
    row.innerHTML =
      '<svg viewBox="0 0 24 24" alt="Calendar event"><path d="M0 0h24v24H0z"></path></svg>';
    expect(isCalendarRow(row)).toBe(true);
  });

  test('does not match unrelated calendar-like image names', () => {
    const { row } = prepareDocument();
    const icon = row.ownerDocument.createElement('img');
    icon.src = 'https://example.test/avatars/user-calendar_profile.png';
    icon.alt = 'Profile';
    row.appendChild(icon);
    expect(isCalendarRow(row)).toBe(false);
  });

  test('does not match unrelated images with calendar-prefixed filenames', () => {
    const { row } = prepareDocument();
    const icon = row.ownerDocument.createElement('img');
    icon.src = 'https://example.test/avatars/calendar_profile.png';
    icon.alt = 'Profile';
    row.appendChild(icon);
    expect(isCalendarRow(row)).toBe(false);
  });

  test('returns false when no invite markers present', () => {
    const { row } = prepareDocument();
    expect(isCalendarRow(row)).toBe(false);
  });
});

describe('isFavouriteRow', () => {
  test('returns true when Gmail marks the star as selected', () => {
    const { row } = prepareDocument({ isFavourite: true });
    expect(isFavouriteRow(row)).toBe(true);
  });

  test('returns false when tooltip missing', () => {
    const { row } = prepareDocument();
    expect(isFavouriteRow(row)).toBe(false);
  });

  test('falls back to the localized starred tooltip', () => {
    const { row } = prepareDocument();
    const star = row.ownerDocument.createElement('span');
    star.dataset.tooltip = 'Starred';
    row.appendChild(star);
    expect(isFavouriteRow(row)).toBe(true);
  });

  test('escapes localized tooltip text before querying', () => {
    const { row } = prepareDocument();
    const star = row.ownerDocument.createElement('span');
    star.dataset.tooltip = 'Starred "today"';
    row.appendChild(star);
    expect(
      isFavouriteRow(row, {
        i18n: { getMessage: () => 'Starred "today"' },
      }),
    ).toBe(true);
  });
});

describe('hasAttachmentRow', () => {
  test('returns true when Gmail class present', () => {
    const { row } = prepareDocument({ hasAttachment: true });
    expect(hasAttachmentRow(row)).toBe(true);
  });

  test('returns false without indicators', () => {
    const { row } = prepareDocument();
    expect(hasAttachmentRow(row)).toBe(false);
  });

  test('detects Google Drive attachment chips', () => {
    const { row } = prepareDocument({
      attachmentChips: [
        {
          dataDocurl: 'https://drive.google.com/file/d/abc',
          imgSrc: '//ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_pdf_x16.png',
        },
      ],
    });
    expect(hasAttachmentRow(row)).toBe(true);
  });
});

describe('isGoogleDocAttachment', () => {
  test('returns true for drive-hosted attachment chips', () => {
    const { row } = prepareDocument({
      attachmentChips: [
        {
          dataDocurl: 'https://drive.google.com/drive/u/0/folders/abc',
        },
      ],
    });
    expect(isGoogleDocAttachment(row)).toBe(true);
  });

  test('accepts protocol-relative Google attachment URLs', () => {
    const { row } = prepareDocument({
      attachmentChips: [{ dataDocurl: '//drive.google.com/file/d/abc' }],
    });
    expect(isGoogleDocAttachment(row)).toBe(true);
  });

  test('returns false when chips are regular attachments', () => {
    const { row } = prepareDocument({
      attachmentChips: [
        {
          title: 'notes.txt',
        },
      ],
    });
    expect(isGoogleDocAttachment(row)).toBe(false);
  });

  test.each(['example.com/file', '/file/d/abc'])(
    'does not treat relative attachment URL %s as Google-hosted',
    (dataDocurl) => {
      const { row } = prepareDocument({ attachmentChips: [{ dataDocurl }] });
      expect(isGoogleDocAttachment(row)).toBe(false);
    },
  );

  test('rejects non-HTTP Google URLs', () => {
    const { row } = prepareDocument({
      attachmentChips: [{ dataDocurl: 'ftp://drive.google.com/file/d/abc' }],
    });
    expect(isGoogleDocAttachment(row)).toBe(false);
  });
});

describe('hasSpecificAttachmentType', () => {
  test('identifies attachments by extension', () => {
    const { row } = prepareDocument({ attachmentChips: [{ title: 'invoice.pdf' }] });
    expect(hasSpecificAttachmentType(row, MODES.PDF)).toBe(true);
  });

  test('identifies Drive attachments by icon', () => {
    const { row } = prepareDocument({
      attachmentChips: [
        {
          dataDocurl: 'https://docs.google.com/document/d/abc',
          imgSrc: '//ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_document_x16.png',
        },
      ],
    });
    expect(hasSpecificAttachmentType(row, MODES.DOCUMENT)).toBe(true);
  });

  test('returns false when config missing', () => {
    const { row } = prepareDocument({ attachmentChips: [{ title: 'custom.bin' }] });
    expect(hasSpecificAttachmentType(row, 'UNKNOWN')).toBe(false);
  });

  test('ignores drive attachments when identifier mismatch', () => {
    const { row } = prepareDocument({
      attachmentChips: [
        {
          dataDocurl: 'https://drive.google.com/file/d/abc',
          imgSrc: '//ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_document_x16.png',
        },
      ],
    });
    expect(hasSpecificAttachmentType(row, MODES.PDF)).toBe(false);
  });

  test('ignores drive attachments without icon hint', () => {
    const { row } = prepareDocument({
      attachmentChips: [
        {
          dataDocurl: 'https://drive.google.com/file/d/abc',
        },
      ],
    });
    expect(hasSpecificAttachmentType(row, MODES.PDF)).toBe(false);
  });
});

describe('applyFilter edge cases', () => {
  const buildListWithRows = () => {
    const doc = makeMailDocument();
    doc.querySelector('.UI').innerHTML = '';
    const rows = [
      makeEmailRow({ id: 'calendar', isCalendar: true }, doc).row,
      makeEmailRow({ id: 'attachment', hasAttachment: true }, doc).row,
      makeEmailRow({ id: 'favourite', isFavourite: true }, doc).row,
    ];
    global.document = doc;
    return { document: doc, rows };
  };

  beforeEach(() => {
    setCurrentMode(MODES.ALL);
    setDebugOn(false);
  });

  test('short-circuits when mode not recognised', () => {
    const { document: doc, rows } = buildListWithRows();
    setCurrentMode('UNKNOWN');
    applyFilter(doc);
    rows.forEach((row) => {
      expectFiltered(row, false);
    });
  });

  test('applies debug styling without hiding', () => {
    const { document: doc, rows } = buildListWithRows();
    setCurrentMode(MODES.CALENDAR);
    setDebugOn(true);
    applyFilter(doc);
    // Debug highlighting is class-based so the overlay colour follows the active theme.
    expect(rows[1].classList.contains('gcal-debug-highlight')).toBe(true);
    expectFiltered(rows[1], false);
  });

  test('resets debug styling when debug disabled', () => {
    const { document: doc, rows } = buildListWithRows();
    setCurrentMode(MODES.CALENDAR);
    setDebugOn(true);
    applyFilter(doc);
    setDebugOn(false);
    applyFilter(doc);
    expect(rows[1].classList.contains('gcal-debug-highlight')).toBe(false);
    expectFiltered(rows[1], true);
  });

  test('does not overwrite host inline display changes while filtering', () => {
    const { document: doc, rows } = buildListWithRows();
    rows[1].style.display = 'table-row';
    setCurrentMode(MODES.CALENDAR);
    applyFilter(doc);
    expectFiltered(rows[1], true);
    expect(rows[1].style.display).toBe('table-row');
    rows[1].style.display = 'grid';

    setCurrentMode(MODES.ALL);
    applyFilter(doc);
    expectFiltered(rows[1], false);
    expect(rows[1].style.display).toBe('grid');
  });
});

describe('applyFilter mode behaviour', () => {
  const buildRows = (rowConfigs) => {
    const doc = makeMailDocument();
    doc.querySelector('.UI').innerHTML = '';
    const rows = rowConfigs.map((config) => makeEmailRow(config, doc).row);
    global.document = doc;
    return { doc, rows };
  };

  beforeEach(() => {
    setDebugOn(false);
  });

  test('EMAIL mode hides calendar invites', () => {
    const { doc, rows } = buildRows([{ id: 'calendar', isCalendar: true }, { id: 'normal' }]);
    setCurrentMode(MODES.EMAIL);
    applyFilter(doc);
    expectFiltered(rows[0], true);
    expectFiltered(rows[1], false);
  });

  test('ATTACH mode keeps attachment rows visible', () => {
    const { doc, rows } = buildRows([
      { id: 'calendar', isCalendar: true },
      { id: 'attachment', hasAttachment: true },
      { id: 'plain' },
    ]);
    setCurrentMode(MODES.ATTACH);
    applyFilter(doc);
    expectFiltered(rows[0], true);
    expectFiltered(rows[1], false);
    expectFiltered(rows[2], true);
  });

  test('FAVOURITES mode only shows starred rows', () => {
    const { doc, rows } = buildRows([{ id: 'plain' }, { id: 'starred', isFavourite: true }]);
    setCurrentMode(MODES.FAVOURITES);
    applyFilter(doc);
    expectFiltered(rows[0], true);
    expectFiltered(rows[1], false);
  });

  test.each([
    [MODES.IMAGE, { title: 'photo.png' }],
    [MODES.PDF, { title: 'contract.pdf' }],
    [
      MODES.DOCUMENT,
      {
        dataDocurl: 'https://docs.google.com/document/d/abc',
        imgSrc: '//ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_document_x16.png',
      },
    ],
    [MODES.SPREADSHEET, { title: 'report.xlsx' }],
    [MODES.PRESENTATION, { title: 'slides.pptx' }],
  ])('attachment mode %s filters rows by chip metadata', (mode, chipConfig) => {
    const doc = makeMailDocument();
    doc.querySelector('.UI').innerHTML = '';
    const matchRow = makeEmailRow({ id: 'match', attachmentChips: [chipConfig] }, doc).row;
    const otherRow = makeEmailRow({ id: 'other' }, doc).row;
    setCurrentMode(mode);
    setDebugOn(false);
    applyFilter(doc);
    expectFiltered(matchRow, false);
    expectFiltered(otherRow, true);
  });
});

describe('isAiNotetakerRow', () => {
  test('returns true for Gemini sender', () => {
    const doc = makeMailDocument();
    const row = doc.createElement('tr');
    const senderSpan = doc.createElement('span');
    senderSpan.className = 'zF';
    senderSpan.setAttribute('name', 'Gemini');
    senderSpan.setAttribute('email', 'gemini-notes@google.com');

    const container = doc.createElement('div');
    container.className = 'yW';
    container.appendChild(senderSpan);
    row.appendChild(container);
    doc.querySelector('.UI').appendChild(row);

    expect(isAiNotetakerRow(row)).toBe(true);
  });

  test('returns true for Otter.ai sender', () => {
    const doc = makeMailDocument();
    const row = doc.createElement('tr');
    const senderSpan = doc.createElement('span');
    senderSpan.className = 'zF';
    senderSpan.setAttribute('name', 'Otter.ai');
    senderSpan.setAttribute('email', 'no-reply@otter.ai');

    const container = doc.createElement('div');
    container.className = 'yW';
    container.appendChild(senderSpan);
    row.appendChild(container);
    doc.querySelector('.UI').appendChild(row);

    expect(isAiNotetakerRow(row)).toBe(true);
  });

  test('returns false for regular sender', () => {
    const doc = makeMailDocument();
    const row = doc.createElement('tr');
    const senderSpan = doc.createElement('span');
    senderSpan.className = 'zF';
    senderSpan.setAttribute('name', 'John Doe');
    senderSpan.setAttribute('email', 'john@example.com');

    const container = doc.createElement('div');
    container.className = 'yW';
    container.appendChild(senderSpan);
    row.appendChild(container);
    doc.querySelector('.UI').appendChild(row);

    expect(isAiNotetakerRow(row)).toBe(false);
  });

  test('is case-insensitive', () => {
    const doc = makeMailDocument();
    const row = doc.createElement('tr');
    const senderSpan = doc.createElement('span');
    senderSpan.className = 'zF';
    senderSpan.setAttribute('name', 'GEMINI'); // Uppercase
    senderSpan.setAttribute('email', 'gemini@google.com');

    const container = doc.createElement('div');
    container.className = 'yW';
    container.appendChild(senderSpan);
    row.appendChild(container);
    doc.querySelector('.UI').appendChild(row);

    expect(isAiNotetakerRow(row)).toBe(true);
  });
});

describe('isDevNotificationRow', () => {
  test('returns true for GitLab sender', () => {
    const doc = makeMailDocument();
    const row = doc.createElement('tr');
    const senderSpan = doc.createElement('span');
    senderSpan.className = 'yP';
    senderSpan.setAttribute('email', 'gitlab@mg.gitlab.com');
    senderSpan.setAttribute('name', 'GitLab');

    const container = doc.createElement('div');
    container.className = 'yW';
    container.appendChild(senderSpan);
    row.appendChild(container);
    doc.querySelector('.UI').appendChild(row);

    expect(isDevNotificationRow(row)).toBe(true);
  });

  test('returns true for GitHub sender', () => {
    const doc = makeMailDocument();
    const row = doc.createElement('tr');
    const senderSpan = doc.createElement('span');
    senderSpan.className = 'yP';
    senderSpan.setAttribute('email', 'notifications@github.com');
    senderSpan.setAttribute('name', 'GitHub');

    const container = doc.createElement('div');
    container.className = 'yW';
    container.appendChild(senderSpan);
    row.appendChild(container);
    doc.querySelector('.UI').appendChild(row);

    expect(isDevNotificationRow(row)).toBe(true);
  });

  test('returns false for regular sender', () => {
    const doc = makeMailDocument();
    const row = doc.createElement('tr');
    const senderSpan = doc.createElement('span');
    senderSpan.className = 'yP';
    senderSpan.setAttribute('email', 'john@example.com');
    senderSpan.setAttribute('name', 'John Doe');

    const container = doc.createElement('div');
    container.className = 'yW';
    container.appendChild(senderSpan);
    row.appendChild(container);
    doc.querySelector('.UI').appendChild(row);

    expect(isDevNotificationRow(row)).toBe(false);
  });

  test('is case-insensitive', () => {
    const doc = makeMailDocument();
    const row = doc.createElement('tr');
    const senderSpan = doc.createElement('span');
    senderSpan.className = 'yP';
    senderSpan.setAttribute('email', 'noreply@GITHUB.COM');
    senderSpan.setAttribute('name', 'GitHub');

    const container = doc.createElement('div');
    container.className = 'yW';
    container.appendChild(senderSpan);
    row.appendChild(container);
    doc.querySelector('.UI').appendChild(row);

    expect(isDevNotificationRow(row)).toBe(true);
  });
});

describe('state mutations in tandem', () => {
  test('allows toggling toolbar alignment and favourites flag', () => {
    setToolbarAlignment('center');
    setShowFavouritesButton(true);
    setThemePreference('dark');
    expect(() => applyFilter(document)).not.toThrow();
  });
});

describe('AI notetaker pattern precision', () => {
  const buildRow = (name, email) => {
    const doc = makeMailDocument();
    const row = doc.createElement('tr');
    const senderSpan = doc.createElement('span');
    senderSpan.className = 'zF';
    senderSpan.setAttribute('name', name);
    senderSpan.setAttribute('email', email);
    const container = doc.createElement('div');
    container.className = 'yW';
    container.appendChild(senderSpan);
    row.appendChild(container);
    doc.querySelector('.UI').appendChild(row);
    return row;
  };

  test('matches the bare product name "Claude"', () => {
    expect(isAiNotetakerRow(buildRow('Claude', 'noreply@anthropic.com'))).toBe(true);
  });

  test('matches vendor-prefixed product names', () => {
    expect(isAiNotetakerRow(buildRow('Anthropic Claude', 'noreply@anthropic.com'))).toBe(true);
    expect(isAiNotetakerRow(buildRow('Microsoft Copilot', 'copilot@microsoft.com'))).toBe(true);
  });

  test('matches real product sender names with extra tokens', () => {
    expect(isAiNotetakerRow(buildRow('Microsoft 365 Copilot', 'copilot@microsoft.com'))).toBe(true);
    expect(isAiNotetakerRow(buildRow('Fathom AI Notetaker', 'no-reply@fathom.video'))).toBe(true);
    expect(isAiNotetakerRow(buildRow('Gemini for Google Workspace', 'gemini@google.com'))).toBe(
      true,
    );
  });

  test('does not match humans whose names contain a product word', () => {
    expect(isAiNotetakerRow(buildRow('Claude Dupont', 'claude.dupont@example.com'))).toBe(false);
    expect(isAiNotetakerRow(buildRow('Gemini Horoscope Daily', 'stars@example.com'))).toBe(false);
    expect(isAiNotetakerRow(buildRow('Fathom Analytics', 'billing@usefathom.com'))).toBe(false);
  });
});

describe('hasAttachmentRow localized tooltip', () => {
  test('detects attachments via the extension-locale tooltip text', () => {
    const { row, document: doc } = prepareDocument();
    const tooltipSpan = doc.createElement('span');
    tooltipSpan.setAttribute('data-tooltip', 'Mit Anhang');
    row.appendChild(tooltipSpan);

    const chromeApi = {
      i18n: { getMessage: (key) => (key === 'alt_has_attachment' ? 'Mit Anhang' : '') },
    };
    expect(hasAttachmentRow(row, chromeApi)).toBe(true);
    // Without the localized message the same row is not detected
    expect(hasAttachmentRow(row, { i18n: { getMessage: () => '' } })).toBe(false);
  });
});

describe('hasAttachmentRow SVG paperclip', () => {
  test('detects the inline SVG paperclip regardless of locale', () => {
    const { row } = prepareDocument();
    row.innerHTML =
      '<svg viewBox="0 0 24 24" alt="Mit Anhang"><path d="M18 16.5H7.5c-2.21 0-4-1.79-4-4s1.79-4 4-4"></path></svg>';
    expect(hasAttachmentRow(row, { i18n: { getMessage: () => '' } })).toBe(true);
  });

  test('detects an SVG paperclip via the extension-locale alt text', () => {
    const { row } = prepareDocument();
    row.innerHTML =
      '<svg viewBox="0 0 24 24" alt="Mit Anhang"><path d="M0 0h24v24H0z"></path></svg>';
    const chromeApi = {
      i18n: { getMessage: (key) => (key === 'alt_has_attachment' ? 'Mit Anhang' : '') },
    };
    expect(hasAttachmentRow(row, chromeApi)).toBe(true);
  });

  test('does not treat the calendar icon title as an attachment', () => {
    const { row } = prepareDocument();
    row.innerHTML =
      '<svg viewBox="0 0 24 24" alt="Calendar event" title="Has attachment"><path d="M19 3h-1V1h-2v2H8V1H6v2H5"></path></svg>';
    const chromeApi = {
      i18n: { getMessage: (key) => (key === 'alt_has_attachment' ? 'Has attachment' : '') },
    };
    expect(hasAttachmentRow(row, chromeApi)).toBe(false);
  });
});

describe('sender detection fallbacks', () => {
  const buildRowWithSender = (buildSender) => {
    const doc = makeMailDocument();
    const row = doc.createElement('tr');
    const container = doc.createElement('div');
    container.className = 'yW';
    buildSender(doc, container);
    row.appendChild(container);
    doc.querySelector('.UI').appendChild(row);
    return row;
  };

  test('isAiNotetakerRow falls back to any span[email] in the sender area', () => {
    const row = buildRowWithSender((doc, container) => {
      const span = doc.createElement('span');
      span.setAttribute('email', 'meetings@otter.ai');
      span.textContent = 'Otter.ai';
      container.appendChild(span);
    });
    expect(isAiNotetakerRow(row)).toBe(true);
  });

  test('isAiNotetakerRow falls back to sender-area text content', () => {
    const row = buildRowWithSender((doc, container) => {
      container.textContent = 'ChatGPT';
    });
    expect(isAiNotetakerRow(row)).toBe(true);
  });

  test('isAiNotetakerRow returns false without a sender area', () => {
    const doc = makeMailDocument();
    const row = doc.createElement('tr');
    doc.querySelector('.UI').appendChild(row);
    expect(isAiNotetakerRow(row)).toBe(false);
  });

  test('isDevNotificationRow falls back to any span[email] in the sender area', () => {
    const row = buildRowWithSender((doc, container) => {
      const span = doc.createElement('span');
      span.setAttribute('email', 'notifications@github.com');
      container.appendChild(span);
    });
    expect(isDevNotificationRow(row)).toBe(true);
  });

  test('isDevNotificationRow returns false without any sender element', () => {
    const row = buildRowWithSender(() => {});
    expect(isDevNotificationRow(row)).toBe(false);
  });

  test('isDevNotificationRow ignores lookalike domains', () => {
    const row = buildRowWithSender((doc, container) => {
      const span = doc.createElement('span');
      span.className = 'yP';
      span.setAttribute('email', 'phish@github.com.evil.example');
      container.appendChild(span);
    });
    expect(isDevNotificationRow(row)).toBe(false);
  });
});
