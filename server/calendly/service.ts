/**
 * Calendly API Service
 * One-way sync: fetches scheduled events from Calendly API
 * Excludes configured event types (e.g., VTS sessions)
 */

const CALENDLY_API_BASE = "https://api.calendly.com";

// Default excluded event type names (can be overridden via admin settings)
const DEFAULT_EXCLUDED_EVENT_NAMES = [
  "Jason - 30 Minutes VTS",
  "Jason - 60 Minutes VTS",
];

interface CalendlyUser {
  uri: string;
  name: string;
  email: string;
  current_organization: string;
}

interface CalendlyEventType {
  uri: string;
  name: string;
  active: boolean;
  duration: number;
  kind: string;
  slug: string;
  color: string;
  description_plain: string;
}

interface CalendlyScheduledEvent {
  uri: string;
  name: string;
  status: "active" | "canceled";
  start_time: string;
  end_time: string;
  event_type: string; // URI reference to event type
  location?: {
    type: string;
    join_url?: string;
    location?: string;
    data?: any;
  };
  invitees_counter: {
    total: number;
    active: number;
    limit: number;
  };
  created_at: string;
  updated_at: string;
  event_memberships: Array<{ user: string; user_email: string; user_name: string }>;
  calendar_event?: {
    kind: string;
    external_id: string;
  };
}

interface CalendlyInvitee {
  uri: string;
  name: string;
  email: string;
  status: "active" | "canceled";
  timezone: string;
  questions_and_answers: Array<{
    question: string;
    answer: string;
    position: number;
  }>;
  created_at: string;
  updated_at: string;
  cancel_url: string;
  reschedule_url: string;
}

export interface CalendlyAppointment {
  id: string; // event UUID extracted from URI
  name: string;
  eventTypeName: string;
  startTime: string;
  endTime: string;
  status: "active" | "canceled";
  duration: number; // minutes
  joinUrl: string | null;
  locationType: string | null;
  invitees: Array<{
    name: string;
    email: string;
    status: string;
    timezone: string;
  }>;
  createdAt: string;
}

// In-memory cache for Calendly data
let cachedAppointments: CalendlyAppointment[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

let cachedEventTypes: CalendlyEventType[] | null = null;
let eventTypesCacheTimestamp: number = 0;
const EVENT_TYPES_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let cachedUserUri: string | null = null;

function getToken(): string {
  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) throw new Error("CALENDLY_API_TOKEN not configured");
  return token;
}

function getHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  };
}

function extractUuid(uri: string): string {
  return uri.split("/").pop() || uri;
}

async function getCurrentUser(): Promise<CalendlyUser> {
  if (cachedUserUri) {
    // Return minimal cached data
    return { uri: cachedUserUri } as CalendlyUser;
  }
  const res = await fetch(`${CALENDLY_API_BASE}/users/me`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Calendly API error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  cachedUserUri = data.resource.uri;
  return data.resource;
}

export async function getEventTypes(): Promise<CalendlyEventType[]> {
  if (cachedEventTypes && Date.now() - eventTypesCacheTimestamp < EVENT_TYPES_CACHE_TTL_MS) {
    return cachedEventTypes;
  }

  const user = await getCurrentUser();
  const res = await fetch(
    `${CALENDLY_API_BASE}/event_types?user=${encodeURIComponent(user.uri)}&active=true&count=100`,
    { headers: getHeaders() }
  );
  if (!res.ok) throw new Error(`Calendly API error: ${res.status}`);
  const data = await res.json();
  cachedEventTypes = data.collection;
  eventTypesCacheTimestamp = Date.now();
  return data.collection;
}

async function getInvitees(eventUuid: string): Promise<CalendlyInvitee[]> {
  const res = await fetch(
    `${CALENDLY_API_BASE}/scheduled_events/${eventUuid}/invitees?count=100`,
    { headers: getHeaders() }
  );
  if (!res.ok) {
    console.error(`[Calendly] Failed to fetch invitees for ${eventUuid}: ${res.status}`);
    return [];
  }
  const data = await res.json();
  return data.collection || [];
}

async function fetchScheduledEvents(
  minStartTime: string,
  maxStartTime: string,
  status: "active" | "canceled" = "active"
): Promise<CalendlyScheduledEvent[]> {
  const user = await getCurrentUser();
  const allEvents: CalendlyScheduledEvent[] = [];
  let pageToken: string | null = null;

  do {
    const params = new URLSearchParams({
      user: user.uri,
      min_start_time: minStartTime,
      max_start_time: maxStartTime,
      status,
      count: "100",
      sort: "start_time:asc",
    });
    if (pageToken) params.set("page_token", pageToken);

    const res = await fetch(`${CALENDLY_API_BASE}/scheduled_events?${params}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Calendly API error: ${res.status}`);
    const data = await res.json();
    allEvents.push(...(data.collection || []));
    pageToken = data.pagination?.next_page_token || null;
  } while (pageToken);

  return allEvents;
}

/**
 * Get excluded event type names from DB settings, falling back to defaults
 */
async function getExcludedNamesFromDb(): Promise<string[]> {
  try {
    const { db } = await import("../db");
    const { adminSettings } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const result = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.settingKey, "calendly_excluded_event_types"))
      .limit(1);
    if (result.length > 0 && result[0].settingValue) {
      return JSON.parse(result[0].settingValue) as string[];
    }
  } catch {
    // Fall through to defaults
  }
  return DEFAULT_EXCLUDED_EVENT_NAMES;
}

