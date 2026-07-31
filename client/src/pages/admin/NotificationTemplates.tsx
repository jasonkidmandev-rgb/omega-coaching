import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, AlertTriangle, Calendar, Package, FileText, Save, RotateCcw, Eye, Info } from "lucide-react";

// Template categories
const TEMPLATE_CATEGORIES = [
  { id: 'checkin', label: 'Check-In Emails', icon: Calendar, description: 'Weekly check-in reminders and notifications' },
  { id: 'alerts', label: 'Alert Emails', icon: AlertTriangle, description: 'Low score alerts and urgent notifications' },
  { id: 'digest', label: 'Digest Emails', icon: FileText, description: 'Daily and weekly summary emails' },
  { id: 'inventory', label: 'Inventory Emails', icon: Package, description: 'Low inventory and reorder notifications' },
];

// Available template variables
const TEMPLATE_VARIABLES = {
  checkin: [
    { var: '{{clientName}}', desc: 'Client\'s full name' },
    { var: '{{coachName}}', desc: 'Coach\'s name' },
    { var: '{{checkinLink}}', desc: 'Link to complete check-in' },
    { var: '{{dueDate}}', desc: 'Check-in due date' },
    { var: '{{reminderNumber}}', desc: 'Which reminder (1st, 2nd, etc.)' },
  ],
  alerts: [
    { var: '{{clientName}}', desc: 'Client\'s full name' },
    { var: '{{score}}', desc: 'The low score value' },
    { var: '{{questionText}}', desc: 'The question with low score' },
    { var: '{{checkinDate}}', desc: 'Date of the check-in' },
    { var: '{{reviewLink}}', desc: 'Link to review the check-in' },
  ],
  digest: [
    { var: '{{coachName}}', desc: 'Coach\'s name' },
    { var: '{{pendingCount}}', desc: 'Number of pending reviews' },
    { var: '{{lowScoreCount}}', desc: 'Number of low score alerts' },
    { var: '{{lowInventoryCount}}', desc: 'Number of low inventory items' },
    { var: '{{dashboardLink}}', desc: 'Link to operations dashboard' },
    { var: '{{date}}', desc: 'Current date' },
  ],
  inventory: [
    { var: '{{clientName}}', desc: 'Client\'s full name' },
    { var: '{{itemName}}', desc: 'Name of the inventory item' },
    { var: '{{status}}', desc: 'Current inventory status' },
    { var: '{{storeLink}}', desc: 'Link to the store' },
  ],
};

