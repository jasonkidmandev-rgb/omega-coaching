import { useState, useEffect, useRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Lock, User, MapPin, Phone, Mail, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { PhoneInput, extractPhoneDigits } from '@/components/ui/phone-input';
import { AddressAutocomplete, type AddressComponents } from '@/components/ui/address-autocomplete';
import { StateSelect, validateZipForState } from '@/components/ui/state-select';
import { CountrySelect, RegionSelect, getCountryByCode, getStatesForCountry, normalizeCountryCode } from '@/components/ui/country-select';

interface ProfileData {
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  shippingName: string | null;
  shippingStreet: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingZip: string | null;
  shippingCountry: string | null;
  shippingPhone: string | null;
}

interface ProfileCompletionGateProps {
  profile: ProfileData;
  onProfileComplete: (data: {
    clientPhone: string;
    shippingName: string;
    shippingStreet: string;
    shippingCity: string;
    shippingState: string;
    shippingZip: string;
    shippingCountry: string;
    shippingPhone: string;
  }) => Promise<void>;
  isUpdating?: boolean;
}

// Helper to split a full name into first and last
function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
}

// Helper to combine first and last name
function combineName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

export function ProfileCompletionGate({ profile, onProfileComplete, isUpdating }: ProfileCompletionGateProps) {
  const formRef = useRef<HTMLFormElement>(null);
  
  // Split the existing name into first/last
  const existingName = profile.shippingName || profile.clientName || '';
  const { firstName: initialFirst, lastName: initialLast } = splitName(existingName);
  
  // Normalize country code from existing data
  const initialCountryCode = normalizeCountryCode(profile.shippingCountry || 'US');
  
  const [formData, setFormData] = useState({
    clientPhone: profile.clientPhone || '',
    firstName: initialFirst,
    lastName: initialLast,
    shippingStreet: profile.shippingStreet || '',
    shippingCity: profile.shippingCity || '',
    shippingState: profile.shippingState || '',
    shippingZip: profile.shippingZip || '',
    shippingCountry: initialCountryCode,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rememberMe, setRememberMe] = useState(true);
  const [isAddressVerified, setIsAddressVerified] = useState(false);

  // Get country info for dynamic labels
  const countryInfo = getCountryByCode(formData.shippingCountry);
  const hasRegionDropdown = getStatesForCountry(formData.shippingCountry).length > 0;

  // Load saved profile data from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('omega_client_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        // Handle both old format (shippingName) and new format (firstName/lastName)
        let firstName = parsed.firstName || '';
        let lastName = parsed.lastName || '';
        if (!firstName && parsed.shippingName) {
          const split = splitName(parsed.shippingName);
          firstName = split.firstName;
          lastName = split.lastName;
        }
        const savedCountry = normalizeCountryCode(parsed.shippingCountry || 'US');
        setFormData(prev => ({
          ...prev,
          clientPhone: parsed.clientPhone || prev.clientPhone,
          firstName: firstName || prev.firstName,
          lastName: lastName || prev.lastName,
          shippingStreet: parsed.shippingStreet || prev.shippingStreet,
          shippingCity: parsed.shippingCity || prev.shippingCity,
          shippingState: parsed.shippingState || prev.shippingState,
          shippingZip: parsed.shippingZip || prev.shippingZip,
          shippingCountry: savedCountry,
        }));
      } catch (e) {
        console.error('Failed to parse saved profile:', e);
      }
    }
  }, []);

  // Handle browser autofill
  useEffect(() => {
    const checkAutofill = () => {
      if (!formRef.current) return;
      const inputs = formRef.current.querySelectorAll('input');
      inputs.forEach((input) => {
        const id = input.id as keyof typeof formData;
        if (id && input.value && input.value !== formData[id]) {
          setFormData(prev => ({ ...prev, [id]: input.value }));
        }
      });
    };

    checkAutofill();
    const timer = setTimeout(checkAutofill, 100);
    const timer2 = setTimeout(checkAutofill, 500);
    const timer3 = setTimeout(checkAutofill, 1000);

    const handleAnimationStart = (e: AnimationEvent) => {
      if (e.animationName === 'onAutoFillStart' || e.animationName.includes('auto')) {
        setTimeout(checkAutofill, 0);
      }
    };

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const id = target.id as keyof typeof formData;
      if (id && target.value) {
        setFormData(prev => ({ ...prev, [id]: target.value }));
      }
    };

    const form = formRef.current;
    if (form) {
      form.addEventListener('animationstart', handleAnimationStart as EventListener);
      form.addEventListener('input', handleInput);
    }

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      clearTimeout(timer3);
      if (form) {
        form.removeEventListener('animationstart', handleAnimationStart as EventListener);
        form.removeEventListener('input', handleInput);
      }
    };
  }, []);

  // Clear state when country changes (if state doesn't exist in new country)
  const handleCountryChange = (newCountry: string) => {
    const newRegions = getStatesForCountry(newCountry);
    const currentStateValid = newRegions.some(r => 
      r.code === formData.shippingState.toUpperCase() || 
      r.name.toUpperCase() === formData.shippingState.toUpperCase()
    );
    
    setFormData(prev => ({
      ...prev,
      shippingCountry: newCountry,
      // Clear state if it doesn't exist in the new country
      shippingState: currentStateValid ? prev.shippingState : '',
    }));
    
    // Clear address verification when country changes
    setIsAddressVerified(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get actual values from DOM as backup
    const getInputValue = (id: string): string => {
      const input = document.getElementById(id) as HTMLInputElement;
      return input?.value || '';
    };

    // Combine first and last name
    const fullName = combineName(
      getInputValue('firstName') || formData.firstName,
      getInputValue('lastName') || formData.lastName
    );

    // Get country name from code
    const country = getCountryByCode(formData.shippingCountry);
    const countryName = country?.name || formData.shippingCountry;

    const submissionData = {
      clientPhone: formData.clientPhone,
      shippingName: fullName,
      shippingStreet: getInputValue('shippingStreet') || formData.shippingStreet,
      shippingCity: getInputValue('shippingCity') || formData.shippingCity,
      shippingState: getInputValue('shippingState') || formData.shippingState,
      shippingZip: getInputValue('shippingZip') || formData.shippingZip,
      shippingCountry: countryName,
      shippingPhone: formData.clientPhone, // Use same phone for shipping
    };
    
    // Validate
    const newErrors: Record<string, string> = {};
    const phoneDigits = extractPhoneDigits(submissionData.clientPhone);
    if (!phoneDigits || phoneDigits.length < 10) {
      newErrors.clientPhone = 'Please enter a valid 10-digit phone number';
    }
    if (!fullName.trim() || !formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!submissionData.shippingStreet.trim()) {
      newErrors.shippingStreet = 'Street address is required';
    }
    if (!submissionData.shippingCity.trim()) {
      newErrors.shippingCity = 'City is required';
    }
    if (!submissionData.shippingState.trim() && hasRegionDropdown) {
      newErrors.shippingState = `${countryInfo?.stateLabel || 'State'} is required`;
    }
    if (!submissionData.shippingZip.trim()) {
      newErrors.shippingZip = `${countryInfo?.postalLabel || 'ZIP code'} is required`;
    } else if (formData.shippingCountry === 'US' && submissionData.shippingState && !validateZipForState(submissionData.shippingZip, submissionData.shippingState)) {
      newErrors.shippingZip = `ZIP code doesn't match ${submissionData.shippingState}`;
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Save to localStorage if Remember Me is checked
      if (rememberMe) {
        localStorage.setItem('omega_client_profile', JSON.stringify({
          ...submissionData,
          firstName: formData.firstName,
          lastName: formData.lastName,
          shippingCountry: formData.shippingCountry, // Save country code
        }));
      } else {
        localStorage.removeItem('omega_client_profile');
      }
      
      await onProfileComplete(submissionData);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  // Check what's missing - use extracted digits for phone check
  const missingFields = [];
  const existingPhoneDigits = extractPhoneDigits(profile.clientPhone || '');
  if (!existingPhoneDigits || existingPhoneDigits.length < 10) missingFields.push('Phone Number');
  if (!profile.shippingStreet) missingFields.push('Shipping Address');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-amber-600" />
          </div>
          <CardTitle className="text-xl">Complete Your Profile</CardTitle>
          <CardDescription className="text-base">
            Please provide your contact and shipping information to view pricing and checkout options.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* What's already complete */}
          <div className="mb-6 p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Already on file:
            </h4>
            <div className="space-y-1 text-sm text-green-700">
              <p className="flex items-center gap-2">
                <User className="h-3 w-3" /> {profile.clientName}
              </p>
              {profile.clientEmail && (
                <p className="flex items-center gap-2">
                  <Mail className="h-3 w-3" /> {profile.clientEmail}
                </p>
              )}
            </div>
          </div>

          {/* What's missing */}
          {missingFields.length > 0 && (
            <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Required information:
              </h4>
              <ul className="list-disc list-inside text-sm text-amber-700">
                {missingFields.map(field => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            <p className="text-xs text-muted-foreground bg-blue-50 p-2 rounded-md">
              💡 Tip: If you see autofill suggestions, click on them to fill the fields. Then click Save.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                Contact Information
              </h4>
              
              <div>
                <Label htmlFor="clientPhone">Phone Number *</Label>
                <PhoneInput
                  id="clientPhone"
                  value={formData.clientPhone}
                  onChange={(value) => setFormData(prev => ({ ...prev, clientPhone: value }))}
                  placeholder="(555) 123-4567"
                  showCountryCode={true}
                />
                {errors.clientPhone && (
                  <p className="text-sm text-red-500 mt-1">{errors.clientPhone}</p>
                )}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Shipping Address
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    autoComplete="given-name"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    onBlur={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    onInput={(e) => setFormData(prev => ({ ...prev, firstName: (e.target as HTMLInputElement).value }))}
                    placeholder="First name"
                    className={errors.firstName ? 'border-red-500' : ''}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    autoComplete="family-name"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    onBlur={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    onInput={(e) => setFormData(prev => ({ ...prev, lastName: (e.target as HTMLInputElement).value }))}
                    placeholder="Last name"
                    className={errors.lastName ? 'border-red-500' : ''}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Country Selection */}
              <div>
                <Label htmlFor="shippingCountry" className="flex items-center gap-2">
                  <Globe className="h-3 w-3" />
                  Country *
                </Label>
                <CountrySelect
                  id="shippingCountry"
                  value={formData.shippingCountry}
                  onChange={handleCountryChange}
                  placeholder="Select country"
                />
              </div>

              <div>
                <Label htmlFor="shippingStreet">Street Address *</Label>
                <AddressAutocomplete
                  id="shippingStreet"
                  value={formData.shippingStreet}
                  onChange={(value) => {
                    setFormData(prev => ({ ...prev, shippingStreet: value }));
                    setIsAddressVerified(false);
                  }}
                  onAddressSelect={(address: AddressComponents) => {
                    // Update country code if address returns a different country
                    const newCountryCode = normalizeCountryCode(address.countryCode || address.country);
                    setFormData(prev => ({
                      ...prev,
                      shippingStreet: address.street,
                      shippingCity: address.city,
                      shippingState: address.state,
                      shippingZip: address.zip,
                      shippingCountry: newCountryCode,
                    }));
                    setIsAddressVerified(true);
                  }}
                  placeholder="Start typing your address..."
                  className={errors.shippingStreet ? 'border-red-500' : ''}
                  countryCode={formData.shippingCountry}
                  showVerifiedBadge={isAddressVerified}
                />
                {errors.shippingStreet && (
                  <p className="text-sm text-red-500 mt-1">{errors.shippingStreet}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shippingCity">City *</Label>
                  <Input
                    id="shippingCity"
                    autoComplete="address-level2"
                    value={formData.shippingCity}
                    onChange={(e) => setFormData(prev => ({ ...prev, shippingCity: e.target.value }))}
                    onBlur={(e) => setFormData(prev => ({ ...prev, shippingCity: e.target.value }))}
                    onInput={(e) => setFormData(prev => ({ ...prev, shippingCity: (e.target as HTMLInputElement).value }))}
                    placeholder="City"
                    className={errors.shippingCity ? 'border-red-500' : ''}
                  />
                  {errors.shippingCity && (
                    <p className="text-sm text-red-500 mt-1">{errors.shippingCity}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="shippingState">{countryInfo?.stateLabel || 'State/Province'} {hasRegionDropdown ? '*' : ''}</Label>
                  {hasRegionDropdown ? (
                    formData.shippingCountry === 'US' ? (
                      <StateSelect
                        id="shippingState"
                        value={formData.shippingState}
                        onChange={(value) => setFormData(prev => ({ ...prev, shippingState: value }))}
                        placeholder={`Select ${countryInfo?.stateLabel?.toLowerCase() || 'state'}`}
                        className={errors.shippingState ? 'border-red-500' : ''}
                      />
                    ) : (
                      <RegionSelect
                        id="shippingState"
                        countryCode={formData.shippingCountry}
                        value={formData.shippingState}
                        onChange={(value) => setFormData(prev => ({ ...prev, shippingState: value }))}
                        placeholder={`Select ${countryInfo?.stateLabel?.toLowerCase() || 'region'}`}
                        className={errors.shippingState ? 'border-red-500' : ''}
                      />
                    )
                  ) : (
                    <Input
                      id="shippingState"
                      autoComplete="address-level1"
                      value={formData.shippingState}
                      onChange={(e) => setFormData(prev => ({ ...prev, shippingState: e.target.value }))}
                      placeholder={countryInfo?.stateLabel || 'State/Province'}
                      className={errors.shippingState ? 'border-red-500' : ''}
                    />
                  )}
                  {errors.shippingState && (
                    <p className="text-sm text-red-500 mt-1">{errors.shippingState}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="shippingZip">{countryInfo?.postalLabel || 'ZIP/Postal Code'} *</Label>
                <Input
                  id="shippingZip"
                  autoComplete="postal-code"
                  value={formData.shippingZip}
                  onChange={(e) => setFormData(prev => ({ ...prev, shippingZip: e.target.value }))}
                  onBlur={(e) => setFormData(prev => ({ ...prev, shippingZip: e.target.value }))}
                  onInput={(e) => setFormData(prev => ({ ...prev, shippingZip: (e.target as HTMLInputElement).value }))}
                  placeholder={countryInfo?.postalLabel || 'ZIP/Postal Code'}
                  className={errors.shippingZip ? 'border-red-500' : ''}
                />
                {errors.shippingZip && (
                  <p className="text-sm text-red-500 mt-1">{errors.shippingZip}</p>
                )}
              </div>
            </div>

            {/* Remember Me checkbox */}
            <div className="flex items-center space-x-2 mt-4">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
              />
              <label
                htmlFor="rememberMe"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Remember my information for future visits
              </label>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isUpdating}
            >
              {isUpdating ? 'Saving...' : 'Save & View Pricing'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to check if profile is complete
export function isProfileComplete(profile: ProfileData): boolean {
  // Extract digits from phone to validate properly
  const phoneDigits = (profile.clientPhone || '').replace(/\D/g, '');
  // Accept phone numbers with at least 10 digits (may have country code prefix)
  const hasValidPhone = phoneDigits.length >= 10;
  
  return !!(
    hasValidPhone &&
    profile.shippingStreet &&
    profile.shippingCity &&
    profile.shippingState &&
    profile.shippingZip
  );
}
