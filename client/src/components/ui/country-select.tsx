import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Countries with their states/provinces
export interface Country {
  code: string;
  name: string;
  hasStates: boolean;
  stateLabel: string; // "State", "Province", "County", etc.
  postalLabel: string; // "ZIP Code", "Postal Code", etc.
}

export const COUNTRIES: Country[] = [
  { code: "US", name: "United States", hasStates: true, stateLabel: "State", postalLabel: "ZIP Code" },
  { code: "CA", name: "Canada", hasStates: true, stateLabel: "Province", postalLabel: "Postal Code" },
  { code: "GB", name: "United Kingdom", hasStates: true, stateLabel: "County", postalLabel: "Postcode" },
  { code: "AU", name: "Australia", hasStates: true, stateLabel: "State/Territory", postalLabel: "Postcode" },
  { code: "MX", name: "Mexico", hasStates: true, stateLabel: "State", postalLabel: "Postal Code" },
  { code: "DE", name: "Germany", hasStates: true, stateLabel: "State", postalLabel: "Postal Code" },
  { code: "FR", name: "France", hasStates: false, stateLabel: "Region", postalLabel: "Postal Code" },
  { code: "IT", name: "Italy", hasStates: true, stateLabel: "Province", postalLabel: "Postal Code" },
  { code: "ES", name: "Spain", hasStates: true, stateLabel: "Province", postalLabel: "Postal Code" },
  { code: "NL", name: "Netherlands", hasStates: false, stateLabel: "Province", postalLabel: "Postal Code" },
  { code: "BE", name: "Belgium", hasStates: false, stateLabel: "Province", postalLabel: "Postal Code" },
  { code: "CH", name: "Switzerland", hasStates: true, stateLabel: "Canton", postalLabel: "Postal Code" },
  { code: "AT", name: "Austria", hasStates: true, stateLabel: "State", postalLabel: "Postal Code" },
  { code: "NZ", name: "New Zealand", hasStates: false, stateLabel: "Region", postalLabel: "Postcode" },
  { code: "IE", name: "Ireland", hasStates: false, stateLabel: "County", postalLabel: "Eircode" },
  { code: "JP", name: "Japan", hasStates: true, stateLabel: "Prefecture", postalLabel: "Postal Code" },
  { code: "SG", name: "Singapore", hasStates: false, stateLabel: "District", postalLabel: "Postal Code" },
  { code: "HK", name: "Hong Kong", hasStates: false, stateLabel: "District", postalLabel: "Postal Code" },
  { code: "KR", name: "South Korea", hasStates: true, stateLabel: "Province", postalLabel: "Postal Code" },
  { code: "BR", name: "Brazil", hasStates: true, stateLabel: "State", postalLabel: "CEP" },
  { code: "AR", name: "Argentina", hasStates: true, stateLabel: "Province", postalLabel: "Postal Code" },
  { code: "CL", name: "Chile", hasStates: true, stateLabel: "Region", postalLabel: "Postal Code" },
  { code: "CO", name: "Colombia", hasStates: true, stateLabel: "Department", postalLabel: "Postal Code" },
  { code: "IN", name: "India", hasStates: true, stateLabel: "State", postalLabel: "PIN Code" },
  { code: "PH", name: "Philippines", hasStates: true, stateLabel: "Province", postalLabel: "ZIP Code" },
  { code: "TH", name: "Thailand", hasStates: true, stateLabel: "Province", postalLabel: "Postal Code" },
  { code: "AE", name: "United Arab Emirates", hasStates: true, stateLabel: "Emirate", postalLabel: "Postal Code" },
  { code: "SA", name: "Saudi Arabia", hasStates: true, stateLabel: "Province", postalLabel: "Postal Code" },
  { code: "IL", name: "Israel", hasStates: false, stateLabel: "District", postalLabel: "Postal Code" },
  { code: "ZA", name: "South Africa", hasStates: true, stateLabel: "Province", postalLabel: "Postal Code" },
];

// US States
export const US_STATES = [
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

// Canadian Provinces
export const CA_PROVINCES = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
];