/**
 * Get excluded event type URIs based on configured names
 */
async function getExcludedEventTypeUris(customExclusions?: string[]): Promise<Set<string>> {
  const eventTypes = await getEventTypes();
  const excludeNames = customExclusions || await getExcludedNamesFromDb();
  const excludedUris = new Set<string>();

  for (const et of eventTypes) {
    if (excludeNames.some(name => et.name.toLowerCase().includes(name.toLowerCase()))) {
      excludedUris.add(et.uri);
    }
  }

  return excludedUris;
}

/**
 * Build an event type URI → name lookup map
 */
async function getEventTypeNameMap(): Promise<Map<string, string>> {
  const eventTypes = await getEventTypes();
  const map = new Map<string, string>();
  for (const et of eventTypes) {
    map.set(et.uri, et.name);
  }
  return map;
}

/**
 * Main function: Get appointments from Calendly
 * Returns past 2 weeks + next 8 weeks of events, excluding VTS types
 */
export async function getCalendlyAppointments(
  options?: {
    pastDays?: number;
    futureDays?: number;
    excludedEventNames?: string[];
    forceRefresh?: boolean;
    includeCanceled?: boolean;
  }
): Promise<CalendlyAppointment[]> {
  const {
    pastDays = 14,
    futureDays = 56,
    excludedEventNames,
    forceRefresh = false,
    includeCanceled = false,
  } = options || {};

  // Check cache
  if (!forceRefresh && cachedAppointments && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedAppointments;
  }

  const now = new Date();
  const minStart = new Date(now.getTime() - pastDays * 24 * 60 * 60 * 1000).toISOString();
  const maxStart = new Date(now.getTime() + futureDays * 24 * 60 * 60 * 1000).toISOString();

  console.log(`[Calendly] Fetching events from ${minStart} to ${maxStart}`);

  // Fetch active events
  const activeEvents = await fetchScheduledEvents(minStart, maxStart, "active");
  let allEvents = activeEvents;

  // Optionally include canceled
  if (includeCanceled) {
    const canceledEvents = await fetchScheduledEvents(minStart, maxStart, "canceled");
    allEvents = [...activeEvents, ...canceledEvents];
  }

  // Get exclusion list and name map
  const excludedUris = await getExcludedEventTypeUris(excludedEventNames);
  const nameMap = await getEventTypeNameMap();

  // Filter out excluded event types
  const filteredEvents = allEvents.filter(evt => !excludedUris.has(evt.event_type));

  console.log(`[Calendly] Found ${allEvents.length} total events, ${filteredEvents.length} after filtering`);

  // Fetch invitees for each event (batch with concurrency limit)
  const CONCURRENCY = 5;
  const appointments: CalendlyAppointment[] = [];

  for (let i = 0; i < filteredEvents.length; i += CONCURRENCY) {
    const batch = filteredEvents.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (evt) => {
        const eventUuid = extractUuid(evt.uri);
        const invitees = await getInvitees(eventUuid);
        const startMs = new Date(evt.start_time).getTime();
        const endMs = new Date(evt.end_time).getTime();
        const durationMin = Math.round((endMs - startMs) / 60000);

        // Extract join URL from location
        let joinUrl: string | null = null;
        let locationType: string | null = null;
        if (evt.location) {
          locationType = evt.location.type || null;
          joinUrl = evt.location.join_url || null;
        }

        return {
          id: eventUuid,
          name: evt.name,
          eventTypeName: nameMap.get(evt.event_type) || evt.name,
          startTime: evt.start_time,
          endTime: evt.end_time,
          status: evt.status,
          duration: durationMin,
          joinUrl,
          locationType,
          invitees: invitees.map(inv => ({
            name: inv.name,
            email: inv.email,
            status: inv.status,
            timezone: inv.timezone,
          })),
          createdAt: evt.created_at,
        } satisfies CalendlyAppointment;
      })
    );
    appointments.push(...results);
  }

  // Sort by start time ascending
  appointments.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Update cache
  cachedAppointments = appointments;
  cacheTimestamp = Date.now();

  return appointments;
}

