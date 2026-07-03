import { useAuth } from "@/_core/hooks/useAuth";
import { formatDateMT } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, User, Bell, Shield, LogOut, Copy, Check, Rocket, Phone, MessageSquare, MapPin, Plus, Trash2, Edit, Home, Briefcase, Star, Key, Monitor, Smartphone, Laptop, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CountrySelect, getStatesForCountry, getCountryByCode } from "@/components/ui/country-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { DashboardOnboardingWizard, OnboardingTriggerButton } from "@/components/DashboardOnboardingWizard";

/**
 * Inline toggle component for message email notification preference.
 * Uses the per-user email notification types system.
 */
function MessageNotificationToggle() {
  const emailPrefs = trpc.users.getEnabledEmailNotificationTypes.useQuery();
  const updateEmailTypes = trpc.users.updateEnabledEmailNotificationTypes.useMutation({
    onSuccess: () => {
      toast.success("Message notification preference updated");
      emailPrefs.refetch();
    },
    onError: () => {
      toast.error("Failed to update preference");
    },
  });

  const isEnabled = emailPrefs.data?.enabledTypes?.includes('new_message') ?? true;

  const handleToggle = (checked: boolean) => {
    if (!emailPrefs.data) return;
    let newTypes: string[];
    if (checked) {
      // Add new_message if not present
      newTypes = [...emailPrefs.data.enabledTypes, 'new_message'];
    } else {
      // Remove new_message
      newTypes = emailPrefs.data.enabledTypes.filter((t: string) => t !== 'new_message');
    }
    updateEmailTypes.mutate({ enabledTypes: newTypes });
  };

  return (
    <Switch
      checked={isEnabled}
      onCheckedChange={handleToggle}
      disabled={emailPrefs.isLoading || updateEmailTypes.isPending}
    />
  );
}