// UK Counties (main ones)
export const UK_COUNTIES = [
  { code: "ENG", name: "England" },
  { code: "SCT", name: "Scotland" },
  { code: "WLS", name: "Wales" },
  { code: "NIR", name: "Northern Ireland" },
  // Major English counties
  { code: "BKM", name: "Buckinghamshire" },
  { code: "CAM", name: "Cambridgeshire" },
  { code: "CHS", name: "Cheshire" },
  { code: "CON", name: "Cornwall" },
  { code: "CMA", name: "Cumbria" },
  { code: "DBY", name: "Derbyshire" },
  { code: "DEV", name: "Devon" },
  { code: "DOR", name: "Dorset" },
  { code: "DUR", name: "Durham" },
  { code: "ESS", name: "Essex" },
  { code: "GLS", name: "Gloucestershire" },
  { code: "HAM", name: "Hampshire" },
  { code: "HRT", name: "Hertfordshire" },
  { code: "KEN", name: "Kent" },
  { code: "LAN", name: "Lancashire" },
  { code: "LEC", name: "Leicestershire" },
  { code: "LIN", name: "Lincolnshire" },
  { code: "LND", name: "London" },
  { code: "NFK", name: "Norfolk" },
  { code: "NTH", name: "Northamptonshire" },
  { code: "NBL", name: "Northumberland" },
  { code: "NTT", name: "Nottinghamshire" },
  { code: "OXF", name: "Oxfordshire" },
  { code: "SOM", name: "Somerset" },
  { code: "STS", name: "Staffordshire" },
  { code: "SFK", name: "Suffolk" },
  { code: "SRY", name: "Surrey" },
  { code: "SSX", name: "Sussex" },
  { code: "WAR", name: "Warwickshire" },
  { code: "WOR", name: "Worcestershire" },
  { code: "YKS", name: "Yorkshire" },
];

// Australian States/Territories
export const AU_STATES = [
  { code: "ACT", name: "Australian Capital Territory" },
  { code: "NSW", name: "New South Wales" },
  { code: "NT", name: "Northern Territory" },
  { code: "QLD", name: "Queensland" },
  { code: "SA", name: "South Australia" },
  { code: "TAS", name: "Tasmania" },
  { code: "VIC", name: "Victoria" },
  { code: "WA", name: "Western Australia" },
];

// Mexican States
export const MX_STATES = [
  { code: "AGU", name: "Aguascalientes" },
  { code: "BCN", name: "Baja California" },
  { code: "BCS", name: "Baja California Sur" },
  { code: "CAM", name: "Campeche" },
  { code: "CHP", name: "Chiapas" },
  { code: "CHH", name: "Chihuahua" },
  { code: "CMX", name: "Ciudad de México" },
  { code: "COA", name: "Coahuila" },
  { code: "COL", name: "Colima" },
  { code: "DUR", name: "Durango" },
  { code: "GUA", name: "Guanajuato" },
  { code: "GRO", name: "Guerrero" },
  { code: "HID", name: "Hidalgo" },
  { code: "JAL", name: "Jalisco" },
  { code: "MEX", name: "México" },
  { code: "MIC", name: "Michoacán" },
  { code: "MOR", name: "Morelos" },
  { code: "NAY", name: "Nayarit" },
  { code: "NLE", name: "Nuevo León" },
  { code: "OAX", name: "Oaxaca" },
  { code: "PUE", name: "Puebla" },
  { code: "QUE", name: "Querétaro" },
  { code: "ROO", name: "Quintana Roo" },
  { code: "SLP", name: "San Luis Potosí" },
  { code: "SIN", name: "Sinaloa" },
  { code: "SON", name: "Sonora" },
  { code: "TAB", name: "Tabasco" },
  { code: "TAM", name: "Tamaulipas" },
  { code: "TLA", name: "Tlaxcala" },
  { code: "VER", name: "Veracruz" },
  { code: "YUC", name: "Yucatán" },
  { code: "ZAC", name: "Zacatecas" },
];

