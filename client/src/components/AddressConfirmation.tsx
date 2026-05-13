import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, CheckCircle, Edit2, AlertCircle, Globe, Truck } from 'lucide-react';
import { AddressAutocomplete, type AddressComponents } from '@/components/ui/address-autocomplete';
import { StateSelect, validateZipForState } from '@/components/ui/state-select';
import { CountrySelect, RegionSelect, getCountryByCode, getStatesForCountry, normalizeCountryCode } from '@/components/ui/country-select';

export interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  countryCode: string;
  phone?: string;
  isVerified?: boolean;
}

interface AddressConfirmationProps {
  address: ShippingAddress;
  onConfirm: (address: ShippingAddress) => void;
  onEdit?: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
  confirmButtonText?: string;
  showEditButton?: boolean;
  isEditing?: boolean;
  onAddressChange?: (address: ShippingAddress) => void;
}

export function AddressConfirmation({
  address,
  onConfirm,
  onEdit,
  onCancel,
  title = "Confirm Shipping Address",
  description = "Please verify your shipping address before completing your order.",
  confirmButtonText = "Confirm & Continue",
  showEditButton = true,
  isEditing = false,
  onAddressChange,
}: AddressConfirmationProps) {
  // Force edit mode if address is incomplete (missing required fields)
  const isAddressIncomplete = !address.street?.trim() || !address.city?.trim() || !address.state?.trim() || !address.zip?.trim() || !address.name?.trim() || !address.name?.includes(' ');
  const [editMode, setEditMode] = useState(isEditing || isAddressIncomplete);
  const [editedAddress, setEditedAddress] = useState<ShippingAddress>(address);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAddressVerified, setIsAddressVerified] = useState(address.isVerified || false);

  // Get country info for dynamic labels
  const countryCode = normalizeCountryCode(editedAddress.countryCode || editedAddress.country);
  const countryInfo = getCountryByCode(countryCode);
  const hasRegionDropdown = getStatesForCountry(countryCode).length > 0;

  const handleCountryChange = (newCountry: string) => {
    const newRegions = getStatesForCountry(newCountry);
    const currentStateValid = newRegions.some(r => 
      r.code === editedAddress.state.toUpperCase() || 
      r.name.toUpperCase() === editedAddress.state.toUpperCase()
    );
    
    const country = getCountryByCode(newCountry);
    setEditedAddress(prev => ({
      ...prev,
      countryCode: newCountry,
      country: country?.name || newCountry,
      state: currentStateValid ? prev.state : '',
    }));
    setIsAddressVerified(false);
  };

  const validateAddress = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!editedAddress.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (!editedAddress.name.trim().includes(' ')) {
      newErrors.name = 'Please enter your full name (first and last)';
    }
    if (!editedAddress.street.trim()) {
      newErrors.street = 'Street address is required';
    }
    if (!editedAddress.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!editedAddress.state.trim() && hasRegionDropdown) {
      newErrors.state = `${countryInfo?.stateLabel || 'State'} is required`;
    }
    if (!editedAddress.zip.trim()) {
      newErrors.zip = `${countryInfo?.postalLabel || 'ZIP code'} is required`;
    } else if (countryCode === 'US' && editedAddress.state && !validateZipForState(editedAddress.zip, editedAddress.state)) {
      newErrors.zip = `ZIP code doesn't match ${editedAddress.state}`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (editMode) {
      if (validateAddress()) {
        setEditMode(false);
        onConfirm(editedAddress);
      }
    } else {
      // In display mode, use the editedAddress (which has the latest data)
      const displayAddr = editedAddress;
      const hasRequiredFields = displayAddr.name?.trim()?.includes(' ') && displayAddr.street?.trim() && displayAddr.city?.trim() && displayAddr.state?.trim() && displayAddr.zip?.trim();
      if (!hasRequiredFields) {
        setEditMode(true);
        return;
      }
      onConfirm(displayAddr);
    }
  };

  const handleSaveEdit = () => {
    if (validateAddress()) {
      setEditMode(false);
      // Notify parent of the change if handler provided
      onAddressChange?.(editedAddress);
    }
  };

  const formatAddress = (addr: ShippingAddress) => {
    const parts = [
      addr.street,
      `${addr.city}, ${addr.state} ${addr.zip}`,
      addr.country !== 'United States' && addr.country !== 'USA' ? addr.country : null,
    ].filter(Boolean);
    return parts;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center pb-4">
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Truck className="h-6 w-6 text-amber-600" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!editMode ? (
          // Display mode - show formatted address (use editedAddress which has the latest data)
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">{editedAddress.name}</p>
                  {formatAddress(editedAddress).map((line, idx) => (
                    <p key={idx} className="text-gray-600 text-sm">{line}</p>
                  ))}
                  {editedAddress.phone && (
                    <p className="text-gray-500 text-sm mt-1">{editedAddress.phone}</p>
                  )}
                </div>
              </div>
              {(editedAddress.isVerified || isAddressVerified) && (
                <div className="flex items-center gap-1 text-green-600 text-xs bg-green-50 px-2 py-1 rounded">
                  <CheckCircle className="h-3 w-3" />
                  Verified
                </div>
              )}
            </div>
            
            {showEditButton && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => {
                  setEditMode(true);
                  onEdit?.();
                }}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Address
              </Button>
            )}
          </div>
        ) : (
          // Edit mode - show form
          <div className="space-y-4">
            <div>
              <Label htmlFor="addressName">Full Name *</Label>
              <Input
                id="addressName"
                value={editedAddress.name}
                onChange={(e) => setEditedAddress(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Full name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="addressCountry" className="flex items-center gap-2">
                <Globe className="h-3 w-3" />
                Country *
              </Label>
              <CountrySelect
                id="addressCountry"
                value={countryCode}
                onChange={handleCountryChange}
                placeholder="Select country"
              />
            </div>

            <div>
              <Label htmlFor="addressStreet">Street Address *</Label>
              <AddressAutocomplete
                id="addressStreet"
                value={editedAddress.street}
                onChange={(value) => {
                  setEditedAddress(prev => ({ ...prev, street: value }));
                  setIsAddressVerified(false);
                }}
                onAddressSelect={(addr: AddressComponents) => {
                  const newCountryCode = normalizeCountryCode(addr.countryCode || addr.country);
                  const country = getCountryByCode(newCountryCode);
                  setEditedAddress(prev => ({
                    ...prev,
                    street: addr.street,
                    city: addr.city,
                    state: addr.state,
                    zip: addr.zip,
                    country: country?.name || addr.country,
                    countryCode: newCountryCode,
                    isVerified: true,
                  }));
                  setIsAddressVerified(true);
                }}
                placeholder="Start typing your address..."
                className={errors.street ? 'border-red-500' : ''}
                countryCode={countryCode}
                showVerifiedBadge={isAddressVerified}
              />
              {errors.street && <p className="text-sm text-red-500 mt-1">{errors.street}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="addressCity">City *</Label>
                <Input
                  id="addressCity"
                  value={editedAddress.city}
                  onChange={(e) => setEditedAddress(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                  className={errors.city ? 'border-red-500' : ''}
                />
                {errors.city && <p className="text-sm text-red-500 mt-1">{errors.city}</p>}
              </div>
              <div>
                <Label htmlFor="addressState">{countryInfo?.stateLabel || 'State'} {hasRegionDropdown ? '*' : ''}</Label>
                {hasRegionDropdown ? (
                  countryCode === 'US' ? (
                    <StateSelect
                      id="addressState"
                      value={editedAddress.state}
                      onChange={(value) => setEditedAddress(prev => ({ ...prev, state: value }))}
                      placeholder={`Select ${countryInfo?.stateLabel?.toLowerCase() || 'state'}`}
                      className={errors.state ? 'border-red-500' : ''}
                    />
                  ) : (
                    <RegionSelect
                      id="addressState"
                      countryCode={countryCode}
                      value={editedAddress.state}
                      onChange={(value) => setEditedAddress(prev => ({ ...prev, state: value }))}
                      placeholder={`Select ${countryInfo?.stateLabel?.toLowerCase() || 'region'}`}
                      className={errors.state ? 'border-red-500' : ''}
                    />
                  )
                ) : (
                  <Input
                    id="addressState"
                    value={editedAddress.state}
                    onChange={(e) => setEditedAddress(prev => ({ ...prev, state: e.target.value }))}
                    placeholder={countryInfo?.stateLabel || 'State/Province'}
                    className={errors.state ? 'border-red-500' : ''}
                  />
                )}
                {errors.state && <p className="text-sm text-red-500 mt-1">{errors.state}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="addressZip">{countryInfo?.postalLabel || 'ZIP Code'} *</Label>
              <Input
                id="addressZip"
                value={editedAddress.zip}
                onChange={(e) => setEditedAddress(prev => ({ ...prev, zip: e.target.value }))}
                placeholder={countryInfo?.postalLabel || 'ZIP Code'}
                className={errors.zip ? 'border-red-500' : ''}
              />
              {errors.zip && <p className="text-sm text-red-500 mt-1">{errors.zip}</p>}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  // If we have a valid edited address, go back to display; otherwise cancel the whole flow
                  if (editedAddress.street?.trim()) {
                    setEditMode(false);
                    setErrors({});
                  } else {
                    onCancel?.();
                  }
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-600"
                onClick={handleSaveEdit}
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}

        {!editMode && (
          <div className="flex gap-2 pt-2">
            {onCancel && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={onCancel}
              >
                Back
              </Button>
            )}
            <Button
              className={`${onCancel ? 'flex-1' : 'w-full'} bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600`}
              onClick={handleConfirm}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {confirmButtonText}
            </Button>
          </div>
        )}

        {/* Address tip - only show if address is not verified and has content */}
        {!editMode && !editedAddress.isVerified && !isAddressVerified && editedAddress.street?.trim() && (
          <div className="flex items-start gap-2 text-xs text-gray-400 p-2">
            <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
            <p>Tip: Use address autocomplete for faster entry next time.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact inline address display for checkout summaries
export function AddressPreview({
  address,
  onEdit,
  showEditButton = true,
  compact = false,
}: {
  address: ShippingAddress;
  onEdit?: () => void;
  showEditButton?: boolean;
  compact?: boolean;
}) {
  const formatCompact = () => {
    return `${address.name}, ${address.street}, ${address.city}, ${address.state} ${address.zip}`;
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-700 truncate">
          <MapPin className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <span className="truncate">{formatCompact()}</span>
          {address.isVerified && (
            <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
          )}
        </div>
        {showEditButton && onEdit && (
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onEdit}>
            <Edit2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-gray-900">{address.name}</p>
            <p className="text-gray-600">{address.street}</p>
            <p className="text-gray-600">{address.city}, {address.state} {address.zip}</p>
            {address.country !== 'United States' && address.country !== 'USA' && (
              <p className="text-gray-600">{address.country}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {address.isVerified && (
            <div className="flex items-center gap-1 text-green-600 text-xs">
              <CheckCircle className="h-3 w-3" />
            </div>
          )}
          {showEditButton && onEdit && (
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onEdit}>
              <Edit2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
