import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { RefObject } from "react";

type CsvPreviewRow = {
  email: string;
  shippingName?: string;
  shippingStreet?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZip?: string;
  shippingCountry?: string;
  shippingPhone?: string;
};

type CsvImportDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  csvFile: File | null;
  setCsvFile: (file: File | null) => void;
  csvPreview: CsvPreviewRow[];
  setCsvPreview: (preview: CsvPreviewRow[]) => void;
  csvImporting: boolean;
  csvInputRef: RefObject<HTMLInputElement>;
  downloadCsvTemplate: () => void;
  handleCsvFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCsvImport: () => void;
};

export default function CsvImportDialog({
  isOpen,
  onOpenChange,
  csvFile,
  setCsvFile,
  csvPreview,
  setCsvPreview,
  csvImporting,
  csvInputRef,
  downloadCsvTemplate,
  handleCsvFileChange,
  handleCsvImport,
}: CsvImportDialogProps) {
  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      setCsvFile(null);
      setCsvPreview([]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Shipping Addresses
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk update client shipping addresses.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadCsvTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <span className="text-sm text-muted-foreground">or</span>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              onChange={handleCsvFileChange}
              className="hidden"
            />
            <Button variant="outline" size="sm" onClick={() => csvInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Choose File
            </Button>
            {csvFile && (
              <span className="text-sm text-muted-foreground">{csvFile.name}</span>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground bg-slate-50 p-3 rounded-lg">
            <p className="font-medium mb-1">Required columns:</p>
            <p>email (required), shipping_name, shipping_street, shipping_city, shipping_state, shipping_zip, shipping_country, shipping_phone</p>
          </div>
          
          {csvPreview.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Preview (first {csvPreview.length} rows):</p>
              <div className="border rounded-lg overflow-auto max-h-48">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Address</th>
                      <th className="px-3 py-2 text-left">City</th>
                      <th className="px-3 py-2 text-left">State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((row, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2">{row.email}</td>
                        <td className="px-3 py-2">{row.shippingName || '-'}</td>
                        <td className="px-3 py-2">{row.shippingStreet || '-'}</td>
                        <td className="px-3 py-2">{row.shippingCity || '-'}</td>
                        <td className="px-3 py-2">{row.shippingState || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCsvImport}
            disabled={!csvFile || csvImporting}
          >
            {csvImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Upload className="h-4 w-4 mr-2" />
            Import Addresses
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
