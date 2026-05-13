import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import { MapPin, Loader2, CheckCircle } from "lucide-react";

// Google Places API types are declared in AddressAutocomplete.tsx

interface AddressComponents {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  countryCode: string;
}

interface AddressAutocompleteProps {
  value?: string;
  onChange?: (value: string) => void;
  onAddressSelect?: (address: AddressComponents) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  showVerifiedBadge?: boolean; // Show verified badge when address is selected from autocomplete
  countryCode?: string; // Restrict to specific country (e.g., "us", "ca", "gb")
}

// Load Google Places script once
let googleScriptLoaded = false;
let googleScriptLoading = false;
const loadCallbacks: (() => void)[] = [];

const loadGooglePlacesScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (googleScriptLoaded && window.google?.maps?.places) {
      resolve();
      return;
    }

    loadCallbacks.push(resolve);

    if (googleScriptLoading) {
      return;
    }

    googleScriptLoading = true;

    // Timeout after 10 seconds to prevent infinite loading
    const timeout = setTimeout(() => {
      console.error('[AddressAutocomplete] Google Places script load timed out after 10s');
      googleScriptLoading = false;
      loadCallbacks.forEach(cb => cb());
      loadCallbacks.length = 0;
    }, 10000);

    window.initGooglePlaces = () => {
      clearTimeout(timeout);
      googleScriptLoaded = true;
      googleScriptLoading = false;
      loadCallbacks.forEach(cb => cb());
      loadCallbacks.length = 0;
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      clearTimeout(timeout);
      console.error('[AddressAutocomplete] Failed to load Google Places script');
      googleScriptLoading = false;
      loadCallbacks.forEach(cb => cb());
      loadCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
};

// Map country codes to full names
const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  AU: "Australia",
  MX: "Mexico",
  DE: "Germany",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  NL: "Netherlands",
  BE: "Belgium",
  CH: "Switzerland",
  AT: "Austria",
  NZ: "New Zealand",
  IE: "Ireland",
  JP: "Japan",
  SG: "Singapore",
  HK: "Hong Kong",
  KR: "South Korea",
  BR: "Brazil",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colombia",
  IN: "India",
  PH: "Philippines",
  TH: "Thailand",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  IL: "Israel",
  ZA: "South Africa",
};

