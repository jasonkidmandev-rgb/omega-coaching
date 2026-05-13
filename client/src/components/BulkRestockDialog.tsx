import { useState, useMemo, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import Fuse from 'fuse.js';
import * as Papa from 'papaparse';
import {
  Package, Search, ArrowUp, ArrowDown, CheckCircle2, AlertTriangle,
  Loader2, ClipboardList, RotateCcw, Upload, Download, FileSpreadsheet,
  X, HelpCircle, ChevronDown, ChevronUp, Link2
} from 'lucide-react';

interface BulkRestockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryData?: any;
  onSuccess?: () => void;
}

type UpdateMode = 'add' | 'set';
type QuickFilter = 'all' | 'negative' | 'low' | 'modified';
type MatchConfidence = 'exact' | 'fuzzy' | 'unmatched';

interface InventoryItemFlat {
  id: number;
  name: string;
  sku: string | null;
  quantity: number;
  lowStockThreshold: number;
  categoryName: string;
  categoryId: number;
  [key: string]: any;
}

interface ItemUpdate {
  quantity: number;
  mode: UpdateMode;
}

interface CsvRow {
  name: string;
  quantity: number;
  mode?: UpdateMode;
  rawRow: Record<string, string>;
}

interface CsvMatch {
  csvRow: CsvRow;
  matchedItemId: number | null;
  matchedItemName: string | null;
  confidence: MatchConfidence;
  score: number;
  alternativeMatches: Array<{ id: number; name: string; score: number }>;
}