export default function NotificationTemplates() {
  const [activeCategory, setActiveCategory] = useState('checkin');
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState({ subject: '', body: '' });

  // Form state
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');

  // Fetch templates
  const { data: templates, isLoading, refetch } = trpc.checkin.getNotificationTemplates.useQuery();

  // Update mutation
  const updateTemplate = trpc.checkin.updateNotificationTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template updated successfully");
      refetch();
      setEditingTemplate(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update template");
    },
  });

  // Reset mutation
  const resetTemplate = trpc.checkin.resetNotificationTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template reset to default");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reset template");
    },
  });

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setEditSubject(template.subject);
    setEditBody(template.body);
  };

  const handleSave = () => {
    if (!editingTemplate) return;
    updateTemplate.mutate({
      id: editingTemplate.id,
      subject: editSubject,
      body: editBody,
    });
  };

  const handleReset = (templateId: number) => {
    if (confirm("Are you sure you want to reset this template to its default content?")) {
      resetTemplate.mutate({ id: templateId });
    }
  };

  const handlePreview = (template: any) => {
    // Replace variables with sample data
    let subject = template.subject;
    let body = template.body;

    const sampleData: Record<string, string> = {
      '{{clientName}}': 'John Smith',
      '{{coachName}}': 'Coach Sarah',
      '{{checkinLink}}': 'https://example.com/checkin',
      '{{dueDate}}': 'Thursday, January 30, 2025',
      '{{reminderNumber}}': '1st',
      '{{score}}': '3',
      '{{questionText}}': 'How happy are you with your overall experience?',
      '{{checkinDate}}': 'January 25, 2025',
      '{{reviewLink}}': 'https://example.com/review',
      '{{pendingCount}}': '5',
      '{{lowScoreCount}}': '2',
      '{{lowInventoryCount}}': '3',
      '{{dashboardLink}}': 'https://example.com/dashboard',
      '{{date}}': 'January 25, 2025',
      '{{itemName}}': 'BPC-157',
      '{{status}}': 'Running Low',
      '{{storeLink}}': 'https://example.com/store',
    };

    Object.entries(sampleData).forEach(([key, value]) => {
      subject = subject.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
      body = body.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    setPreviewContent({ subject, body });
    setPreviewOpen(true);
  };

  const filteredTemplates = templates?.filter((t: any) => t.category === activeCategory) || [];

  return (
    <>
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Customize the email content for check-in reminders, alerts, and digests</p>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="bg-gray-100 border border-gray-200">
          {TEMPLATE_CATEGORIES.map((cat) => (
            <TabsTrigger
              key={cat.id}
              value={cat.id}
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
            >
              <cat.icon className="w-4 h-4 mr-2" />
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TEMPLATE_CATEGORIES.map((cat) => (
          <TabsContent key={cat.id} value={cat.id} className="space-y-4">
            {/* Category description */}
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-gray-700">{cat.description}</p>
                    <div className="mt-2">
                      <span className="text-sm text-gray-500">Available variables: </span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {TEMPLATE_VARIABLES[cat.id as keyof typeof TEMPLATE_VARIABLES]?.map((v) => (
                          <Badge
                            key={v.var}
                            variant="outline"
                            className="text-xs bg-white border-gray-300 text-gray-700 cursor-help"
                            title={v.desc}
                          >
                            {v.var}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Templates list */}
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading templates...</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No templates found for this category</div>
            ) : (
              <div className="space-y-4">
                {filteredTemplates.map((template: any) => (
                  <Card key={template.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="w-5 h-5 text-orange-500" />
                          <CardTitle className="text-lg text-gray-900">{template.name}</CardTitle>
                          {template.isCustomized && (
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                              Customized
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreview(template)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Preview
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(template)}
                            className="border-orange-300 text-orange-600 hover:bg-orange-50"
                          >
                            Edit
                          </Button>
                          {template.isCustomized && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReset(template.id)}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-gray-500">Subject</Label>
                          <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
                            {template.subject}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Body Preview</Label>
                          <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 max-h-24 overflow-hidden">
                            {template.body.substring(0, 200)}...
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template: {editingTemplate?.name}</DialogTitle>
            <DialogDescription>
              Customize the email content. Use the variables shown below to personalize the message.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Available variables */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <Label className="text-xs text-gray-500">Available Variables (click to copy)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {TEMPLATE_VARIABLES[activeCategory as keyof typeof TEMPLATE_VARIABLES]?.map((v) => (
                  <Badge
                    key={v.var}
                    variant="outline"
                    className="text-xs bg-white border-gray-300 text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      navigator.clipboard.writeText(v.var);
                      toast.success(`Copied ${v.var}`);
                    }}
                    title={v.desc}
                  >
                    {v.var}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Subject Line</Label>
              <Input
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                className="mt-1"
                placeholder="Email subject..."
              />
            </div>

            <div>
              <Label>Email Body (HTML supported)</Label>
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="mt-1 min-h-75 font-mono text-sm"
                placeholder="Email body content..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingTemplate(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateTemplate.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateTemplate.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              Preview with sample data
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-xs text-gray-500">Subject</Label>
              <div className="text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                {previewContent.subject}
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-500">Body</Label>
              <div
                className="bg-white text-gray-900 p-4 rounded border border-gray-200 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: previewContent.body }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
