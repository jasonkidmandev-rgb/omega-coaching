/**
 * Global timezone polyfill for PeptideCoach.Pro
 * 
 * Forces America/Denver (Mountain Time) for ALL date/time formatting,
 * regardless of the user's browser timezone.
 * 
 * MUST be imported at the very top of main.tsx before any other code runs.
 */

const APP_TIMEZONE = "America/Denver";

// ── Patch Intl.DateTimeFormat ──
const OriginalDateTimeFormat = Intl.DateTimeFormat;

function PatchedDateTimeFormat(
  this: Intl.DateTimeFormat | void,
  locales?: string | string[],
  options?: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
  const patchedOptions: Intl.DateTimeFormatOptions = {
    ...options,
    timeZone: options?.timeZone || APP_TIMEZONE,
  };
  // Support both `new Intl.DateTimeFormat()` and `Intl.DateTimeFormat()` calls
  if (this instanceof PatchedDateTimeFormat) {
    return new OriginalDateTimeFormat(locales, patchedOptions);
  }
  return new OriginalDateTimeFormat(locales, patchedOptions);
}

// Copy static methods and prototype
PatchedDateTimeFormat.prototype = OriginalDateTimeFormat.prototype;
PatchedDateTimeFormat.supportedLocalesOf = OriginalDateTimeFormat.supportedLocalesOf;
Object.defineProperty(PatchedDateTimeFormat, 'name', { value: 'DateTimeFormat' });

// Make it work with both `new` and without `new`
const handler: ProxyHandler<typeof PatchedDateTimeFormat> = {
  construct(_target, args) {
    const [locales, options] = args as [string | string[] | undefined, Intl.DateTimeFormatOptions | undefined];
    const patchedOptions: Intl.DateTimeFormatOptions = {
      ...options,
      timeZone: options?.timeZone || APP_TIMEZONE,
    };
    return new OriginalDateTimeFormat(locales, patchedOptions);
  },
  apply(_target, _thisArg, args) {
    const [locales, options] = args as [string | string[] | undefined, Intl.DateTimeFormatOptions | undefined];
    const patchedOptions: Intl.DateTimeFormatOptions = {
      ...options,
      timeZone: options?.timeZone || APP_TIMEZONE,
    };
    return new OriginalDateTimeFormat(locales, patchedOptions);
  },
};

(Intl as any).DateTimeFormat = new Proxy(PatchedDateTimeFormat, handler);

// ── Patch Date.prototype.toLocaleString ──
const origToLocaleString = Date.prototype.toLocaleString;
Date.prototype.toLocaleString = function (
  locales?: string | string[],
  options?: Intl.DateTimeFormatOptions
): string {
  return origToLocaleString.call(this, locales, {
    ...options,
    timeZone: options?.timeZone || APP_TIMEZONE,
  });
};

// ── Patch Date.prototype.toLocaleDateString ──
const origToLocaleDateString = Date.prototype.toLocaleDateString;
Date.prototype.toLocaleDateString = function (
  locales?: string | string[],
  options?: Intl.DateTimeFormatOptions
): string {
  return origToLocaleDateString.call(this, locales, {
    ...options,
    timeZone: options?.timeZone || APP_TIMEZONE,
  });
};

// ── Patch Date.prototype.toLocaleTimeString ──
const origToLocaleTimeString = Date.prototype.toLocaleTimeString;
Date.prototype.toLocaleTimeString = function (
  locales?: string | string[],
  options?: Intl.DateTimeFormatOptions
): string {
  return origToLocaleTimeString.call(this, locales, {
    ...options,
    timeZone: options?.timeZone || APP_TIMEZONE,
  });
};

// Log confirmation (dev only)
if (import.meta.env.DEV) {
  console.log(`[Timezone] All dates forced to ${APP_TIMEZONE}`);
}

export {};
