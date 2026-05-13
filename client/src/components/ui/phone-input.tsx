import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

// Common country codes
const countryCodes = [
  { code: "1", country: "US/CA", flag: "🇺🇸" },
  { code: "44", country: "UK", flag: "🇬🇧" },
  { code: "61", country: "AU", flag: "🇦🇺" },
  { code: "49", country: "DE", flag: "🇩🇪" },
  { code: "33", country: "FR", flag: "🇫🇷" },
  { code: "39", country: "IT", flag: "🇮🇹" },
  { code: "34", country: "ES", flag: "🇪🇸" },
  { code: "81", country: "JP", flag: "🇯🇵" },
  { code: "86", country: "CN", flag: "🇨🇳" },
  { code: "91", country: "IN", flag: "🇮🇳" },
  { code: "52", country: "MX", flag: "🇲🇽" },
  { code: "55", country: "BR", flag: "🇧🇷" },
];

// Format phone number as (XXX) XXX-XXXX
export function formatPhoneNumber(value: string): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, "");
  
  // Format based on length
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

// Extract just digits from formatted phone
export function extractPhoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

// Parse a full phone number into country code and number
export function parsePhoneNumber(fullPhone: string): { countryCode: string; phoneNumber: string } {
  if (!fullPhone) return { countryCode: "1", phoneNumber: "" };
  
  // Remove all non-digit characters
  const digits = fullPhone.replace(/\D/g, "");
  
  // If starts with country code pattern, extract it
  if (digits.length > 10) {
    // Check for common country codes
    for (const cc of countryCodes) {
      if (digits.startsWith(cc.code) && digits.length === cc.code.length + 10) {
        return {
          countryCode: cc.code,
          phoneNumber: formatPhoneNumber(digits.slice(cc.code.length))
        };
      }
    }
    // Default: assume first 1-3 digits are country code if > 10 digits
    const countryCodeLength = digits.length - 10;
    return {
      countryCode: digits.slice(0, countryCodeLength),
      phoneNumber: formatPhoneNumber(digits.slice(countryCodeLength))
    };
  }
  
  // Just a 10-digit number, assume US
  return {
    countryCode: "1",
    phoneNumber: formatPhoneNumber(digits)
  };
}

// Combine country code and phone number
export function combinePhoneNumber(countryCode: string, phoneNumber: string): string {
  const digits = extractPhoneDigits(phoneNumber);
  if (!digits) return "";
  return `+${countryCode}${digits}`;
}

// Validate phone number (must have 10 digits)
export function isValidPhoneNumber(phoneNumber: string): boolean {
  const digits = extractPhoneDigits(phoneNumber);
  return digits.length === 10;
}

interface PhoneInputProps {
  value: string;
  onChange: (fullPhone: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  showCountryCode?: boolean;
}

export function PhoneInput({
  value,
  onChange,
  onBlur,
  placeholder = "(555) 123-4567",
  className,
  disabled,
  required,
  id,
  showCountryCode = true,
}: PhoneInputProps) {
  const { countryCode, phoneNumber } = parsePhoneNumber(value);
  const [localCountryCode, setLocalCountryCode] = React.useState(countryCode);
  const [localPhoneNumber, setLocalPhoneNumber] = React.useState(phoneNumber);
  const isUserInputRef = React.useRef(false);

  // Update local state when value prop changes (but not during user input)
  React.useEffect(() => {
    if (isUserInputRef.current) {
      isUserInputRef.current = false;
      return;
    }
    const parsed = parsePhoneNumber(value);
    setLocalCountryCode(parsed.countryCode);
    setLocalPhoneNumber(parsed.phoneNumber);
  }, [value]);

  const handleCountryCodeChange = (newCode: string) => {
    isUserInputRef.current = true;
    setLocalCountryCode(newCode);
    onChange(combinePhoneNumber(newCode, localPhoneNumber));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isUserInputRef.current = true;
    const rawValue = e.target.value;
    const formatted = formatPhoneNumber(rawValue);
    setLocalPhoneNumber(formatted);
    onChange(combinePhoneNumber(localCountryCode, formatted));
  };

  return (
    <div className={cn("flex gap-2", className)}>
      {showCountryCode && (
        <Select value={localCountryCode} onValueChange={handleCountryCodeChange} disabled={disabled}>
          <SelectTrigger className="w-[100px] flex-shrink-0">
            <SelectValue>
              {countryCodes.find(c => c.code === localCountryCode)?.flag || "🌐"} +{localCountryCode}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {countryCodes.map((cc) => (
              <SelectItem key={cc.code} value={cc.code}>
                {cc.flag} +{cc.code} ({cc.country})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Input
        id={id}
        type="tel"
        autoComplete="tel"
        value={localPhoneNumber}
        onChange={handlePhoneChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className="flex-1"
      />
    </div>
  );
}

// Simple phone input without country code (for backwards compatibility)
interface SimplePhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

export function SimplePhoneInput({
  value,
  onChange,
  onBlur,
  placeholder = "(555) 123-4567",
  className,
  disabled,
  required,
  id,
}: SimplePhoneInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    onChange(formatted);
  };

  // Format the initial value if it's just digits
  const displayValue = React.useMemo(() => {
    if (!value) return "";
    // If already formatted, return as-is
    if (value.includes("(") || value.includes("-")) return value;
    // Otherwise format it
    return formatPhoneNumber(value);
  }, [value]);

  return (
    <Input
      id={id}
      type="tel"
      autoComplete="tel"
      value={displayValue}
      onChange={handleChange}
      onBlur={onBlur}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      className={className}
    />
  );
}
