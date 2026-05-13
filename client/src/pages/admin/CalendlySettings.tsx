import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  Settings,
  Trash2,
  Webhook,
  X,
  Shield,
  Eye,
  EyeOff,
  Zap,
  AlertCircle,
} from "lucide-react";

export default function CalendlySettings() {
  // Queries
  const { data: status, isLoading: loadingStatus } = trpc.calendly.getStatus.useQuery();
  const { data: eventTypesData, isLoading: loadingEventTypes } = trpc.calendly.getEventTypes.useQuery();
  const { data: excludedData, isLoading: loadingExcluded, refetch: refetchExcluded } = trpc.calendly.getExcludedEventTypes.useQuery();
  const { data: webhooksData, isLoading: loadingWebhooks, refetch: refetchWebhooks } = trpc.calendly.listWebhooks.useQuery();

  // Mutations
  const updateExcluded = trpc.calendly.updateExcludedEventTypes.useMutation();
  const setupWebhook = trpc.calendly.setupWebhook.useMutation();
  const deleteWebhook = trpc.calendly.deleteWebhook.useMutation();
  const refreshCache = trpc.calendly.refreshCache.useMutation();

  // Local state
  const [excludedNames, setExcludedNames] = useState<string[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [signingKey, setSigningKey] = useState("");
  const [showSigningKey, setShowSigningKey] = useState(false);

  useEffect(() => {
    if (excludedData?.excludedNames) {
      setExcludedNames(excludedData.excludedNames);
    }
  }, [excludedData]);

  // Auto-detect the app URL for webhook
  useEffect(() => {
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    setWebhookUrl(`${appUrl}/api/calendly/webhook`);
  }, []);

  const handleToggleExclusion = (name: string) => {
    setExcludedNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleSaveExclusions = async () => {
    try {
      await updateExcluded.mutateAsync({ excludedNames });
      toast.success("Excluded event types updated");
      refetchExcluded();
    } catch (e: any) {
      toast.error(`Failed to save: ${e.message}`);
    }
  };

  const handleSetupWebhook = async () => {
    if (!webhookUrl) {
      toast.error("Webhook URL is required");
      return;
    }
    try {
      const result = await setupWebhook.mutateAsync({
        callbackUrl: webhookUrl,
        signingKey: signingKey || undefined,
      });
      if (result.success) {
        toast.success("Webhook subscription created!");
        refetchWebhooks();
      } else {
        toast.error(`Failed: ${(result as any).error}`);
      }
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    }
  };

  const handleDeleteWebhook = async (uri: string) => {
    try {
      await deleteWebhook.mutateAsync({ webhookUri: uri });
      toast.success("Webhook deleted");
      refetchWebhooks();
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    }
  };

  const handleRefreshCache = async () => {
    try {
      const result = await refreshCache.mutateAsync();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    }
  };

  if (loadingStatus) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      </AdminLayout>
    );
  }

  if (!status?.configured) {
    return (
      <AdminLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Calendly Integration</h1>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <h3 className="font-semibold text-yellow-800">Not Configured</h3>
            </div>
            <p className="text-yellow-700">
              Calendly API token is not configured. Please add your Calendly Personal Access Token
              in the environment settings to enable this integration.
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const hasChanges = JSON.stringify(excludedNames.sort()) !== JSON.stringify((excludedData?.excludedNames || []).sort());

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-orange-500" />
              Calendly Integration
            </h1>
            <p className="text-gray-500 mt-1">
              Manage your Calendly sync settings, webhooks, and event type filters.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Connected
            </span>
            <button
              onClick={handleRefreshCache}
              disabled={refreshCache.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshCache.isPending ? "animate-spin" : ""}`} />
              Refresh Cache
            </button>
          </div>
        </div>

        {/* Section 1: Event Type Exclusions */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-500" />
              Event Type Filters
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Select which event types to exclude from the Appointments page. Excluded events won't appear in the sync.
            </p>
          </div>
          <div className="p-6">
            {loadingEventTypes ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading event types...
              </div>
            ) : (
              <div className="space-y-3">
                {eventTypesData?.eventTypes?.map((et) => {
                  const isExcluded = excludedNames.some(
                    (name) => et.name.toLowerCase().includes(name.toLowerCase())
                  );
                  return (
                    <label
                      key={et.uri}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        isExcluded
                          ? "bg-red-50 border-red-200"
                          : "bg-green-50 border-green-200 hover:bg-green-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: et.color || "#6b7280" }}
                        />
                        <div>
                          <span className="font-medium text-gray-900">{et.name}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            {et.duration} min · {et.kind}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isExcluded ? (
                          <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded">
                            Excluded
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded">
                            Syncing
                          </span>
                        )}
                        <input
                          type="checkbox"
                          checked={isExcluded}
                          onChange={() => handleToggleExclusion(et.name)}
                          className="h-4 w-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                        />
                      </div>
                    </label>
                  );
                })}
                {(!eventTypesData?.eventTypes || eventTypesData.eventTypes.length === 0) && (
                  <p className="text-gray-500 text-sm">No event types found in your Calendly account.</p>
                )}
              </div>
            )}
            {hasChanges && (
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleSaveExclusions}
                  disabled={updateExcluded.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium text-sm"
                >
                  {updateExcluded.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Save Changes
                </button>
                <button
                  onClick={() => setExcludedNames(excludedData?.excludedNames || [])}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Webhook Configuration */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Webhook className="h-5 w-5 text-gray-500" />
              Real-Time Webhooks
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Receive instant notifications when appointments are booked or canceled. Without webhooks, data refreshes every 3 minutes.
            </p>
          </div>
          <div className="p-6 space-y-6">
            {/* Existing webhooks */}
            {loadingWebhooks ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading webhooks...
              </div>
            ) : webhooksData?.webhooks && webhooksData.webhooks.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Active Subscriptions</h3>
                {webhooksData.webhooks.map((wh) => (
                  <div
                    key={wh.uri}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            wh.state === "active" ? "bg-green-500" : "bg-yellow-500"
                          }`}
                        />
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {wh.callbackUrl}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          Events: {wh.events.join(", ")}
                        </span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-500">
                          State: {wh.state}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteWebhook(wh.uri)}
                      disabled={deleteWebhook.isPending}
                      className="ml-3 p-1.5 text-red-500 hover:bg-red-50 rounded"
                      title="Delete webhook"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">No webhooks configured</span>
                </div>
                <p className="text-sm text-blue-700">
                  Set up a webhook below to get real-time appointment updates instead of polling every 3 minutes.
                </p>
              </div>
            )}

            {/* Create webhook form */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Create New Webhook</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Callback URL</label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-app.com/api/calendly/webhook"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    This should be your app's public URL + /api/calendly/webhook
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Signing Key (optional)
                  </label>
                  <div className="relative">
                    <input
                      type={showSigningKey ? "text" : "password"}
                      value={signingKey}
                      onChange={(e) => setSigningKey(e.target.value)}
                      placeholder="Optional: for webhook signature verification"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSigningKey(!showSigningKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showSigningKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    If provided, Calendly will sign webhook payloads for verification
                  </p>
                </div>
                <button
                  onClick={handleSetupWebhook}
                  disabled={setupWebhook.isPending || !webhookUrl}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium text-sm disabled:opacity-50"
                >
                  {setupWebhook.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Webhook className="h-4 w-4" />
                  )}
                  Create Webhook Subscription
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Integration Info */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-gray-500" />
              Integration Details
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Sync Settings</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Cache TTL: 3 minutes</p>
                  <p>Past events: 14 days</p>
                  <p>Future events: 56 days (8 weeks)</p>
                  <p>
                    Excluded types:{" "}
                    <span className="font-medium">
                      {excludedNames.length > 0 ? excludedNames.join(", ") : "None"}
                    </span>
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Links</h4>
                <div className="space-y-2">
                  <a
                    href="https://calendly.com/event_types/user/me"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Manage Event Types in Calendly
                  </a>
                  <a
                    href="https://calendly.com/integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Calendly Integrations Dashboard
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