export default function Account() {
  const { user, logout, loading, refresh } = useAuth();
  const [, setLocation] = useLocation();

  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Check onboarding status
  const onboardingStatus = trpc.onboarding.getUserStatus.useQuery(undefined, {
    enabled: !!user,
  });
  
  const completeOnboarding = trpc.onboarding.complete.useMutation({
    onSuccess: () => {
      onboardingStatus.refetch();
    },
  });
  
  const updateLastViewed = trpc.onboarding.updateLastViewed.useMutation();
  
  // Show onboarding for first-time users
  useEffect(() => {
    if (user && onboardingStatus.data && !onboardingStatus.data.hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  }, [user, onboardingStatus.data]);
  
  const handleOnboardingComplete = (selectedOptionIds: number[]) => {
    completeOnboarding.mutate({ selectedOptionIds });
    updateLastViewed.mutate();
  };
  
  const [editingName, setEditingName] = useState(user?.name || "");
  const [isEditingName, setIsEditingName] = useState(false);
  
  const updateNameMutation = trpc.auth.updateName.useMutation({
    onSuccess: () => {
      toast.success("Name updated successfully");
      setIsEditingName(false);
      refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update name");
    },
  });
  
  // Sync editingName with user data
  useEffect(() => {
    if (user?.name) {
      setEditingName(user.name);
    }
  }, [user?.name]);
  
  const [phone, setPhone] = useState("");
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  
  // Load phone from user data
  useEffect(() => {
    if (user?.phone) {
      setPhone(user.phone);
    }
  }, [user?.phone]);
  
  const updateNotifications = trpc.users.updateNotificationPreference.useMutation({
    onSuccess: () => {
      toast.success("Notification preferences updated");
      // Refresh user data so the toggle updates visually
      refresh();
    },
    onError: () => {
      toast.error("Failed to update preferences");
    },
  });
  
  const updatePhone = trpc.users.updatePhone.useMutation({
    onSuccess: () => {
      toast.success("Phone number updated");
      setIsEditingPhone(false);
      refresh();
    },
    onError: () => {
      toast.error("Failed to update phone number");
    },
  });
  



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to access your account settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")} className="w-full">
              Go to Launchpad
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-white">My Account</h1>
          </div>
          <div className="flex items-center gap-2">
            <OnboardingTriggerButton onClick={() => setShowOnboarding(true)} />
            {user.role === 'admin' && (
              <Button
                variant="outline"
                onClick={() => setLocation("/admin")}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Admin Dashboard
              </Button>
            )}
          </div>
        </div>
      </header>
      
      {/* Onboarding Wizard */}
      <DashboardOnboardingWizard
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
      />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="space-y-6">
          {/* Personalized Action Plan Section - Based on Onboarding Selections */}
          {onboardingStatus.data?.hasCompletedOnboarding && onboardingStatus.data?.selectedOptions && onboardingStatus.data.selectedOptions.length > 0 && (
            <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Rocket className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                      <CardTitle className="text-white">Your Action Plan</CardTitle>
                      <CardDescription className="text-slate-400">Based on your selected goals</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOnboarding(true)}
                    className="text-amber-500 hover:text-amber-400"
                  >
                    Update Goals
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {onboardingStatus.data.selectedOptions.map((option: any, index: number) => (
                  <div 
                    key={option.id} 
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-amber-500/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-sm font-medium text-amber-500">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-white">{option.title}</p>
                        {option.ctaText && (
                          <p className="text-sm text-slate-400 line-clamp-1">{option.ctaText}</p>
                        )}
                      </div>
                    </div>
                    {option.linkUrl && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                        onClick={() => {
                          if (option.linkType === "external") {
                            window.open(option.linkUrl, "_blank");
                          } else {
                            window.location.href = option.linkUrl;
                          }
                        }}
                      >
                        Go
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          
          {/* Profile Section */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <User className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-white">Profile Information</CardTitle>
                  <CardDescription className="text-slate-400">Your account details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-slate-300">Name</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      disabled={!isEditingName}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                    {isEditingName ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => {
                            if (editingName.trim()) {
                              updateNameMutation.mutate({ name: editingName.trim() });
                            }
                          }}
                          disabled={updateNameMutation.isPending || !editingName.trim()}
                          className="bg-amber-500 hover:bg-amber-600"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setIsEditingName(false); setEditingName(user.name || ""); }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditingName(true)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Email</Label>
                  <Input
                    value={user.email || ""}
                    disabled
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                  <p className="text-xs text-slate-500">Email cannot be changed. Contact support if needed.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Phone Number Section */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Phone className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-white">Phone Number</CardTitle>
                  <CardDescription className="text-slate-400">For shipping and delivery updates</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <PhoneInput
                    value={phone}
                    onChange={(value) => setPhone(value)}
                    disabled={!isEditingPhone}
                    showCountryCode={true}
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
                {isEditingPhone ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPhone(user.phone || "");
                        setIsEditingPhone(false);
                      }}
                      className="border-slate-600"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updatePhone.mutate({ phone })}
                      disabled={updatePhone.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {updatePhone.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingPhone(true)}
                    className="border-slate-600"
                  >
                    {user.phone ? "Edit" : "Add"}
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Your phone number is used for shipping notifications and important updates.
              </p>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Bell className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-white">Notification Preferences</CardTitle>
                  <CardDescription className="text-slate-400">Manage how you receive updates</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-white">Email Notifications</Label>
                  <p className="text-sm text-slate-400">
                    Receive email updates about your protocols and coaching
                  </p>
                </div>
                <Switch
                  checked={user.receiveNotifications || false}
                  onCheckedChange={(checked) => {
                    updateNotifications.mutate({ userId: user.id, receiveNotifications: checked });
                  }}
                />
              </div>
              <Separator className="bg-slate-700" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-white flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-amber-500" />
                    Message Email Alerts
                  </Label>
                  <p className="text-sm text-slate-400">
                    Get an email when your coach sends you a new message
                  </p>
                </div>
                <MessageNotificationToggle />
              </div>
            </CardContent>
          </Card>



          {/* Saved Addresses */}
          <SavedAddressesSection />

          {/* Password & Security */}
          <PasswordSecuritySection />

          {/* Active Sessions */}
          <SessionManagementSection />

          {/* Account Status */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-white">Account Status</CardTitle>
                  <CardDescription className="text-slate-400">Your membership details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                <div>
                  <p className="text-white font-medium">Account Type</p>
                  <p className="text-sm text-slate-400">
                    {user.role === 'admin' ? 'Administrator' : 'Member'}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  user.role === 'admin' 
                    ? 'bg-amber-500/20 text-amber-500' 
                    : 'bg-blue-500/20 text-blue-500'
                }`}>
                  {user.role === 'admin' ? 'Admin' : 'Active'}
                </span>
              </div>
              <div className="text-sm text-slate-400">
                <p>Member since: {formatDateMT(user.createdAt)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Sign Out */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <Button
                variant="destructive"
                onClick={logout}
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


// Saved Addresses Section Component
function SavedAddressesSection() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  
  // Form state
  const [label, setLabel] = useState("Home");
  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [street2, setStreet2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("United States");
  const [countryCode, setCountryCode] = useState("US");
  const [phone, setPhone] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  
  const utils = trpc.useUtils();
  const { data: addresses, isLoading } = trpc.savedAddresses.list.useQuery();
  
  const createMutation = trpc.savedAddresses.create.useMutation({
    onSuccess: () => {
      toast.success("Address saved successfully");
      setIsAddOpen(false);
      resetForm();
      utils.savedAddresses.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const updateMutation = trpc.savedAddresses.update.useMutation({
    onSuccess: () => {
      toast.success("Address updated successfully");
      setIsEditOpen(false);
      setSelectedAddress(null);
      utils.savedAddresses.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const deleteMutation = trpc.savedAddresses.delete.useMutation({
    onSuccess: () => {
      toast.success("Address deleted");
      utils.savedAddresses.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const setDefaultMutation = trpc.savedAddresses.setDefault.useMutation({
    onSuccess: () => {
      toast.success("Default address updated");
      utils.savedAddresses.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const resetForm = () => {
    setLabel("Home");
    setName("");
    setStreet("");
    setStreet2("");
    setCity("");
    setState("");
    setZip("");
    setCountry("United States");
    setCountryCode("US");
    setPhone("");
    setIsDefault(false);
  };
  
  const handleCreate = () => {
    createMutation.mutate({
      label,
      name,
      street,
      street2: street2 || undefined,
      city,
      state,
      zip,
      country,
      countryCode,
      phone: phone || undefined,
      isDefault,
    });
  };
  
  const handleUpdate = () => {
    if (!selectedAddress) return;
    updateMutation.mutate({
      id: selectedAddress.id,
      label,
      name,
      street,
      street2: street2 || undefined,
      city,
      state,
      zip,
      country,
      countryCode,
      phone: phone || undefined,
      isDefault,
    });
  };
  
  const openEditDialog = (address: any) => {
    setSelectedAddress(address);
    setLabel(address.label);
    setName(address.name);
    setStreet(address.street);
    setStreet2(address.street2 || "");
    setCity(address.city);
    setState(address.state);
    setZip(address.zip);
    setCountry(address.country);
    setCountryCode(address.countryCode);
    setPhone(address.phone || "");
    setIsDefault(address.isDefault);
    setIsEditOpen(true);
  };
  
  const getLabelIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case "home": return <Home className="h-4 w-4" />;
      case "work": return <Briefcase className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };
  
  const stateOptions = getStatesForCountry(countryCode);

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-white">Saved Addresses</CardTitle>
              <CardDescription className="text-slate-400">Manage your shipping addresses</CardDescription>
            </div>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Address</DialogTitle>
                <DialogDescription>Save an address for faster checkout</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Select value={label} onValueChange={setLabel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Home">Home</SelectItem>
                        <SelectItem value="Work">Work</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Street Address</Label>
                  <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="123 Main St" />
                </div>
                <div className="space-y-2">
                  <Label>Apt, Suite, etc. (optional)</Label>
                  <Input value={street2} onChange={(e) => setStreet2(e.target.value)} placeholder="Apt 4B" />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <CountrySelect
                    value={countryCode}
                    onChange={(code: string) => {
                      setCountryCode(code);
                      const countryObj = getCountryByCode(code);
                      setCountry(countryObj?.name || code);
                      setState("");
                    }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                  </div>
                  <div className="space-y-2">
                    <Label>State/Province</Label>
                    {stateOptions.length > 0 ? (
                      <Select value={state} onValueChange={setState}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {stateOptions.map((s) => (
                            <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP/Postal</Label>
                    <Input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="12345" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phone (optional)</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555-123-4567" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={isDefault} onCheckedChange={setIsDefault} />
                  <Label>Set as default address</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!name || !street || !city || !state || !zip || createMutation.isPending}>
                  {createMutation.isPending ? "Saving..." : "Save Address"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="text-center py-4 text-slate-400">Loading addresses...</div>
        ) : !addresses || addresses.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No saved addresses yet</p>
            <p className="text-sm">Add an address for faster checkout</p>
          </div>
        ) : (
          addresses.map((address: any) => (
            <div
              key={address.id}
              className={`p-4 rounded-lg border ${
                address.isDefault 
                  ? "bg-amber-500/10 border-amber-500/30" 
                  : "bg-slate-700/30 border-slate-600"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${address.isDefault ? "bg-amber-500/20 text-amber-500" : "bg-slate-600 text-slate-300"}`}>
                    {getLabelIcon(address.label)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{address.label}</span>
                      {address.isDefault && (
                        <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-300 mt-1">{address.name}</p>
                    <p className="text-sm text-slate-400">{address.street}</p>
                    {address.street2 && <p className="text-sm text-slate-400">{address.street2}</p>}
                    <p className="text-sm text-slate-400">
                      {address.city}, {address.state} {address.zip}
                    </p>
                    <p className="text-sm text-slate-500">{address.country}</p>
                    {address.phone && <p className="text-sm text-slate-500 mt-1">{address.phone}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!address.isDefault && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-amber-500"
                      onClick={() => setDefaultMutation.mutate({ id: address.id })}
                      title="Set as default"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-white"
                    onClick={() => openEditDialog(address)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-red-500"
                    onClick={() => {
                      if (confirm("Delete this address?")) {
                        deleteMutation.mutate({ id: address.id });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
      
      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Address</DialogTitle>
            <DialogDescription>Update your saved address</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Label</Label>
                <Select value={label} onValueChange={setLabel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Home">Home</SelectItem>
                    <SelectItem value="Work">Work</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Street Address</Label>
              <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="123 Main St" />
            </div>
            <div className="space-y-2">
              <Label>Apt, Suite, etc. (optional)</Label>
              <Input value={street2} onChange={(e) => setStreet2(e.target.value)} placeholder="Apt 4B" />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <CountrySelect
                value={countryCode}
                onChange={(code: string) => {
                  setCountryCode(code);
                  const countryObj = getCountryByCode(code);
                  setCountry(countryObj?.name || code);
                  setState("");
                }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
              </div>
              <div className="space-y-2">
                <Label>State/Province</Label>
                {stateOptions.length > 0 ? (
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {stateOptions.map((s) => (
                        <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" />
                )}
              </div>
              <div className="space-y-2">
                <Label>ZIP/Postal</Label>
                <Input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="12345" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone (optional)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555-123-4567" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
              <Label>Set as default address</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={!name || !street || !city || !state || !zip || updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}


// Password & Security Section Component
function PasswordSecuritySection() {
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully");
      setIsChangePasswordOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to change password");
    },
  });
  
  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };
  
  // Password strength calculation
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    if (password.length >= 12) strength++;
    return strength;
  };
  
  const passwordStrength = getPasswordStrength(newPassword);
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"];
  
  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (passwordStrength < 3) {
      toast.error("Please choose a stronger password");
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  };
  
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <Key className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <CardTitle className="text-white">Password & Security</CardTitle>
            <CardDescription className="text-slate-400">Manage your password</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
              <Key className="h-4 w-4 mr-2" />
              Change Password
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>Enter your current password and choose a new one</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? "Hide" : "Show"}
                  </Button>
                </div>
                
                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="space-y-2 mt-2">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full ${
                            i < passwordStrength ? strengthColors[passwordStrength - 1] : "bg-slate-600"
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs ${
                      passwordStrength < 2 ? "text-red-400" : 
                      passwordStrength < 3 ? "text-yellow-400" : 
                      passwordStrength < 4 ? "text-blue-400" : "text-green-400"
                    }`}>
                      {strengthLabels[passwordStrength - 1] || "Too weak"}
                    </p>
                    
                    {/* Requirements Checklist */}
                    <div className="space-y-1 text-xs">
                      <div className={`flex items-center gap-2 ${newPassword.length >= 8 ? "text-green-400" : "text-slate-500"}`}>
                        {newPassword.length >= 8 ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        At least 8 characters
                      </div>
                      <div className={`flex items-center gap-2 ${/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) ? "text-green-400" : "text-slate-500"}`}>
                        {/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        Mix of uppercase and lowercase
                      </div>
                      <div className={`flex items-center gap-2 ${/\d/.test(newPassword) ? "text-green-400" : "text-slate-500"}`}>
                        {/\d/.test(newPassword) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        At least one number
                      </div>
                      <div className={`flex items-center gap-2 ${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? "text-green-400" : "text-slate-500"}`}>
                        {/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        At least one special character
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-400">Passwords do not match</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsChangePasswordOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button 
                onClick={handleChangePassword} 
                disabled={!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || passwordStrength < 3 || changePassword.isPending}
              >
                {changePassword.isPending ? "Changing..." : "Change Password"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Session Management Section Component
function SessionManagementSection() {
  const { data: sessions, isLoading, refetch } = trpc.auth.getSessions.useQuery();
  
  const revokeSession = trpc.auth.revokeSession.useMutation({
    onSuccess: () => {
      toast.success("Session revoked successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke session");
    },
  });
  
  const revokeAllOther = trpc.auth.revokeAllOtherSessions.useMutation({
    onSuccess: (data) => {
      toast.success(`Revoked ${data.count} other session(s)`);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke sessions");
    },
  });
  
  const getDeviceIcon = (deviceInfo: string | null) => {
    if (!deviceInfo) return <Monitor className="h-5 w-5" />;
    const info = deviceInfo.toLowerCase();
    if (info.includes("mobile") || info.includes("iphone") || info.includes("android")) {
      return <Smartphone className="h-5 w-5" />;
    }
    if (info.includes("tablet") || info.includes("ipad")) {
      return <Laptop className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };
  
  const parseDeviceInfo = (userAgent: string | null) => {
    if (!userAgent) return { browser: "Unknown", os: "Unknown" };
    
    let browser = "Unknown";
    let os = "Unknown";
    
    // Detect browser
    if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) browser = "Chrome";
    else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Edg")) browser = "Edge";
    else if (userAgent.includes("Opera") || userAgent.includes("OPR")) browser = "Opera";
    
    // Detect OS
    if (userAgent.includes("Windows")) os = "Windows";
    else if (userAgent.includes("Mac OS")) os = "macOS";
    else if (userAgent.includes("Linux")) os = "Linux";
    else if (userAgent.includes("Android")) os = "Android";
    else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";
    
    return { browser, os };
  };
  
  const formatLastActive = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };
  
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Monitor className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-white">Active Sessions</CardTitle>
              <CardDescription className="text-slate-400">Manage your logged-in devices</CardDescription>
            </div>
          </div>
          {sessions && sessions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => revokeAllOther.mutate()}
              disabled={revokeAllOther.isPending}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              {revokeAllOther.isPending ? "Revoking..." : "Sign out all other"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
          </div>
        ) : sessions && sessions.length > 0 ? (
          sessions.map((session) => {
            const { browser, os } = parseDeviceInfo(session.userAgent);
            const isCurrentSession = session.isCurrent;
            
            return (
              <div
                key={session.id}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  isCurrentSession ? "bg-green-500/10 border border-green-500/30" : "bg-slate-700/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${isCurrentSession ? "bg-green-500/20 text-green-500" : "bg-slate-600 text-slate-400"}`}>
                    {getDeviceIcon(session.deviceInfo)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{browser} on {os}</p>
                      {isCurrentSession && (
                        <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-500 rounded-full">
                          This device
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400">
                      {session.ipAddress || "Unknown location"} • {formatLastActive(session.lastActiveAt)}
                    </p>
                  </div>
                </div>
                {!isCurrentSession && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokeSession.mutate({ sessionId: session.id })}
                    disabled={revokeSession.isPending}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-center text-slate-400 py-4">No active sessions found</p>
        )}
      </CardContent>
    </Card>
  );
}