export function AddressAutocomplete({
  value = "",
  onChange,
  onAddressSelect,
  placeholder = "Start typing your address...",
  className,
  disabled = false,
  id,
  showVerifiedBadge = true,
  countryCode,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isVerified, setIsVerified] = useState(false); // Track if address was selected from autocomplete
  
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get API key from environment
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

  // Initialize Google Places
  useEffect(() => {
    if (!apiKey) {
      console.warn("Google Places API key not configured. Address autocomplete disabled.");
      setIsReady(true); // Still allow manual input
      return;
    }

    loadGooglePlacesScript(apiKey).then(() => {
      if (!window.google?.maps?.places) {
        console.warn('[AddressAutocomplete] Google Places API not available after script load. Address autocomplete disabled.');
        setIsReady(true); // Allow manual input
        return;
      }
      try {
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
        
        // Create a dummy div for PlacesService (required by API)
        const dummyDiv = document.createElement("div");
        placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv);
        
        // Create session token for billing optimization
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      } catch (error) {
        console.error('[AddressAutocomplete] Failed to initialize Google Places services:', error);
      }
      setIsReady(true);
    }).catch((error) => {
      console.error('[AddressAutocomplete] Failed to load Google Places script:', error);
      setIsReady(true); // Allow manual input
    });
  }, [apiKey]);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Fetch suggestions
  const fetchSuggestions = useCallback((input: string) => {
    if (!autocompleteServiceRef.current || !input.trim() || input.length < 3) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Safety timeout - clear loading after 8 seconds if no response
    const safetyTimeout = setTimeout(() => {
      console.warn('[AddressAutocomplete] Suggestion fetch timed out');
      setIsLoading(false);
      setSuggestions([]);
    }, 8000);

    // Build request with optional country restriction
    const request: google.maps.places.AutocompletionRequest = {
      input,
      types: ["address"],
      sessionToken: sessionTokenRef.current!,
    };

    // Add country restriction if specified
    if (countryCode) {
      request.componentRestrictions = { country: countryCode.toLowerCase() };
    }

    try {
      autocompleteServiceRef.current.getPlacePredictions(
        request,
        (predictions, status) => {
          clearTimeout(safetyTimeout);
          setIsLoading(false);
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
          }
        }
      );
    } catch (error) {
      clearTimeout(safetyTimeout);
      console.error('[AddressAutocomplete] Error fetching suggestions:', error);
      setIsLoading(false);
      setSuggestions([]);
    }
  }, [countryCode]);

  // Debounce input
  useEffect(() => {
    if (!apiKey) return;
    
    const timer = setTimeout(() => {
      fetchSuggestions(inputValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, fetchSuggestions, apiKey]);

  // Parse address components from place details
  const parseAddressComponents = (place: google.maps.places.PlaceResult): AddressComponents => {
    const components: AddressComponents = {
      street: "",
      city: "",
      state: "",
      zip: "",
      country: "United States",
      countryCode: "US",
    };

    let streetNumber = "";
    let streetName = "";

    place.address_components?.forEach((component) => {
      const types = component.types;

      if (types.includes("street_number")) {
        streetNumber = component.long_name;
      }
      if (types.includes("route")) {
        streetName = component.long_name;
      }
      if (types.includes("locality") || types.includes("sublocality") || types.includes("postal_town")) {
        components.city = component.long_name;
      }
      if (types.includes("administrative_area_level_1")) {
        components.state = component.short_name; // Use abbreviation (CA, NY, ON, etc.)
      }
      if (types.includes("postal_code")) {
        components.zip = component.long_name;
      }
      if (types.includes("country")) {
        components.country = component.long_name;
        components.countryCode = component.short_name;
      }
    });

    components.street = `${streetNumber} ${streetName}`.trim();

    return components;
  };

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback((prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesServiceRef.current) {
      console.error('[AddressAutocomplete] PlacesService not initialized');
      return;
    }

    console.log('[AddressAutocomplete] Selecting suggestion:', prediction.description);
    setIsLoading(true);
    setShowSuggestions(false);

    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["address_components", "formatted_address"],
        sessionToken: sessionTokenRef.current!,
      },
      (place, status) => {
        setIsLoading(false);
        console.log('[AddressAutocomplete] getDetails status:', status);

        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          const addressComponents = parseAddressComponents(place);
          console.log('[AddressAutocomplete] Parsed address:', addressComponents);
          
          // Update input with street address
          setInputValue(addressComponents.street);
          onChange?.(addressComponents.street);
          
          // Notify parent of full address - use setTimeout to ensure state updates propagate
          setTimeout(() => {
            onAddressSelect?.(addressComponents);
          }, 0);
          
          // Mark as verified since it came from Google Places
          setIsVerified(true);

          // Create new session token for next search
          sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        } else {
          console.error('[AddressAutocomplete] Failed to get place details:', status);
        }
      }
    );
  }, [onChange, onAddressSelect]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(newValue);
    setSelectedIndex(-1);
    // Clear verified status when user manually edits
    setIsVerified(false);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pl-10 pr-10", className)}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
        {!isLoading && isVerified && showVerifiedBadge && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
        )}
      </div>
      
      {/* Verified address indicator */}
      {isVerified && showVerifiedBadge && (
        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Address verified via Google Places
        </p>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              type="button"
              className={cn(
                "w-full px-4 py-3 text-left text-sm hover:bg-gray-100 flex items-start gap-3 border-b border-gray-100 last:border-b-0",
                index === selectedIndex && "bg-gray-100"
              )}
              onClick={() => handleSelectSuggestion(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-gray-900">
                  {suggestion.structured_formatting.main_text}
                </div>
                <div className="text-gray-500 text-xs">
                  {suggestion.structured_formatting.secondary_text}
                </div>
              </div>
            </button>
          ))}
          <div className="px-4 py-2 text-xs text-gray-400 bg-gray-50 flex items-center gap-1">
            <img 
              src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png" 
              alt="Powered by Google" 
              className="h-3"
            />
          </div>
        </div>
      )}

      {/* No API key fallback message */}
      {!apiKey && isReady && (
        <p className="text-xs text-gray-400 mt-1">
          Address autocomplete not available. Please enter your address manually.
        </p>
      )}
    </div>
  );
}

export type { AddressComponents };
