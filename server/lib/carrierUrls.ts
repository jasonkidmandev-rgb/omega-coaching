const CARRIER_URL_TEMPLATES: Record<string, (n: string) => string> = {
  fedex:      n => `https://www.fedex.com/fedextrack/?trknbr=${n}`,
  ups:        n => `https://www.ups.com/track?tracknum=${n}`,
  usps:       n => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,
  pirateship: n => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,
  dhl:        n => `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}`,
};

/**
 * Returns a tracking URL for a given carrier + tracking number.
 * Carrier matching is case-insensitive and trims whitespace.
 * Returns undefined when the carrier is unknown.
 */
export function buildTrackingUrl(carrier: string, trackingNumber: string): string | undefined {
  const key = carrier.trim().toLowerCase();
  return CARRIER_URL_TEMPLATES[key]?.(trackingNumber);
}
