import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Eye, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmailPreview() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("payment_confirmation");
  
  const { data: templates } = trpc.emailTracking.getTemplateList.useQuery();
  const { data: preview, isLoading } = trpc.emailTracking.getTemplatePreview.useQuery(
    { templateType: selectedTemplate as any },
    { enabled: !!selectedTemplate }
  );

  const openInNewTab = () => {
    if (!preview?.html) return;
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(preview.html);
      newWindow.document.close();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Eye className="h-6 w-6" />
              Email Template Preview
            </h1>
            <p className="text-muted-foreground">
              Preview how your email templates will look to recipients
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Template Selector */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="h-5 w-5" />
                  Select Template
                </CardTitle>
                <CardDescription>
                  Choose an email template to preview
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {templates?.find(t => t.id === selectedTemplate) && (
                  <p className="text-sm text-muted-foreground">
                    {templates.find(t => t.id === selectedTemplate)?.description}
                  </p>
                )}

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={openInNewTab}
                  disabled={!preview?.html}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              </CardContent>
            </Card>

            {/* Template List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Available Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {templates?.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedTemplate === template.id
                          ? "border-orange-500 bg-orange-500/10"
                          : "border-border hover:border-orange-500/50 hover:bg-muted/50"
                      }`}
                    >
                      <div className="font-medium text-sm">{template.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {template.description}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Preview
                {preview?.subject && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    Subject: {preview.subject}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                This is how the email will appear to recipients. Sample data is used for demonstration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-[600px]">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : preview?.html ? (
                <div className="border rounded-lg overflow-hidden bg-white">
                  <iframe
                    srcDoc={preview.html}
                    className="w-full h-[800px] border-0"
                    title="Email Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-[600px] text-muted-foreground">
                  Select a template to preview
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
