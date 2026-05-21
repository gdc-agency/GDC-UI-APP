import { Platform } from 'react-native';

import { apiRequest } from '@/services/api/http';

/**
 * Normalize GET /api/profile/getProfile JSON to a single user row object.
 * Handles null, `{ user }`, `{ profile }`, `{ data }`, or a flat row.
 * @param {unknown} data
 * @returns {Record<string, unknown> | null}
 */
export function parseProfileResponse(data) {
  if (data == null || typeof data !== 'object' || Array.isArray(data)) return null;
  const o = /** @type {Record<string, unknown>} */ (data);
  const profileKeys = [
    'name',
    'email',
    'phone',
    'department',
    'gdc_id',
    'cnic',
    'address',
    'profile_image',
    'team_id',
    'team_name',
    'work_site',
  ];
  const user = o.user;
  if (user && typeof user === 'object' && !Array.isArray(user)) {
    return /** @type {Record<string, unknown>} */ (user);
  }
  const profile = o.profile;
  if (profile && typeof profile === 'object' && !Array.isArray(profile)) {
    return /** @type {Record<string, unknown>} */ (profile);
  }
  const inner = o.data;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    if (profileKeys.some((k) => k in inner)) {
      return /** @type {Record<string, unknown>} */ (inner);
    }
    const nested = inner.user;
    if (nested && typeof nested === 'object' && !Array.isArray(nested) && profileKeys.some((k) => k in nested)) {
      return /** @type {Record<string, unknown>} */ (nested);
    }
  }
  /** GET /getProfile row fields from Aouth-Service (flat JSON). */
  if (profileKeys.some((k) => k in o)) return o;
  return null;
}

/**
 * GET /api/profile/getProfile
 * @param {string} token
 */
export async function getProfile(token) {
  const raw = await apiRequest('/api/profile/getProfile', { method: 'GET', token });
  return parseProfileResponse(raw);
}

/**
 * PUT /api/profile/updateProfile
 * Text fields as JSON, or multipart when `image` is set (field name must be `image` — matches multer).
 *
 * @param {string} token
 * @param {Record<string, string>} fields
 * @param {{ uri: string; name?: string; type?: string } | null | undefined} [image] - picked asset (expo-image-picker)
 */
/**
 * POST /api/profile/chat-participants — profile snapshots for chat peers (incl. updated avatars).
 * @param {string} token
 * @param {Array<string | number>} userIds
 */
export async function fetchChatParticipantSnapshots(token, userIds) {
  const ids = [...new Set((Array.isArray(userIds) ? userIds : []).map((id) => String(id).trim()).filter(Boolean))];
  if (!ids.length) return { data: [] };
  return apiRequest('/api/profile/chat-participants', {
    method: 'POST',
    token,
    body: { userIds: ids },
  });
}

export async function updateProfile(token, fields, image) {
  if (image?.uri) {
    const form = new FormData();
    for (const [key, val] of Object.entries(fields)) {
      if (val === undefined || val === null) continue;
      form.append(key, String(val));
    }
    const rawName = image.name && String(image.name).trim() ? String(image.name).trim() : 'profile.jpg';
    const fileName = /\.[a-z0-9]{2,4}$/i.test(rawName) ? rawName : `${rawName.replace(/\.$/, '')}.jpg`;
    const mime =
      image.type && String(image.type).startsWith('image/') ? String(image.type) : 'image/jpeg';
    if (Platform.OS === 'web') {
      const blobRes = await fetch(image.uri);
      const blob = await blobRes.blob();
      if (typeof File !== 'undefined') {
        form.append('image', new File([blob], fileName, { type: mime }));
      } else {
        form.append('image', blob, fileName);
      }
    } else {
      form.append('image', /** @type {any} */ ({ uri: image.uri, name: fileName, type: mime }));
    }
    return apiRequest('/api/profile/updateProfile', {
      method: 'PUT',
      token,
      body: form,
      isFormData: true,
    });
  }

  return apiRequest('/api/profile/updateProfile', {
    method: 'PUT',
    token,
    body: fields,
  });
}
