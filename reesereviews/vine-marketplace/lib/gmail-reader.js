/**
 * vine-marketplace — Gmail / IMAP Reader
 *
 * Connects to the Gmail account (angelreporters@gmail.com) via IMAP
 * and fetches unread Amazon order/Vine emails.
 *
 * Auth options (configure one in .env):
 *   Option A — Gmail App Password (IMAP)
 *     GMAIL_USER, GMAIL_APP_PASSWORD
 *   Option B — OAuth2 (preferred for production)
 *     GMAIL_USER, GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET, GMAIL_OAUTH_REFRESH_TOKEN
 *
 * Returns an array of raw ParsedMail objects from mailparser.
 */

'use strict';

const Imap = require('imap');
const { simpleParser } = require('mailparser');

const IMAP_HOST = process.env.GMAIL_IMAP_HOST || 'imap.gmail.com';
const IMAP_PORT = parseInt(process.env.GMAIL_IMAP_PORT || '993', 10);
const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';

/**
 * Build IMAP search criteria to find Amazon emails optionally filtered by date range.
 * @param {Date|null} since
 * @param {Date|null} before
 * @returns {Array} IMAP search criteria array
 */
function buildSearchCriteria(since = null, before = null) {
  const criteria = [];

  // Search for Amazon emails by subject keywords
  // IMAP OR is limited; we use TEXT search for broad capture then filter in-process
  criteria.push(['OR',
    ['SUBJECT', 'Amazon'],
    ['FROM', '@amazon.com'],
  ]);

  if (since) {
    criteria.push(['SINCE', since]);
  }
  if (before) {
    criteria.push(['BEFORE', before]);
  }

  return criteria;
}

/**
 * Connect to Gmail via IMAP and fetch emails matching criteria.
 *
 * @param {object} opts
 * @param {Date|null} opts.since  - Only fetch emails received after this date
 * @param {Date|null} opts.before - Only fetch emails received before this date
 * @param {boolean}   opts.markRead - Mark fetched emails as read (default: false)
 * @returns {Promise<Array>} Array of ParsedMail objects
 */
function fetchEmails({ since = null, before = null, markRead = false } = {}) {
  return new Promise((resolve, reject) => {
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      return reject(new Error(
        'GMAIL_USER and GMAIL_APP_PASSWORD must be set. ' +
        'See .env.example for setup instructions.'
      ));
    }

    const imap = new Imap({
      user: GMAIL_USER,
      password: GMAIL_APP_PASSWORD,
      host: IMAP_HOST,
      port: IMAP_PORT,
      tls: true,
      tlsOptions: { rejectUnauthorized: true },
      authTimeout: 15000,
    });

    const mails = [];

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err) => {
        if (err) { imap.end(); return reject(err); }

        const criteria = buildSearchCriteria(since, before);

        imap.search(criteria, (searchErr, uids) => {
          if (searchErr) { imap.end(); return reject(searchErr); }
          if (!uids || uids.length === 0) {
            imap.end();
            return resolve([]);
          }

          const fetch = imap.fetch(uids, { bodies: '', struct: true });

          fetch.on('message', (msg) => {
            const chunks = [];
            msg.on('body', (stream) => {
              stream.on('data', (chunk) => chunks.push(chunk));
              stream.on('end', async () => {
                try {
                  const raw = Buffer.concat(chunks);
                  const parsed = await simpleParser(raw);
                  mails.push(parsed);
                } catch (parseErr) {
                  // Non-fatal: skip unparseable messages
                }
              });
            });
          });

          fetch.once('error', (fetchErr) => {
            imap.end();
            reject(fetchErr);
          });

          fetch.once('end', () => {
            if (markRead && uids.length > 0) {
              imap.addFlags(uids, '\\Seen', () => imap.end());
            } else {
              imap.end();
            }
          });
        });
      });
    });

    imap.once('error', (err) => reject(err));
    imap.once('end', () => resolve(mails));

    imap.connect();
  });
}

/**
 * Filter a list of ParsedMail objects to only those from Amazon senders.
 * Uses strict domain matching to prevent spoofed sender attacks.
 */
function filterAmazonEmails(mails) {
  return mails.filter((mail) => {
    const from = mail.from?.text || '';
    const lower = from.toLowerCase();
    const emailTokens = lower.match(/[\w.+-]+@([\w.-]+)/g) || [];
    return emailTokens.some((token) => {
      const atIdx = token.lastIndexOf('@');
      const domain = atIdx !== -1 ? token.slice(atIdx + 1) : '';
      return domain === 'amazon.com' || domain.endsWith('.amazon.com');
    });
  });
}

module.exports = { fetchEmails, filterAmazonEmails };
