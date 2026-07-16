import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'wouter';
import { goBackTo } from "@/hooks/useGoBack";
import { flagOn } from "@shared/flags";
import { trpc } from '@/lib/trpc';
import { ArrowLeft, ShoppingCart, Plus, Minus, Trash2, Tag, Package, AlertCircle, Heart, Search, CheckCircle, X, History, Truck, FolderOpen, ChevronDown } from 'lucide-react';
import { Link } from 'wouter';
import { StoreWaiver } from '@/components/StoreWaiver';
import StorePaymentSelector from '@/components/StorePaymentSelector';
import { AddressConfirmation, type ShippingAddress } from '@/components/AddressConfirmation';
import { getLoginUrl } from '@/const';

interface PricingTier {
  minQty: number;
  maxQty: number | null;
  pricePerUnit: number;
}

interface CartItem {
  id: number;
  name: string;
  price: number; // Base price in cents
  quantity: number;
  isDiscountable: boolean;
  maxQuantity: number;
  isDropship: boolean; // True if item is out of stock and will be dropshipped
  pricingTiers?: PricingTier[] | null; // Tiered/volume pricing
}

interface OrderConfirmation {
  show: boolean;
  items: CartItem[];
  total: number;
  discountAmount: number;
}

const DISCOUNT_RATE = 0.10; // 10% discount
const FLAT_SHIPPING_FEE = 1000; // $10.00 flat-rate shipping in cents

// Helper function to get the price per unit based on quantity and tiered pricing
function getTieredPrice(basePriceCents: number, quantity: number, pricingTiers?: PricingTier[] | null): number {
  if (!pricingTiers || pricingTiers.length === 0) {
    return basePriceCents;
  }
  
  // Sort tiers by minQty ascending
  const sortedTiers = [...pricingTiers].sort((a, b) => a.minQty - b.minQty);
  
  // Find the applicable tier
  for (let i = sortedTiers.length - 1; i >= 0; i--) {
    const tier = sortedTiers[i];
    if (quantity >= tier.minQty && (tier.maxQty === null || quantity <= tier.maxQty)) {
      return Math.round(tier.pricePerUnit * 100); // Convert to cents
    }
  }
  
  // Default to base price if no tier matches
  return basePriceCents;
}