export function BulkRestockDialog({ open, onOpenChange }: BulkRestockDialogProps) {

  const utils = trpc.useUtils();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [globalMode, setGlobalMode] = useState<UpdateMode>('add');
  const [batchNotes, setBatchNotes] = useState('');
  const [updates, setUpdates] = useState<Record<number, ItemUpdate>>({});
  const [step, setStep] = useState<'edit' | 'confirm' | 'results'>('edit');
  const [results, setResults] = useState<any>(null);
  const [entryTab, setEntryTab] = useState<'manual' | 'csv'>('manual');

  // CSV state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvMatches, setCsvMatches] = useState<CsvMatch[]>([]);
  const [csvParsing, setCsvParsing] = useState(false);
  const [csvApplied, setCsvApplied] = useState(false);
  const [showCsvHelp, setShowCsvHelp] = useState(false);
  const [expandedCsvRow, setExpandedCsvRow] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data - use correct tRPC endpoint names
  const { data: inventoryData } = trpc.inventory.getWithCategories.useQuery();
  const { data: categories } = trpc.inventory.listCategories.useQuery();

  const bulkRestockMutation = trpc.inventory.bulkRestock.useMutation({
    onSuccess: (data) => {
      setResults(data);
      setStep('results');
      utils.inventory.getWithCategories.invalidate();
      utils.inventory.listCategories.invalidate();
      utils.inventory.getLowStock.invalidate();
    },
    onError: (error) => {
      toast.error(`Bulk restock failed: ${error.message}`);
    },
  });

  // Flatten all items with category info
  const allItems = useMemo((): InventoryItemFlat[] => {
    if (!inventoryData) return [];
    return inventoryData.flatMap(cat =>
      cat.items.map(item => ({
        ...item,
        categoryName: cat.name,
        categoryId: cat.id,
      }))
    ) as InventoryItemFlat[];
  }, [inventoryData]);

  // Fuse.js instance for fuzzy matching
  const fuseInstance = useMemo(() => {
    if (allItems.length === 0) return null;
    return new Fuse<InventoryItemFlat>(allItems, {
      keys: ['name', 'sku'],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
  }, [allItems]);

  // Filter items
  const filteredItems = useMemo(() => {
    let items = allItems;

    if (categoryFilter !== 'all') {
      items = items.filter(i => i.categoryId.toString() === categoryFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(i =>
        i.name.toLowerCase().includes(term) ||
        (i.sku && i.sku.toLowerCase().includes(term)) ||
        i.categoryName.toLowerCase().includes(term)
      );
    }

    if (quickFilter === 'negative') {
      items = items.filter(i => i.quantity < 0);
    } else if (quickFilter === 'low') {
      items = items.filter(i => i.quantity <= (i.lowStockThreshold || 0));
    } else if (quickFilter === 'modified') {
      items = items.filter(i => updates[i.id] && updates[i.id].quantity > 0);
    }

    return items.sort((a, b) => {
      if (a.quantity < 0 && b.quantity >= 0) return -1;
      if (a.quantity >= 0 && b.quantity < 0) return 1;
      if (a.quantity < 0 && b.quantity < 0) return a.quantity - b.quantity;
      return a.name.localeCompare(b.name);
    });
  }, [allItems, categoryFilter, searchTerm, quickFilter, updates]);

  const modifiedCount = useMemo(() => {
    return Object.entries(updates).filter(([_, u]) => u.quantity > 0).length;
  }, [updates]);

  const itemsToSubmit = useMemo(() => {
    return Object.entries(updates)
      .filter(([_, u]) => u.quantity > 0)
      .map(([id, u]) => {
        const item = allItems.find(i => i.id === parseInt(id));
        return {
          inventoryItemId: parseInt(id),
          quantity: u.quantity,
          mode: u.mode,
          itemName: item?.name || 'Unknown',
          currentStock: item?.quantity || 0,
          expectedNew: u.mode === 'set' ? u.quantity : (item?.quantity || 0) + u.quantity,
        };
      });
  }, [updates, allItems]);

  const handleUpdateItem = useCallback((itemId: number, quantity: number) => {
    setUpdates(prev => ({
      ...prev,
      [itemId]: { quantity: Math.max(0, quantity), mode: prev[itemId]?.mode || globalMode },
    }));
  }, [globalMode]);

  const handleModeChange = useCallback((itemId: number, mode: UpdateMode) => {
    setUpdates(prev => ({
      ...prev,
      [itemId]: { quantity: prev[itemId]?.quantity || 0, mode },
    }));
  }, []);

  const handleClearAll = useCallback(() => {
    setUpdates({});
    setCsvApplied(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (itemsToSubmit.length === 0) {
      toast.error('No changes - enter quantities for items you want to update.');
      return;
    }
    setStep('confirm');
  }, [itemsToSubmit]);

  const handleConfirm = useCallback(() => {
    bulkRestockMutation.mutate({
      items: itemsToSubmit.map(i => ({
        inventoryItemId: i.inventoryItemId,
        quantity: i.quantity,
        mode: i.mode,
      })),
      notes: batchNotes || undefined,
    });
  }, [itemsToSubmit, batchNotes, bulkRestockMutation]);

  const handleClose = useCallback(() => {
    setUpdates({});
    setBatchNotes('');
    setSearchTerm('');
    setCategoryFilter('all');
    setQuickFilter('all');
    setStep('edit');
    setResults(null);
    setCsvFile(null);
    setCsvMatches([]);
    setCsvApplied(false);
    setCsvParsing(false);
    setEntryTab('manual');
    setExpandedCsvRow(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const getPreviewQuantity = (item: any) => {
    const update = updates[item.id];
    if (!update || update.quantity === 0) return item.quantity;
    return update.mode === 'set' ? update.quantity : item.quantity + update.quantity;
  };

  // ========== CSV Functions ==========

  const normalizeName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const handleCsvFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setCsvParsing(true);
    setCsvApplied(false);
    setCsvMatches([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim().toLowerCase(),
      complete: (results) => {
        try {
          const rows = results.data as Record<string, string>[];
          if (rows.length === 0) {
            toast.error('CSV file is empty or has no data rows.');
            setCsvParsing(false);
            return;
          }

          const headers = Object.keys(rows[0] || {});
          const nameCol = headers.find(h =>
            /^(item[_ ]?name|product[_ ]?name|name|item|product|description|sku)$/i.test(h)
          );
          const qtyCol = headers.find(h =>
            /^(qty|quantity|count|amount|stock|units|received|ordered)$/i.test(h)
          );
          const modeCol = headers.find(h =>
            /^(mode|action|type|method)$/i.test(h)
          );

          if (!nameCol) {
            toast.error(`Could not find item name column. Found columns: ${headers.join(', ')}. Expected: name, item_name, product_name, sku, or description.`);
            setCsvParsing(false);
            return;
          }
          if (!qtyCol) {
            toast.error(`Could not find quantity column. Found columns: ${headers.join(', ')}. Expected: qty, quantity, count, amount, stock, or units.`);
            setCsvParsing(false);
            return;
          }

          const parsedRows: CsvRow[] = rows
            .filter(row => row[nameCol]?.trim())
            .map(row => {
              const qty = parseInt(row[qtyCol] || '0', 10);
              const modeVal = modeCol ? row[modeCol]?.trim().toLowerCase() : undefined;
              const parsedMode: UpdateMode | undefined = modeVal === 'set' ? 'set' : modeVal === 'add' ? 'add' : undefined;
              return {
                name: row[nameCol].trim(),
                quantity: isNaN(qty) ? 0 : Math.abs(qty),
                mode: parsedMode,
                rawRow: row,
              };
            })
            .filter(row => row.quantity > 0);

          if (parsedRows.length === 0) {
            toast.error('No valid rows found. Make sure quantity values are greater than 0.');
            setCsvParsing(false);
            return;
          }

          const matches: CsvMatch[] = parsedRows.map(csvRow => {
            const normalizedCsvName = normalizeName(csvRow.name);
            const exactMatch = allItems.find(item =>
              normalizeName(item.name) === normalizedCsvName ||
              (item.sku && item.sku.toLowerCase() === csvRow.name.toLowerCase())
            );

            if (exactMatch) {
              return {
                csvRow,
                matchedItemId: exactMatch.id,
                matchedItemName: exactMatch.name,
                confidence: 'exact' as MatchConfidence,
                score: 1,
                alternativeMatches: [],
              };
            }

            if (fuseInstance) {
              const fuseResults = fuseInstance.search(csvRow.name, { limit: 5 });
              if (fuseResults.length > 0 && fuseResults[0].score !== undefined && fuseResults[0].score < 0.4) {
                const bestMatch = fuseResults[0];
                const alternatives = fuseResults.slice(1, 4).map(r => ({
                  id: r.item.id,
                  name: r.item.name,
                  score: 1 - (r.score || 0),
                }));

                return {
                  csvRow,
                  matchedItemId: bestMatch.item.id,
                  matchedItemName: bestMatch.item.name,
                  confidence: 'fuzzy' as MatchConfidence,
                  score: 1 - (bestMatch.score || 0),
                  alternativeMatches: alternatives,
                };
              }

              const suggestions = fuseResults.slice(0, 3).map(r => ({
                id: r.item.id,
                name: r.item.name,
                score: 1 - (r.score || 0),
              }));

              return {
                csvRow,
                matchedItemId: null,
                matchedItemName: null,
                confidence: 'unmatched' as MatchConfidence,
                score: 0,
                alternativeMatches: suggestions,
              };
            }

            return {
              csvRow,
              matchedItemId: null,
              matchedItemName: null,
              confidence: 'unmatched' as MatchConfidence,
              score: 0,
              alternativeMatches: [],
            };
          });

          setCsvMatches(matches);
          setCsvParsing(false);

          const exactCount = matches.filter(m => m.confidence === 'exact').length;
          const fuzzyCount = matches.filter(m => m.confidence === 'fuzzy').length;
          const unmatchedCount = matches.filter(m => m.confidence === 'unmatched').length;

          toast.success(
            `Parsed ${matches.length} rows: ${exactCount} exact, ${fuzzyCount} fuzzy, ${unmatchedCount} unmatched`
          );
        } catch (err: any) {
          toast.error(`Failed to parse CSV: ${err.message}`);
          setCsvParsing(false);
        }
      },
      error: (error: any) => {
        toast.error(`CSV parsing error: ${error.message}`);
        setCsvParsing(false);
      },
    });

    e.target.value = '';
  }, [allItems, fuseInstance]);

  const handleReassignMatch = useCallback((csvIndex: number, newItemId: number) => {
    setCsvMatches(prev => {
      const updated = [...prev];
      const item = allItems.find(i => i.id === newItemId);
      if (item) {
        updated[csvIndex] = {
          ...updated[csvIndex],
          matchedItemId: newItemId,
          matchedItemName: item.name,
          confidence: 'exact',
          score: 1,
        };
      }
      return updated;
    });
  }, [allItems]);

  const handleDismissMatch = useCallback((csvIndex: number) => {
    setCsvMatches(prev => {
      const updated = [...prev];
      updated[csvIndex] = {
        ...updated[csvIndex],
        matchedItemId: null,
        matchedItemName: null,
        confidence: 'unmatched',
        score: 0,
      };
      return updated;
    });
  }, []);

  const handleApplyCsv = useCallback(() => {
    const matchedRows = csvMatches.filter(m => m.matchedItemId !== null);
    if (matchedRows.length === 0) {
      toast.error('No matched items to apply. Please resolve unmatched rows first.');
      return;
    }

    const newUpdates: Record<number, ItemUpdate> = { ...updates };
    let appliedCount = 0;

    for (const match of matchedRows) {
      if (match.matchedItemId === null) continue;
      const mode = match.csvRow.mode || globalMode;
      const existing = newUpdates[match.matchedItemId];

      if (existing && existing.quantity > 0) {
        if (mode === 'add') {
          newUpdates[match.matchedItemId] = {
            quantity: existing.quantity + match.csvRow.quantity,
            mode: 'add',
          };
        } else {
          newUpdates[match.matchedItemId] = {
            quantity: match.csvRow.quantity,
            mode: 'set',
          };
        }
      } else {
        newUpdates[match.matchedItemId] = {
          quantity: match.csvRow.quantity,
          mode,
        };
      }
      appliedCount++;
    }

    setUpdates(newUpdates);
    setCsvApplied(true);
    setEntryTab('manual');
    setQuickFilter('modified');
    toast.success(`Applied ${appliedCount} item updates from CSV. Review and adjust in the manual tab.`);
  }, [csvMatches, updates, globalMode]);

  const handleDownloadTemplate = useCallback(() => {
    const headers = ['name', 'qty', 'mode'];
    const rows = allItems.map(item => [
      `"${item.name.replace(/"/g, '""')}"`,
      '',
      '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-restock-template-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded! Fill in qty column and re-upload.');
  }, [allItems]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      const fakeEvent = {
        target: { files: [file], value: '' },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleCsvFileChange(fakeEvent);
    } else {
      toast.error('Please drop a .csv file');
    }
  }, [handleCsvFileChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const csvStats = useMemo(() => {
    const exact = csvMatches.filter(m => m.confidence === 'exact').length;
    const fuzzy = csvMatches.filter(m => m.confidence === 'fuzzy').length;
    const unmatched = csvMatches.filter(m => m.confidence === 'unmatched').length;
    return { exact, fuzzy, unmatched, total: csvMatches.length };
  }, [csvMatches]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {step === 'edit' && 'Bulk Stock Update'}
            {step === 'confirm' && 'Confirm Changes'}
            {step === 'results' && 'Update Complete'}
          </DialogTitle>
          <DialogDescription>
            {step === 'edit' && 'Update stock levels for multiple items at once. Enter quantities manually or upload a CSV packing list.'}
            {step === 'confirm' && `Review ${itemsToSubmit.length} item${itemsToSubmit.length !== 1 ? 's' : ''} before applying changes.`}
            {step === 'results' && `${results?.successCount || 0} items updated successfully.`}
          </DialogDescription>
        </DialogHeader>

        {step === 'edit' && (
          <>
            <Tabs value={entryTab} onValueChange={(v) => setEntryTab(v as 'manual' | 'csv')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Manual Entry
                  {modifiedCount > 0 && (
                    <Badge variant="secondary" className="ml-1">{modifiedCount}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="csv" className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  CSV Upload
                  {csvMatches.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{csvMatches.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* ========== MANUAL ENTRY TAB ========== */}
              <TabsContent value="manual" className="flex flex-col flex-1 min-h-0 mt-3">
                <div className="flex flex-col gap-3 pb-3 border-b">
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-9"
                      />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-[180px] h-9">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={globalMode} onValueChange={(v) => setGlobalMode(v as UpdateMode)}>
                      <SelectTrigger className="w-[140px] h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="add">Add to Stock</SelectItem>
                        <SelectItem value="set">Set Stock To</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex gap-1">
                      {(['all', 'negative', 'low', 'modified'] as QuickFilter[]).map(f => (
                        <Button
                          key={f}
                          variant={quickFilter === f ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setQuickFilter(f)}
                        >
                          {f === 'all' && `All (${allItems.length})`}
                          {f === 'negative' && (
                            <>
                              <AlertTriangle className="h-3 w-3 mr-1 text-red-500" />
                              Negative ({allItems.filter(i => i.quantity < 0).length})
                            </>
                          )}
                          {f === 'low' && `Low Stock (${allItems.filter(i => i.quantity <= (i.lowStockThreshold || 0)).length})`}
                          {f === 'modified' && (
                            <>
                              Modified ({modifiedCount})
                            </>
                          )}
                        </Button>
                      ))}
                    </div>
                    {modifiedCount > 0 && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleClearAll}>
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Clear All
                      </Button>
                    )}
                  </div>
                  {csvApplied && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/30 rounded-md text-sm text-blue-700 dark:text-blue-300">
                      <FileSpreadsheet className="h-4 w-4 flex-shrink-0" />
                      <span>CSV data applied. Review quantities below and adjust as needed before submitting.</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 -mx-2 px-2" style={{ maxHeight: '340px' }}>
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background z-10">
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 font-medium">Item</th>
                        <th className="text-center py-2 px-1 font-medium w-20">Current</th>
                        <th className="text-center py-2 px-1 font-medium w-28">Qty</th>
                        <th className="text-center py-2 px-1 font-medium w-28">Mode</th>
                        <th className="text-center py-2 px-1 font-medium w-20">New</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map(item => {
                        const update = updates[item.id];
                        const previewQty = getPreviewQuantity(item);
                        const hasChange = update && update.quantity > 0;
                        const isNegative = item.quantity < 0;

                        return (
                          <tr
                            key={item.id}
                            className={`border-b transition-colors ${
                              hasChange ? 'bg-green-50 dark:bg-green-950/20' :
                              isNegative ? 'bg-red-50 dark:bg-red-950/20' : ''
                            }`}
                          >
                            <td className="py-2 px-2">
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{item.name}</span>
                                <span className="text-xs text-muted-foreground">{item.categoryName}</span>
                              </div>
                            </td>
                            <td className="text-center py-2 px-1">
                              <Badge
                                variant={item.quantity < 0 ? 'destructive' : item.quantity <= (item.lowStockThreshold || 0) ? 'destructive' : 'secondary'}
                                className="font-mono"
                              >
                                {item.quantity}
                              </Badge>
                            </td>
                            <td className="text-center py-2 px-1">
                              <Input
                                type="number"
                                min={0}
                                value={update?.quantity ?? ''}
                                placeholder="0"
                                onChange={(e) => handleUpdateItem(item.id, parseInt(e.target.value) || 0)}
                                className="h-8 w-24 mx-auto text-center font-mono"
                              />
                            </td>
                            <td className="text-center py-2 px-1">
                              <Select
                                value={update?.mode || globalMode}
                                onValueChange={(v) => handleModeChange(item.id, v as UpdateMode)}
                              >
                                <SelectTrigger className="h-8 w-24 mx-auto text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="add">+ Add</SelectItem>
                                  <SelectItem value="set">= Set</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="text-center py-2 px-1">
                              {hasChange ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Badge
                                    variant={previewQty < 0 ? 'destructive' : 'default'}
                                    className="font-mono"
                                  >
                                    {previewQty}
                                  </Badge>
                                  {previewQty > item.quantity ? (
                                    <ArrowUp className="h-3 w-3 text-green-600" />
                                  ) : previewQty < item.quantity ? (
                                    <ArrowDown className="h-3 w-3 text-red-600" />
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredItems.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No items match your filters</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ========== CSV UPLOAD TAB ========== */}
              <TabsContent value="csv" className="flex flex-col flex-1 min-h-0 mt-3">
                <div className="mb-3">
                  <button
                    onClick={() => setShowCsvHelp(!showCsvHelp)}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <HelpCircle className="h-4 w-4" />
                    <span>CSV Format Guide</span>
                    {showCsvHelp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  {showCsvHelp && (
                    <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm space-y-2">
                      <p className="font-medium">Required columns:</p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1">
                        <li><code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">name</code> — Item name (also accepts: item_name, product_name, sku, description)</li>
                        <li><code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">qty</code> — Quantity (also accepts: quantity, count, amount, stock, units, received)</li>
                      </ul>
                      <p className="font-medium mt-2">Optional columns:</p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1">
                        <li><code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">mode</code> — "add" or "set" (defaults to global mode setting)</li>
                      </ul>
                      <p className="text-muted-foreground mt-2">
                        Items are matched by name using fuzzy matching. Download the template below for best results.
                      </p>
                    </div>
                  )}
                </div>

                {csvMatches.length === 0 && (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileChange}
                      className="hidden"
                    />
                    {csvParsing ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">Parsing CSV file...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <Upload className="h-10 w-10 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Drop a CSV file here or click to browse</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Accepts .csv files with item name and quantity columns
                          </p>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadTemplate();
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Template
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {csvMatches.length > 0 && (
                  <div className="flex flex-col flex-1 min-h-0">
                    <div className="flex flex-wrap gap-3 items-center justify-between mb-3 pb-3 border-b">
                      <div className="flex gap-3 text-sm">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          {csvStats.exact} exact
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                          {csvStats.fuzzy} fuzzy
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          {csvStats.unmatched} unmatched
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setCsvFile(null);
                            setCsvMatches([]);
                            setCsvApplied(false);
                          }}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Clear
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Re-upload
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv"
                          onChange={handleCsvFileChange}
                          className="hidden"
                        />
                      </div>
                    </div>

                    {csvFile && (
                      <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>{csvFile.name}</span>
                        <span>({csvStats.total} rows)</span>
                      </div>
                    )}

                    <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: '300px' }}>
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-background z-10">
                          <tr className="border-b">
                            <th className="text-left py-2 px-2 font-medium w-8">#</th>
                            <th className="text-left py-2 px-2 font-medium">CSV Name</th>
                            <th className="text-center py-2 px-1 font-medium w-16">Qty</th>
                            <th className="text-left py-2 px-2 font-medium">Matched To</th>
                            <th className="text-center py-2 px-1 font-medium w-24">Status</th>
                            <th className="text-center py-2 px-1 font-medium w-16">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvMatches.map((match, idx) => (
                            <CsvMatchRow
                              key={idx}
                              match={match}
                              idx={idx}
                              expandedCsvRow={expandedCsvRow}
                              setExpandedCsvRow={setExpandedCsvRow}
                              handleReassignMatch={handleReassignMatch}
                              handleDismissMatch={handleDismissMatch}
                              allItems={allItems}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="pt-3 border-t mt-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          {csvStats.exact + csvStats.fuzzy} of {csvStats.total} rows matched
                          {csvStats.unmatched > 0 && (
                            <span className="text-yellow-600 dark:text-yellow-400 ml-1">
                              ({csvStats.unmatched} skipped)
                            </span>
                          )}
                        </div>
                        <Button
                          onClick={handleApplyCsv}
                          disabled={csvStats.exact + csvStats.fuzzy === 0 || csvApplied}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {csvApplied ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Applied
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Apply {csvStats.exact + csvStats.fuzzy} Matches
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="pt-3 border-t space-y-2">
              <Label className="text-sm font-medium">Batch Notes (optional)</Label>
              <Textarea
                placeholder="e.g., Shipment from supplier XYZ, PO #12345, received 2/9/2026"
                value={batchNotes}
                onChange={(e) => setBatchNotes(e.target.value)}
                className="h-16 resize-none"
              />
            </div>
          </>
        )}

        {step === 'confirm' && (
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="space-y-4">
              {batchNotes && (
                <div className="bg-muted rounded-md p-3">
                  <p className="text-sm font-medium mb-1">Batch Notes:</p>
                  <p className="text-sm text-muted-foreground">{batchNotes}</p>
                </div>
              )}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium">Item</th>
                    <th className="text-center py-2 px-2 font-medium">Current</th>
                    <th className="text-center py-2 px-2 font-medium">Action</th>
                    <th className="text-center py-2 px-2 font-medium">New Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsToSubmit.map(item => (
                    <tr key={item.inventoryItemId} className="border-b">
                      <td className="py-2 px-2 font-medium">{item.itemName}</td>
                      <td className="text-center py-2 px-2">
                        <Badge variant={item.currentStock < 0 ? 'destructive' : 'secondary'} className="font-mono">
                          {item.currentStock}
                        </Badge>
                      </td>
                      <td className="text-center py-2 px-2 text-xs">
                        {item.mode === 'add' ? (
                          <span className="text-green-600">+{item.quantity}</span>
                        ) : (
                          <span className="text-blue-600">Set to {item.quantity}</span>
                        )}
                      </td>
                      <td className="text-center py-2 px-2">
                        <Badge variant={item.expectedNew < 0 ? 'destructive' : 'default'} className="font-mono">
                          {item.expectedNew}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === 'results' && results && (
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">{results.successCount} updated</span>
                </div>
                {results.errorCount > 0 && (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">{results.errorCount} errors</span>
                  </div>
                )}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium">Item</th>
                    <th className="text-center py-2 px-2 font-medium">Before</th>
                    <th className="text-center py-2 px-2 font-medium">After</th>
                    <th className="text-center py-2 px-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.results.map((r: any) => (
                    <tr key={r.itemId} className={`border-b ${r.error ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                      <td className="py-2 px-2 font-medium">{r.itemName}</td>
                      <td className="text-center py-2 px-2 font-mono">{r.previousQuantity}</td>
                      <td className="text-center py-2 px-2 font-mono">{r.newQuantity}</td>
                      <td className="text-center py-2 px-2">
                        {r.error ? (
                          <Badge variant="destructive" className="text-xs">{r.error}</Badge>
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter className="pt-3 border-t">
          {step === 'edit' && (
            <div className="flex justify-between w-full items-center">
              <span className="text-sm text-muted-foreground">
                {modifiedCount} item{modifiedCount !== 1 ? 's' : ''} to update
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={modifiedCount === 0}>
                  Review Changes ({modifiedCount})
                </Button>
              </div>
            </div>
          )}
          {step === 'confirm' && (
            <div className="flex justify-between w-full items-center">
              <Button variant="outline" onClick={() => setStep('edit')}>
                Back to Edit
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleConfirm} disabled={bulkRestockMutation.isPending}>
                  {bulkRestockMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    `Apply ${itemsToSubmit.length} Changes`
                  )}
                </Button>
              </div>
            </div>
          )}
          {step === 'results' && (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Extracted CSV match row component to avoid React key issues with fragments
function CsvMatchRow({
  match,
  idx,
  expandedCsvRow,
  setExpandedCsvRow,
  handleReassignMatch,
  handleDismissMatch,
  allItems,
}: {
  match: CsvMatch;
  idx: number;
  expandedCsvRow: number | null;
  setExpandedCsvRow: (idx: number | null) => void;
  handleReassignMatch: (csvIndex: number, newItemId: number) => void;
  handleDismissMatch: (csvIndex: number) => void;
  allItems: any[];
}) {
  return (
    <>
      <tr
        className={`border-b transition-colors ${
          match.confidence === 'exact' ? 'bg-green-50 dark:bg-green-950/20' :
          match.confidence === 'fuzzy' ? 'bg-yellow-50 dark:bg-yellow-950/20' :
          'bg-red-50 dark:bg-red-950/20'
        }`}
      >
        <td className="py-2 px-2 text-muted-foreground">{idx + 1}</td>
        <td className="py-2 px-2">
          <span className="font-medium">{match.csvRow.name}</span>
        </td>
        <td className="text-center py-2 px-1 font-mono">{match.csvRow.quantity}</td>
        <td className="py-2 px-2">
          {match.matchedItemName ? (
            <div className="flex items-center gap-1">
              <Link2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-sm">{match.matchedItemName}</span>
            </div>
          ) : (
            <span className="text-muted-foreground italic">No match</span>
          )}
        </td>
        <td className="text-center py-2 px-1">
          <Badge
            variant={
              match.confidence === 'exact' ? 'default' :
              match.confidence === 'fuzzy' ? 'secondary' : 'destructive'
            }
            className={`text-xs ${
              match.confidence === 'exact' ? 'bg-green-600' :
              match.confidence === 'fuzzy' ? 'bg-yellow-600 text-white' : ''
            }`}
          >
            {match.confidence === 'exact' && 'Exact'}
            {match.confidence === 'fuzzy' && `${Math.round(match.score * 100)}%`}
            {match.confidence === 'unmatched' && 'None'}
          </Badge>
        </td>
        <td className="text-center py-2 px-1">
          <div className="flex items-center justify-center gap-1">
            {(match.confidence === 'fuzzy' || match.confidence === 'unmatched') && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setExpandedCsvRow(expandedCsvRow === idx ? null : idx)}
                title="Show alternatives"
              >
                {expandedCsvRow === idx ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            )}
            {match.matchedItemId && match.confidence !== 'exact' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                onClick={() => handleDismissMatch(idx)}
                title="Dismiss match"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </td>
      </tr>
      {expandedCsvRow === idx && (match.confidence === 'fuzzy' || match.confidence === 'unmatched') && (
        <tr className="border-b bg-slate-50 dark:bg-slate-900/50">
          <td colSpan={6} className="py-2 px-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {match.alternativeMatches.length > 0 ? 'Alternative matches:' : 'No suggestions available'}
              </p>
              {match.alternativeMatches.map(alt => (
                <button
                  key={alt.id}
                  onClick={() => {
                    handleReassignMatch(idx, alt.id);
                    setExpandedCsvRow(null);
                  }}
                  className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-sm"
                >
                  <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                  <span>{alt.name}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {Math.round(alt.score * 100)}%
                  </Badge>
                </button>
              ))}
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Or select manually:</p>
                <Select
                  onValueChange={(v) => {
                    handleReassignMatch(idx, parseInt(v));
                    setExpandedCsvRow(null);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Search inventory items..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {allItems.map((item: any) => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.name} ({item.categoryName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