/**
 * Invalidate the cache (e.g., after admin changes exclusion settings)
 */
export function invalidateCalendlyCache() {
  cachedAppointments = null;
  cacheTimestamp = 0;
  cachedEventTypes = null;
  eventTypesCacheTimestamp = 0;
  cachedUserUri = null;
}

/**
 * Check if Calendly is configured (token exists)
 */
export function isCalendlyConfigured(): boolean {
  return !!process.env.CALENDLY_API_TOKEN;
}

/**
 * Create a webhook subscription with Calendly
 */
export async function createWebhookSubscription(
  callbackUrl: string,
  signingKey?: string
): Promise<{ uri: string; callbackUrl: string; events: string[] }> {
  const user = await getCurrentUser();
  const orgUri = (user as any).current_organization;
  if (!orgUri) {
    // Fetch full user to get org
    const res = await fetch(`${CALENDLY_API_BASE}/users/me`, { headers: getHeaders() });
    const data = await res.json();
    const org = data.resource.current_organization;
    if (!org) throw new Error("Could not determine organization URI");
    return createWebhookForOrg(callbackUrl, org, signingKey);
  }
  return createWebhookForOrg(callbackUrl, orgUri, signingKey);
}

async function createWebhookForOrg(
  callbackUrl: string,
  organizationUri: string,
  signingKey?: string
): Promise<{ uri: string; callbackUrl: string; events: string[] }> {
  const user = await getCurrentUser();
  const body: any = {
    url: callbackUrl,
    events: [
      "invitee.created",
      "invitee.canceled",
    ],
    organization: organizationUri,
    user: user.uri,
    scope: "user",
  };
  if (signingKey) body.signing_key = signingKey;

  const res = await fetch(`${CALENDLY_API_BASE}/webhook_subscriptions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    // If webhook already exists, that's OK
    if (res.status === 409) {
      console.log("[Calendly] Webhook subscription already exists");
      return { uri: "existing", callbackUrl, events: body.events };
    }
    throw new Error(`Failed to create webhook: ${res.status} ${JSON.stringify(errData)}`);
  }

  const data = await res.json();
  console.log(`[Calendly] Webhook subscription created: ${data.resource.uri}`);
  return {
    uri: data.resource.uri,
    callbackUrl: data.resource.callback_url,
    events: data.resource.events,
  };
}

/**
 * List existing webhook subscriptions
 */
export async function listWebhookSubscriptions(): Promise<Array<{
  uri: string;
  callbackUrl: string;
  events: string[];
  state: string;
  createdAt: string;
}>> {
  const user = await getCurrentUser();
  // Need full user to get org
  const userRes = await fetch(`${CALENDLY_API_BASE}/users/me`, { headers: getHeaders() });
  const userData = await userRes.json();
  const orgUri = userData.resource.current_organization;

  const params = new URLSearchParams({
    organization: orgUri,
    scope: "user",
    user: user.uri,
    count: "100",
  });

  const res = await fetch(`${CALENDLY_API_BASE}/webhook_subscriptions?${params}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to list webhooks: ${res.status}`);
  const data = await res.json();

  return (data.collection || []).map((wh: any) => ({
    uri: wh.uri,
    callbackUrl: wh.callback_url,
    events: wh.events,
    state: wh.state,
    createdAt: wh.created_at,
  }));
}

/**
 * Delete a webhook subscription
 */
export async function deleteWebhookSubscription(webhookUri: string): Promise<void> {
  const uuid = extractUuid(webhookUri);
  const res = await fetch(`${CALENDLY_API_BASE}/webhook_subscriptions/${uuid}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to delete webhook: ${res.status}`);
  }
  console.log(`[Calendly] Webhook subscription deleted: ${webhookUri}`);
}
