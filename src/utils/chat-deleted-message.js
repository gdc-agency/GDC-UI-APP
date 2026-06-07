/** WhatsApp-style tombstone copy (client-only; uses existing soft-delete API). */
export const DELETED_MESSAGE_TEXT = 'This message was deleted';
export const DELETED_BY_ME_TEXT = 'You deleted this message';

/**
 * @param {Record<string, unknown>} msg
 * @param {{ byMe?: boolean }} [opts]
 * @returns {Record<string, unknown>}
 */
export function toDeletedMessageUi(msg, opts = {}) {
  const base = msg && typeof msg === 'object' ? { ...msg } : {};
  const text = opts.byMe ? DELETED_BY_ME_TEXT : DELETED_MESSAGE_TEXT;
  return {
    ...base,
    deleted: true,
    type: 'text',
    text,
    uri: undefined,
    fileName: undefined,
    fileSizeLabel: undefined,
    status: undefined,
    uploadProgress: undefined,
  };
}

/**
 * @param {Array<Record<string, unknown>>} messages
 * @param {string} messageId
 */
/**
 * @param {Array<Record<string, unknown>>} messages
 * @param {string} messageId
 * @param {{ byMe?: boolean }} [opts]
 */
export function patchMessagesWithTombstone(messages, messageId, opts = {}) {
  const mid = String(messageId);
  return (Array.isArray(messages) ? messages : []).map((m) =>
    String(m.id) === mid ? toDeletedMessageUi(m, opts) : m,
  );
}