export default function Order() {
  const [, setLocation] = useLocation();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAddressConfirmation, setShowAddressConfirmation] = useState(false);
  const [confirmedAddress, setConfirmedAddress] = useState<ShippingAddress | null>(null);
  const [orderConfirmation, setOrderConfirmation] = useState<OrderConfirmation>({ 
    show: false, 
    items: [], 
    total: 0, 
    discountAmount: 0 
  });

  // Check if user has signed the waiver
  const { data: waiverStatus, isLoading: waiverLoading, refetch: refetchWaiver } = trpc.waiver.check.useQuery();

  // Clear redirect tracking on successful auth - must be before any conditional returns
  useEffect(() => {
    if (waiverStatus && !waiverStatus.needsAuth) {
      sessionStorage.removeItem('store_login_redirect_count');
      sessionStorage.removeItem('store_login_redirect_time');
    }
  }, [waiverStatus]);

  const { data: inventoryData, isLoading } = trpc.inventory.publicList.useQuery();
  
  // Only show these 4 categories in the shop
  const ALLOWED_CATEGORIES = ['Limitless Tier 1', 'Bioregulators', 'Supplies & Misc', 'Troscriptions Troches'];
  // Only fetch favorites after waiver is signed to prevent auth redirect loop
  const { data: favorites, refetch: refetchFavorites } = trpc.inventory.getFavorites.useQuery(undefined, {
    enabled: !!waiverStatus?.hasSignedWaiver,
  });
  const addFavoriteMutation = trpc.inventory.addFavorite.useMutation({
    onSuccess: () => refetchFavorites(),
  });
  const removeFavoriteMutation = trpc.inventory.removeFavorite.useMutation({
    onSuccess: () => refetchFavorites(),
  });

  // Get favorite item IDs
  const favoriteIds = useMemo(() => {
    return new Set(favorites?.map(f => f.inventoryItemId) || []);
  }, [favorites]);

  // Filter items based on search, category, and favorites
  // Now includes out-of-stock items for dropship ordering
  const filteredItems = useMemo(() => {
    if (!inventoryData) return [];
    
    let items = inventoryData
      .filter(cat => ALLOWED_CATEGORIES.includes(cat.name) && flagOn((cat as any).isActive)) // Filter out inactive categories
      .flatMap(cat => 
        cat.items.filter(item => item.isActive && item.price) // Removed quantity > 0 filter to show all items
          .map(item => ({ 
            ...item, 
            categoryName: cat.name, 
            categoryId: cat.id,
            isOutOfStock: item.quantity <= 0, // Mark items as out of stock for dropship
          }))
      );

    // Search filter - enhanced to search by name, category, and SKU
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      items = items.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.categoryName.toLowerCase().includes(query) ||
        (item.sku && item.sku.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (selectedCategory) {
      items = items.filter(item => item.categoryId === selectedCategory);
    }

    // Favorites filter
    if (showFavoritesOnly) {
      items = items.filter(item => favoriteIds.has(item.id));
    }

    // Sort by category first, then alphabetically within category
    items.sort((a, b) => {
      // First sort by category order (based on ALLOWED_CATEGORIES order)
      const catOrderA = ALLOWED_CATEGORIES.indexOf(a.categoryName);
      const catOrderB = ALLOWED_CATEGORIES.indexOf(b.categoryName);
      if (catOrderA !== catOrderB) return catOrderA - catOrderB;
      // Then sort alphabetically by name within the same category
      return a.name.localeCompare(b.name);
    });

    return items;
  }, [inventoryData, searchQuery, selectedCategory, showFavoritesOnly, favoriteIds, ALLOWED_CATEGORIES]);

  // Calculate totals with tiered pricing support
  const { subtotal, discountableSubtotal, discountAmount, shippingFee, total } = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => {
      const pricePerUnit = getTieredPrice(item.price, item.quantity, item.pricingTiers);
      return sum + (pricePerUnit * item.quantity);
    }, 0);
    const discountableSubtotal = cart
      .filter(item => item.isDiscountable)
      .reduce((sum, item) => {
        const pricePerUnit = getTieredPrice(item.price, item.quantity, item.pricingTiers);
        return sum + (pricePerUnit * item.quantity);
      }, 0);
    const discountAmount = Math.round(discountableSubtotal * DISCOUNT_RATE);
    const shippingFee = cart.length > 0 ? FLAT_SHIPPING_FEE : 0;
    const total = subtotal - discountAmount + shippingFee;
    return { subtotal, discountableSubtotal, discountAmount, shippingFee, total };
  }, [cart]);

  const toggleFavorite = async (itemId: number) => {
    if (favoriteIds.has(itemId)) {
      await removeFavoriteMutation.mutateAsync({ inventoryItemId: itemId });
    } else {
      await addFavoriteMutation.mutateAsync({ inventoryItemId: itemId });
    }
  };

  const addToCart = (item: typeof filteredItems[0]) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        // Stock never limits how many can be ordered — overage is backordered.
        // Only the universal max applies.
        if (existing.quantity >= existing.maxQuantity) return prev;
        return prev.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        id: item.id,
        name: item.name,
        price: Math.round(parseFloat(item.price!) * 100), // Convert to cents
        quantity: 1,
        isDiscountable: !!item.isDiscountable,
        maxQuantity: 99, // Stock never caps the order — overage is backordered (ships later)
        isDropship: item.isOutOfStock,
        pricingTiers: item.pricingTiers as PricingTier[] | null | undefined,
      }];
    });
  };

  const updateQuantity = (itemId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const newQty = Math.max(1, Math.min(item.maxQuantity, item.quantity + delta));
      return { ...item, quantity: newQty };
    }));
  };

  const removeFromCart = (itemId: number) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  // Fetch user's default address for checkout
  const { data: savedAddresses } = trpc.savedAddresses.list.useQuery(undefined, {
    enabled: !!waiverStatus?.hasSignedWaiver,
  });
  
  // Fetch client profile for address fallback
  const { data: clientProfile } = trpc.auth.me.useQuery(undefined, {
    enabled: !!waiverStatus?.hasSignedWaiver,
  });
  
  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    // Get default address or first saved address
    const defaultAddress = savedAddresses?.find(a => a.isDefault) || savedAddresses?.[0];
    
    if (defaultAddress) {
      // Use saved address
      setConfirmedAddress({
        name: defaultAddress.name,
        street: defaultAddress.street,
        city: defaultAddress.city,
        state: defaultAddress.state,
        zip: defaultAddress.zip,
        country: defaultAddress.country,
        countryCode: defaultAddress.countryCode,
        phone: defaultAddress.phone || undefined,
        isVerified: defaultAddress.isVerified,
      });
    } else if (clientProfile) {
      // Fallback to client profile address
      const profile = clientProfile as any;
      // Use waiver name if profile name is incomplete (missing last name)
      const profileName = profile.name || '';
      const waiverName = waiverStatus?.waiver ? `${(waiverStatus.waiver as any).firstName || ''} ${(waiverStatus.waiver as any).lastName || ''}`.trim() : '';
      const bestName = (profileName.includes(' ') ? profileName : waiverName) || profileName;
      setConfirmedAddress({
        name: bestName,
        street: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        zip: profile.zip || '',
        country: 'United States',
        countryCode: 'US',
        phone: profile.phone || undefined,
        isVerified: false,
      });
    } else {
      // No address available, create empty one for editing
      // Try to get name from waiver if available
      const waiverName = waiverStatus?.waiver ? `${(waiverStatus.waiver as any).firstName || ''} ${(waiverStatus.waiver as any).lastName || ''}`.trim() : '';
      setConfirmedAddress({
        name: waiverName || '',
        street: '',
        city: '',
        state: '',
        zip: '',
        country: 'United States',
        countryCode: 'US',
        isVerified: false,
      });
    }
    
    setShowAddressConfirmation(true);
  };
  
  const handleAddressConfirmed = (address: ShippingAddress) => {
    setConfirmedAddress(address);
    setShowAddressConfirmation(false);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (method: "paypal" | "venmo", orderId?: string) => {
    setShowPaymentModal(false);
    setOrderConfirmation({
      show: true,
      items: [...cart],
      total,
      discountAmount,
    });
    setCart([]);
  };

  const closeConfirmation = () => {
    setOrderConfirmation({ show: false, items: [], total: 0, discountAmount: 0 });
  };

  // Show loading state
  if (isLoading || waiverLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  // Check for redirect loop
  const redirectCountKey = 'store_login_redirect_count';
  const redirectTimeKey = 'store_login_redirect_time';
  const currentCount = parseInt(sessionStorage.getItem(redirectCountKey) || '0');
  const lastRedirectTime = parseInt(sessionStorage.getItem(redirectTimeKey) || '0');
  const now = Date.now();
  
  // If more than 3 redirects in the last 30 seconds, show error
  if (currentCount >= 3 && (now - lastRedirectTime) < 30000) {
    // Clear the counters after showing error
    sessionStorage.removeItem(redirectCountKey);
    sessionStorage.removeItem(redirectTimeKey);
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Login Issue Detected</h2>
          <p className="text-gray-600 mb-4">
            We're having trouble signing you in. This is usually caused by browser cookie settings.
          </p>
          <div className="bg-white rounded-lg p-4 text-left mb-4 border border-gray-200">
            <p className="text-sm text-gray-700 mb-2"><strong>Try these steps:</strong></p>
            <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
              <li>Enable third-party cookies in your browser</li>
              <li>Try using a different browser</li>
              <li>Clear your browser cache and cookies</li>
              <li>Disable any ad blockers temporarily</li>
            </ol>
          </div>
          <button
            onClick={() => {
              sessionStorage.setItem(redirectCountKey, '0');
              window.location.href = getLoginUrl('/order');
            }}
            className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (waiverStatus?.needsAuth) {
    sessionStorage.setItem(redirectCountKey, String(currentCount + 1));
    sessionStorage.setItem(redirectTimeKey, String(now));
    window.location.href = getLoginUrl('/order');
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Show waiver if not signed
  if (!waiverStatus?.hasSignedWaiver) {
    return <StoreWaiver onComplete={() => refetchWaiver()} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      {/* Address Confirmation Modal */}
      {showAddressConfirmation && confirmedAddress && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-lg w-full">
            <AddressConfirmation
              address={confirmedAddress}
              onConfirm={handleAddressConfirmed}
              onCancel={() => setShowAddressConfirmation(false)}
              title="Confirm Shipping Address"
              description="Please verify your shipping address before proceeding to payment."
              confirmButtonText="Continue to Payment"
              showEditButton={true}
              isEditing={!confirmedAddress.street}
            />
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <StorePaymentSelector
          cart={cart}
          total={total}
          discountAmount={discountAmount}
          shippingFee={shippingFee}
          onCancel={() => setShowPaymentModal(false)}
          onPaymentSuccess={handlePaymentSuccess}
          shippingAddress={confirmedAddress || undefined}
        />
      )}

      {/* Order Confirmation Modal */}
      {orderConfirmation.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-300 shadow-xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
              <p className="text-gray-600 mb-6">Thank you for your order. You'll receive a confirmation email shortly.</p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Order Summary</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto mb-3">
                  {orderConfirmation.items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-700 truncate flex-1">{item.name} × {item.quantity}</span>
                      <span className="text-gray-900 ml-2">${((item.price * item.quantity) / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                {orderConfirmation.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600 border-t border-gray-200 pt-2">
                    <span>Discount (10%)</span>
                    <span>-${(orderConfirmation.discountAmount / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-500 border-t border-gray-200 pt-2">
                  <span>Shipping (Flat Rate)</span>
                  <span>${(FLAT_SHIPPING_FEE / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2 mt-2">
                  <span>Total</span>
                  <span className="text-amber-600">${(orderConfirmation.total / 100).toFixed(2)}</span>
                </div>
              </div>
              
              <button
                onClick={closeConfirmation}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-lg font-bold transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-amber-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => goBackTo('/launchpad')}
              className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="bg-amber-500 text-white px-3 py-1.5 rounded-lg font-bold text-sm">
              Ω OMEGA LONGEVITY
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Omega Store</h1>
              <p className="text-sm text-gray-500">Order peptides and supplies</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Order History Link */}
            <Link href="/order-history">
              <button className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-amber-50 border border-gray-200 rounded-lg transition-colors text-gray-600 hover:text-amber-600">
                <History className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Order History</span>
              </button>
            </Link>
            
            {/* Cart Summary in Header */}
            <div className="flex items-center gap-2 bg-amber-100 px-4 py-2 rounded-lg border border-amber-200">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
              <span className="text-gray-900 font-medium">{cart.length} items</span>
              <span className="text-gray-400">|</span>
              <span className="text-amber-600 font-bold">${(total / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Products Grid */}
        <div className="lg:col-span-3">
          {/* Search and Filters */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products by name, category, or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              
              {/* Category Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 min-w-[200px] justify-between"
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-gray-500" />
                    <span className="truncate">
                      {selectedCategory 
                        ? inventoryData?.find(c => c.id === selectedCategory)?.name || 'All Categories'
                        : 'All Categories'
                      }
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Dropdown Menu */}
                {isCategoryDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                    {/* All Categories Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory(null);
                        setIsCategoryDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 hover:bg-amber-50 transition-colors text-left ${
                        selectedCategory === null ? 'bg-amber-100 border-l-2 border-amber-500' : ''
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <FolderOpen className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <div className="text-gray-900 font-medium">All Categories</div>
                        <div className="text-xs text-gray-500">Show all available products</div>
                      </div>
                    </button>
                    
                    {/* Category Options */}
                    {inventoryData
                      ?.filter(cat => ALLOWED_CATEGORIES.includes(cat.name) && flagOn((cat as any).isActive))
                      .map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            setIsCategoryDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 p-3 hover:bg-amber-50 transition-colors text-left ${
                            selectedCategory === cat.id 
                              ? 'bg-amber-100 border-l-2 border-amber-500'
                              : ''
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            cat.name === 'Limitless Tier 1' ? 'bg-amber-100' :
                            cat.name === 'Bioregulators' ? 'bg-purple-100' :
                            cat.name === 'Supplies & Misc' ? 'bg-blue-100' :
                            cat.name === 'Troscriptions Troches' ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            {cat.iconUrl ? (
                              <img src={cat.iconUrl} alt="" className="w-6 h-6 object-contain" />
                            ) : (
                              <Package className={`w-5 h-5 ${
                                cat.name === 'Limitless Tier 1' ? 'text-amber-600' :
                                cat.name === 'Bioregulators' ? 'text-purple-600' :
                                cat.name === 'Supplies & Misc' ? 'text-blue-600' :
                                cat.name === 'Troscriptions Troches' ? 'text-green-600' : 'text-gray-600'
                              }`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-gray-900 font-medium">{cat.name}</div>
                            {cat.description && (
                              <div className="text-xs text-gray-500 truncate">{cat.description}</div>
                            )}
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
              
              {/* Favorites Toggle */}
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  showFavoritesOnly 
                    ? 'bg-red-50 border-red-300 text-red-600' 
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:text-amber-600 hover:border-amber-300'
                }`}
              >
                <Heart className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                <span className="hidden sm:inline">Favorites</span>
              </button>
            </div>
          </div>

          {/* Featured Promotion Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 p-1 mb-6">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-30" />
            <div className="relative bg-white/95 rounded-xl p-4 md:p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl items-center justify-center flex-shrink-0">
                    <Tag className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-center md:text-left">
                    <div className="flex items-center gap-2 justify-center md:justify-start mb-1">
                      <span className="bg-green-500 text-white text-xs font-medium px-2 py-1 rounded animate-pulse">LIMITED OFFER</span>
                      <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-1 rounded border border-amber-200">Save up to 18%</span>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-900">Tirzepatide HA 10MG - Volume Discount</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="text-gray-900 font-semibold">$325</span> for 1 unit • 
                      <span className="text-green-600 font-semibold"> $285</span> for 2-4 units • 
                      <span className="text-emerald-600 font-semibold"> $265</span> for 5+ units
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium whitespace-nowrap flex items-center gap-2"
                    onClick={() => setSearchQuery('Tirzepatide')}
                  >
                    <Search className="w-4 h-4" />
                    Find Product
                  </button>
                  <button 
                    className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-lg whitespace-nowrap"
                    onClick={() => setLocation('/promotions')}
                  >
                    View All Offers
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredItems.map(item => {
              const cartItem = cart.find(i => i.id === item.id);
              const isFavorite = favoriteIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all"
                >
                  {/* Category & Favorite */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        item.categoryName === 'Limitless Tier 1' ? 'bg-amber-100 text-amber-700' :
                        item.categoryName === 'Bioregulators' ? 'bg-purple-100 text-purple-700' :
                        item.categoryName === 'Supplies & Misc' ? 'bg-blue-100 text-blue-700' :
                        item.categoryName === 'Troscriptions Troches' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {item.categoryName}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleFavorite(item.id)}
                      className={`p-1.5 rounded-full transition-colors ${
                        isFavorite ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                  
                  {/* Product Info */}
                  <h3 className="text-gray-900 font-medium mb-2 line-clamp-2">{item.name}</h3>
                  
                  <div className="flex flex-col gap-1 mb-3">
                    {/* Price with tiered pricing indicator */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-amber-600 font-bold text-lg">${parseFloat(item.price!).toFixed(2)}</span>
                      {!!item.isDiscountable && (
                        <span className="text-xs text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded">10% off</span>
                      )}
                    </div>
                    {/* Tiered pricing display */}
                    {item.pricingTiers && item.pricingTiers.length > 0 && (
                      <div className="text-xs text-gray-500">
                        Volume discounts available
                      </div>
                    )}
                    {/* Stock status is intentionally hidden from customers (Jason, 2026-07-10):
                        no count, no low-stock / backorder / delay messaging — order freely. */}
                  </div>
                  
                  {/* Add to Cart / Quantity Controls */}
                  {cartItem ? (
                    <div className="flex items-center justify-between bg-gray-100 rounded-lg p-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        disabled={cartItem.quantity <= 1}
                        className="p-1 bg-white hover:bg-gray-50 rounded transition-colors disabled:opacity-50 border border-gray-200"
                      >
                        <Minus className="w-4 h-4 text-gray-700" />
                      </button>
                      <span className="text-gray-900 font-medium">{cartItem.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        disabled={cartItem.quantity >= cartItem.maxQuantity}
                        className="p-1 bg-white hover:bg-gray-50 rounded transition-colors disabled:opacity-50 border border-gray-200"
                      >
                        <Plus className="w-4 h-4 text-gray-700" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(item)}
                      className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 w-full justify-center"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No products found matching your criteria.</p>
            </div>
          )}
        </div>

        {/* Cart Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl p-6 sticky top-24 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-amber-500" />
              Your Cart
            </h2>
            
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Your cart is empty</p>
                <p className="text-sm text-gray-400">Add items to get started</p>
              </div>
            ) : (
              <>
                {/* In-Stock Items */}
                <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                  {cart.filter(item => !item.isDropship).map(item => {
                    const unitPrice = getTieredPrice(item.price, item.quantity, item.pricingTiers);
                    const lineTotal = unitPrice * item.quantity;
                    return (
                      <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 text-sm font-medium truncate">{item.name}</p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500">
                              {item.quantity} × ${(unitPrice / 100).toFixed(2)}
                            </span>
                            {item.pricingTiers && item.pricingTiers.length > 0 && unitPrice < item.price && (
                              <span className="text-green-600">Volume price!</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-600 font-medium text-sm">${(lineTotal / 100).toFixed(2)}</span>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Dropship Items */}
                {cart.some(item => item.isDropship) && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-xs text-blue-600 mb-2">
                      <Truck className="w-3 h-3" />
                      <span className="font-medium">Dropship Items (5-7 days)</span>
                    </div>
                    <div className="space-y-3">
                      {cart.filter(item => item.isDropship).map(item => {
                        const unitPrice = getTieredPrice(item.price, item.quantity, item.pricingTiers);
                        const lineTotal = unitPrice * item.quantity;
                        return (
                          <div key={item.id} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-900 text-sm font-medium truncate">{item.name}</p>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-gray-500">
                                  {item.quantity} × ${(unitPrice / 100).toFixed(2)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-amber-600 font-medium text-sm">${(lineTotal / 100).toFixed(2)}</span>
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="p-1 hover:bg-blue-100 rounded transition-colors"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Totals */}
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>${(subtotal / 100).toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        Discount (10%)
                      </span>
                      <span>-${(discountAmount / 100).toFixed(2)}</span>
                    </div>
                  )}
                  {shippingFee > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span className="flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        Shipping (Flat Rate)
                      </span>
                      <span>${(shippingFee / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-900 font-bold text-lg pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span className="text-amber-600">${(total / 100).toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  className="w-full mt-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-3 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Checkout
                </button>

                {/* Sourcing disclaimer (Jason, 2026-07-11) */}
                <p className="mt-3 text-xs text-gray-400 leading-relaxed">
                  On rare occasions when an item is out of stock with us and our primary
                  supplier, we'll send an equivalent product from one of our trusted backup
                  vendors instead.
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