// German States
export const DE_STATES = [
  { code: "BW", name: "Baden-Württemberg" },
  { code: "BY", name: "Bavaria" },
  { code: "BE", name: "Berlin" },
  { code: "BB", name: "Brandenburg" },
  { code: "HB", name: "Bremen" },
  { code: "HH", name: "Hamburg" },
  { code: "HE", name: "Hesse" },
  { code: "NI", name: "Lower Saxony" },
  { code: "MV", name: "Mecklenburg-Vorpommern" },
  { code: "NW", name: "North Rhine-Westphalia" },
  { code: "RP", name: "Rhineland-Palatinate" },
  { code: "SL", name: "Saarland" },
  { code: "SN", name: "Saxony" },
  { code: "ST", name: "Saxony-Anhalt" },
  { code: "SH", name: "Schleswig-Holstein" },
  { code: "TH", name: "Thuringia" },
];

// Get states/provinces for a country
export function getStatesForCountry(countryCode: string): { code: string; name: string }[] {
  switch (countryCode) {
    case "US":
      return US_STATES;
    case "CA":
      return CA_PROVINCES;
    case "GB":
      return UK_COUNTIES;
    case "AU":
      return AU_STATES;
    case "MX":
      return MX_STATES;
    case "DE":
      return DE_STATES;
    default:
      return [];
  }
}

// Get country info by code
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code);
}

// Normalize country code from various formats
export function normalizeCountryCode(value: string): string {
  if (!value) return "US";
  const upper = value.toUpperCase().trim();
  
  // Check if it's already a valid code
  const byCode = COUNTRIES.find(c => c.code === upper);
  if (byCode) return byCode.code;
  
  // Check by name
  const byName = COUNTRIES.find(c => c.name.toUpperCase() === upper);
  if (byName) return byName.code;
  
  // Common aliases
  const aliases: Record<string, string> = {
    "USA": "US",
    "UNITED STATES": "US",
    "UNITED STATES OF AMERICA": "US",
    "AMERICA": "US",
    "CANADA": "CA",
    "UK": "GB",
    "GREAT BRITAIN": "GB",
    "ENGLAND": "GB",
    "AUSTRALIA": "AU",
    "MEXICO": "MX",
    "GERMANY": "DE",
    "DEUTSCHLAND": "DE",
    "FRANCE": "FR",
    "ITALY": "IT",
    "SPAIN": "ES",
    "JAPAN": "JP",
    "BRAZIL": "BR",
    "INDIA": "IN",
  };
  
  if (aliases[upper]) return aliases[upper];
  
  // Default to US
  return "US";
}

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function CountrySelect({
  value,
  onChange,
  placeholder = "Select country",
  disabled = false,
  className,
  id,
}: CountrySelectProps) {
  const normalizedValue = React.useMemo(() => normalizeCountryCode(value), [value]);

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
        {COUNTRIES.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            {country.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Dynamic state/province select based on country
interface RegionSelectProps {
  countryCode: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function RegionSelect({
  countryCode,
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  id,
}: RegionSelectProps) {
  const country = getCountryByCode(countryCode);
  const regions = getStatesForCountry(countryCode);
  
  // If country has no predefined regions, return a text input placeholder
  if (regions.length === 0) {
    return null; // Parent component should show text input instead
  }

  // Normalize value to region code
  const normalizedValue = React.useMemo(() => {
    if (!value) return "";
    const upperValue = value.toUpperCase().trim();
    const byCode = regions.find(r => r.code === upperValue);
    if (byCode) return byCode.code;
    const byName = regions.find(r => r.name.toUpperCase() === upperValue);
    if (byName) return byName.code;
    return "";
  }, [value, regions]);

  const defaultPlaceholder = placeholder || `Select ${country?.stateLabel || "region"}`;

  return (
    <Select
      value={normalizedValue}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger className={className} id={id}>
        <SelectValue placeholder={defaultPlaceholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {regions.map((region) => (
          <SelectItem key={region.code} value={region.code}>
            {region.name} ({region.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
