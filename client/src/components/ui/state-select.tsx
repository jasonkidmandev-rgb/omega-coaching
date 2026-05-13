import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// All 50 US states plus DC and territories
const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  // US Territories
  { code: "AS", name: "American Samoa" },
  { code: "GU", name: "Guam" },
  { code: "MP", name: "Northern Mariana Islands" },
  { code: "PR", name: "Puerto Rico" },
  { code: "VI", name: "U.S. Virgin Islands" },
];

interface StateSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function StateSelect({
  value,
  onChange,
  placeholder = "Select state",
  disabled = false,
  className,
  id,
}: StateSelectProps) {
  // Normalize value to state code (handle both code and full name)
  const normalizedValue = React.useMemo(() => {
    if (!value) return "";
    const upperValue = value.toUpperCase().trim();
    // Check if it's already a state code
    const byCode = US_STATES.find(s => s.code === upperValue);
    if (byCode) return byCode.code;
    // Check if it's a state name
    const byName = US_STATES.find(s => s.name.toUpperCase() === upperValue);
    if (byName) return byName.code;
    // Partial match
    const partial = US_STATES.find(s => 
      s.name.toUpperCase().includes(upperValue) || 
      s.code.includes(upperValue)
    );
    if (partial) return partial.code;
    return "";
  }, [value]);

  return (
    <Select
      value={normalizedValue}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger className={className} id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {US_STATES.map((state) => (
          <SelectItem key={state.code} value={state.code}>
            {state.name} ({state.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ZIP code ranges by state (first 3 digits)
const STATE_ZIP_RANGES: Record<string, [number, number][]> = {
  AL: [[350, 369]],
  AK: [[995, 999]],
  AZ: [[850, 865]],
  AR: [[716, 729]],
  CA: [[900, 961]],
  CO: [[800, 816]],
  CT: [[60, 69]],
  DE: [[197, 199]],
  DC: [[200, 205]],
  FL: [[320, 349]],
  GA: [[300, 319], [398, 399]],
  HI: [[967, 968]],
  ID: [[832, 838]],
  IL: [[600, 629]],
  IN: [[460, 479]],
  IA: [[500, 528]],
  KS: [[660, 679]],
  KY: [[400, 427]],
  LA: [[700, 714]],
  ME: [[39, 49]],
  MD: [[206, 219]],
  MA: [[10, 27]],
  MI: [[480, 499]],
  MN: [[550, 567]],
  MS: [[386, 397]],
  MO: [[630, 658]],
  MT: [[590, 599]],
  NE: [[680, 693]],
  NV: [[889, 898]],
  NH: [[30, 38]],
  NJ: [[70, 89]],
  NM: [[870, 884]],
  NY: [[100, 149]],
  NC: [[270, 289]],
  ND: [[580, 588]],
  OH: [[430, 459]],
  OK: [[730, 749]],
  OR: [[970, 979]],
  PA: [[150, 196]],
  RI: [[28, 29]],
  SC: [[290, 299]],
  SD: [[570, 577]],
  TN: [[370, 385]],
  TX: [[750, 799]],
  UT: [[840, 847]],
  VT: [[50, 59]],
  VA: [[220, 246]],
  WA: [[980, 994]],
  WV: [[247, 268]],
  WI: [[530, 549]],
  WY: [[820, 831]],
  // Territories
  AS: [[967, 967]],
  GU: [[969, 969]],
  MP: [[969, 969]],
  PR: [[6, 9]],
  VI: [[8, 8]],
};

// Validate if ZIP code matches the state
export function validateZipForState(zip: string, stateCode: string): boolean {
  if (!zip || !stateCode) return true; // Don't validate if either is missing
  
  const cleanZip = zip.replace(/\D/g, '');
  if (cleanZip.length < 3) return true; // Not enough digits to validate
  
  const zipPrefix = parseInt(cleanZip.substring(0, 3), 10);
  const ranges = STATE_ZIP_RANGES[stateCode.toUpperCase()];
  
  if (!ranges) return true; // Unknown state, skip validation
  
  return ranges.some(([min, max]) => zipPrefix >= min && zipPrefix <= max);
}

// Get state code from ZIP code
export function getStateFromZip(zip: string): string | null {
  const cleanZip = zip.replace(/\D/g, '');
  if (cleanZip.length < 3) return null;
  
  const zipPrefix = parseInt(cleanZip.substring(0, 3), 10);
  
  for (const [stateCode, ranges] of Object.entries(STATE_ZIP_RANGES)) {
    if (ranges.some(([min, max]) => zipPrefix >= min && zipPrefix <= max)) {
      return stateCode;
    }
  }
  
  return null;
}

// Export the states list for use elsewhere
export { US_STATES };
