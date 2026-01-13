import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { InvoiceProvider, useInvoiceContextSafe } from "@/contexts/InvoiceContext";
import { useBusinessSettings } from "@/contexts/BusinessSettingsContext";
import { useNextInvoiceNumber } from "./hooks/useNextInvoiceNumber";
import { useCreateInvoice } from "./hooks/useCreateInvoice";
import { useUpdateInvoice } from "./hooks/useUpdateInvoice";
import { useSummarizeDescription } from "./hooks/useSummarizeDescription";
import { useToast } from "@/hooks/use-toast";
import { formatDateForInput } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save, ArrowLeft, Plus, Trash2, Sparkles, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { invoiceFormSchema } from "./types";
import type { InvoiceFormValues } from "./types";

function InvoiceFormContent() {
  const [location] = useLocation();
  const [, params] = useRoute("/invoices/:id");
  const [, editParams] = useRoute("/invoices/:id/edit");

  const invoiceId = params?.id || editParams?.id;
  const isEditing = !!invoiceId && invoiceId !== "new";

  // Check for duplicate mode
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const duplicateId = searchParams.get('duplicate');
  const isDuplicating = !!duplicateId;

  // Get invoice and clients from context (safe to call even without provider)
  const { invoice, clients, isLoadingInvoice: invoiceLoading, isLoadingClients: clientsLoading } = useInvoiceContextSafe();
  const { settings } = useBusinessSettings();

  const { data: nextInvoiceNumber } = useNextInvoiceNumber(!isEditing);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoice_number: "1",
      client_id: "",
      issue_date: formatDateForInput(new Date()),
      due_date: formatDateForInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      tax_rate: 0,
      items: [{
        description: "",
        raw_description: "",
        quantity: 8,
        rate: 0,
        item_date: formatDateForInput(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000))
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Set the next invoice number when creating new invoice
  useEffect(() => {
    if (!isEditing && !isDuplicating && nextInvoiceNumber) {
      form.setValue('invoice_number', nextInvoiceNumber);
    }
  }, [nextInvoiceNumber, isEditing, isDuplicating, form]);

  // Load invoice data for editing
  useEffect(() => {
    if (invoice && isEditing) {
      form.reset({
        invoice_number: invoice.invoice_number,
        client_id: invoice.client_id || "",
        issue_date: formatDateForInput(invoice.issue_date),
        due_date: formatDateForInput(invoice.due_date),
        tax_rate: invoice.tax_rate || 0,
        items: invoice.items.map((item) => ({
          description: item.description,
          raw_description: item.raw_description || "",
          quantity: item.quantity,
          rate: item.rate,
          item_date: item.item_date ? formatDateForInput(item.item_date) : formatDateForInput(invoice.issue_date),
        })),
      });

    }
  }, [invoice, isEditing, form]);

  // Load invoice data for duplicating
  useEffect(() => {
    if (invoice && isDuplicating && nextInvoiceNumber) {
      const today = formatDateForInput(new Date());

      form.reset({
        invoice_number: nextInvoiceNumber,
        client_id: invoice.client_id || "",
        issue_date: today,
        due_date: formatDateForInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        tax_rate: invoice.tax_rate || 0,
        items: invoice.items.map((item, index) => {
          const itemDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
          itemDate.setDate(itemDate.getDate() + index);
          return {
            description: item.description,
            raw_description: item.raw_description || "",
            quantity: item.quantity,
            rate: item.rate,
            item_date: formatDateForInput(itemDate),
          };
        }),
      });
    }
  }, [invoice, isDuplicating, nextInvoiceNumber, form]);

  // Watch for client changes and update all line item rates
  const watchClientId = form.watch("client_id");
  useEffect(() => {
    if (watchClientId && clients) {
      const selectedClient = clients.find(c => c.id === watchClientId);
      if (selectedClient && selectedClient.rate) {
        const currentItems = form.getValues("items");
        const updatedItems = currentItems.map(item => ({
          ...item,
          rate: selectedClient.rate || 0,
        }));
        form.setValue("items", updatedItems);
      }
    }
  }, [watchClientId, clients, form]);

  // Watch for issue date changes and update line item dates accordingly
  const watchIssueDate = form.watch("issue_date");
  useEffect(() => {
    if (watchIssueDate && !isEditing && !isDuplicating) {
      const currentItems = form.getValues("items");
      if (currentItems && currentItems.length > 0) {
        const updatedItems = currentItems.map((item, index) => {
          const date = new Date(watchIssueDate);
          // First item starts 4 days before issue date, then increments
          date.setDate(date.getDate() - 4 + index);
          return {
            ...item,
            item_date: date.toISOString().split('T')[0],
          };
        });
        form.setValue("items", updatedItems);
      }
    }
  }, [watchIssueDate, isEditing, isDuplicating, form]);

  const createMutation = useCreateInvoice();

  const updateMutation = useUpdateInvoice(invoiceId);

  const { toast } = useToast();
  const summarizeMutation = useSummarizeDescription();
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [requireDescription, setRequireDescription] = useState(true);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const handleGenerateAllSummaries = async () => {
    const items = form.getValues("items");

    // Only generate for items that have raw descriptions AND empty client summaries
    const itemsToGenerate = items.filter((item, index) => {
      const hasRawDesc = item.raw_description && item.raw_description.trim() !== "";
      const hasEmptyDesc = !item.description || item.description.trim() === "";
      return hasRawDesc && hasEmptyDesc;
    });

    if (itemsToGenerate.length === 0) {
      toast({
        title: "No summaries to generate",
        description: "All items either have summaries or are missing detailed notes",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingAll(true);

    try {
      let successCount = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const hasRawDesc = item.raw_description && item.raw_description.trim() !== "";
        const hasEmptyDesc = !item.description || item.description.trim() === "";

        // Only generate if raw description exists AND client summary is empty
        if (hasRawDesc && hasEmptyDesc && item.raw_description) {
          setGeneratingIndex(i);

          try {
            const result = await summarizeMutation.mutateAsync(item.raw_description);
            if (result.success && result.summary) {
              form.setValue(`items.${i}.description`, result.summary);
              successCount++;
            }
          } catch (error) {
            console.error(`Failed to generate summary for item ${i}:`, error);
          }
        }
      }

      if (successCount > 0) {
        toast({
          title: "Summaries generated",
          description: `Successfully generated ${successCount} AI summary/summaries. You can edit them if needed.`,
        });
      }
    } finally {
      setGeneratingIndex(null);
      setIsGeneratingAll(false);
    }
  };

  const onSubmit = (data: InvoiceFormValues) => {
    // Validate descriptions if required
    if (requireDescription) {
      const missingDescriptions = data.items.filter(item => !item.description || item.description.trim() === "");
      if (missingDescriptions.length > 0) {
        toast({
          title: "Missing descriptions",
          description: "Please provide descriptions for all line items or disable 'Require Description'",
          variant: "destructive"
        });
        return;
      }
    }

    // Generate notes from business settings
    let notesText = '';
    if (settings) {
      notesText = `Payment Information\n\n`;
      notesText += `Beneficiary Name: ${settings.beneficiary_name}\n`;
      notesText += `CNPJ: ${settings.beneficiary_cnpj}\n`;
      notesText += `SWIFT/BIC Code: ${settings.swift_code}\n`;
      notesText += `Bank Name: ${settings.bank_name}\n`;
      notesText += `Bank Address: ${settings.bank_address}\n`;
      notesText += `Routing Number: ${settings.routing_number}\n`;
      notesText += `Account Number: ${settings.account_number}\n`;
      notesText += `Account Type: ${settings.account_type}`;
    }

    // Get terms from selected client
    const selectedClient = clients.find(c => c.id === data.client_id);
    const termsText = selectedClient?.terms || '';

    const invoiceData = {
      invoice_number: data.invoice_number,
      client_id: data.client_id,
      issue_date: data.issue_date,
      due_date: data.due_date,
      tax_rate: data.tax_rate || 0,
      notes: notesText,
      terms: termsText,
      items: data.items.map((item) => ({
        description: item.description || "",
        raw_description: item.raw_description || null,
        quantity: item.quantity,
        rate: item.rate,
        item_date: item.item_date,
      })),
    };

    if (isEditing) {
      updateMutation.mutate(invoiceData);
    } else {
      createMutation.mutate(invoiceData);
    }
  };

  const watchItems = form.watch("items");
  const watchTaxRate = form.watch("tax_rate") || 0;
  const subtotal = watchItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    return sum + qty * rate;
  }, 0);
  const taxAmount = subtotal * (Number(watchTaxRate) / 100);
  const total = subtotal + taxAmount;

  // Check if all descriptions are filled when required
  const allDescriptionsFilled = watchItems.every(item => item.description && item.description.trim() !== "");
  const canSubmit = !requireDescription || allDescriptionsFilled;

  // Helper function to add 1 day to a date string (YYYY-MM-DD)
  const addOneDay = (dateString: string): string => {
    const date = new Date(dateString);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  };

  // Helper function to add new item with client's rate
  const addItem = () => {
    const clientId = form.getValues("client_id");
    const issueDate = form.getValues("issue_date");
    const currentItems = form.getValues("items");
    let defaultRate = 0;
    let defaultDate = issueDate || new Date().toISOString().split('T')[0];

    // If there are existing items, use the last item's date + 1 day
    if (currentItems && currentItems.length > 0) {
      const lastItem = currentItems[currentItems.length - 1];
      if (lastItem.item_date) {
        defaultDate = addOneDay(lastItem.item_date);
      }
    } else {
      // First item should be 4 days before issue date
      const date = new Date(defaultDate);
      date.setDate(date.getDate() - 4);
      defaultDate = date.toISOString().split('T')[0];
    }

    if (clientId && clients) {
      const selectedClient = clients.find(c => c.id === clientId);
      if (selectedClient && selectedClient.rate) {
        defaultRate = selectedClient.rate;
      }
    }

    append({
      description: "",
      raw_description: "",
      quantity: 8,
      rate: defaultRate,
      item_date: defaultDate
    });
  };

  if (invoiceLoading || clientsLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/invoices">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">
            {isEditing ? "Edit Invoice" : "Create Invoice"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? "Update invoice details" : "Fill in the details to create a new invoice"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="invoice_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Number</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-invoice-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="client_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-client">
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients?.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {(!clients || clients.length === 0) && (
                        <p className="text-xs text-muted-foreground">
                          No clients yet.{" "}
                          <Link href="/clients/new" className="text-primary hover:underline">
                            Add a client
                          </Link>
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="issue_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} lang="en-US" data-testid="input-issue-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} lang="en-US" data-testid="input-due-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle>Line Items</CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="require-description"
                    checked={requireDescription}
                    onCheckedChange={setRequireDescription}
                    data-testid="switch-require-description"
                  />
                  <Label htmlFor="require-description" className="text-sm cursor-pointer">
                    Require Description
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  data-testid="button-add-item"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-[3fr_3fr_1fr_1fr_1fr_1fr_auto] gap-4 text-sm font-medium text-muted-foreground mb-2">
                  <div>Internal Notes</div>
                  <div>Client Summary</div>
                  <div>Date</div>
                  <div className="text-center">Qty</div>
                  <div className="text-right">Rate</div>
                  <div className="text-right">Amount</div>
                  <div></div>
                </div>

                {fields.map((field, index) => {
                  const qty = Number(watchItems[index]?.quantity) || 0;
                  const rate = Number(watchItems[index]?.rate) || 0;
                  const amount = qty * rate;

                  return (
                    <div key={field.id} className="grid grid-cols-[3fr_3fr_1fr_1fr_1fr_1fr_auto] gap-4 items-start border-b pb-4 mb-4">
                      {/* Raw Description (Internal) */}
                      <div>
                        <FormField
                          control={form.control}
                          name={`items.${index}.raw_description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  rows={2}
                                  placeholder="Detailed work notes"
                                  className="resize-none text-sm"
                                  data-testid={`input-item-raw-description-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Client-Facing Description */}
                      <div className="relative">
                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  rows={2}
                                  placeholder={requireDescription ? "Client summary *" : "Client summary (optional)"}
                                  className="resize-none text-sm"
                                  data-testid={`input-item-description-${index}`}
                                  disabled={generatingIndex === index}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {generatingIndex === index && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          </div>
                        )}
                      </div>

                      {/* Date Column */}
                      <div>
                        <FormField
                          control={form.control}
                          name={`items.${index}.item_date`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  lang="en-US"
                                  className="h-10"
                                  data-testid={`input-item-date-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Quantity Column */}
                      <div>
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  {...field}
                                  className="text-center h-10"
                                  data-testid={`input-item-quantity-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Rate Column */}
                      <div>
                        <FormField
                          control={form.control}
                          name={`items.${index}.rate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  {...field}
                                  className="text-right h-10"
                                  data-testid={`input-item-rate-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Amount Column */}
                      <div className="flex items-center justify-end h-10">
                        <span className="font-semibold tabular-nums text-sm">
                          ${amount.toFixed(2)}
                        </span>
                      </div>

                      {/* Delete Button Column */}
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                          data-testid={`button-remove-item-${index}`}
                          className="h-10 w-10"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-semibold tabular-nums" data-testid="text-subtotal">${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm gap-2">
                        <span className="text-muted-foreground">Tax</span>
                        <div className="flex items-center gap-2">
                          <FormField
                            control={form.control}
                            name="tax_rate"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-1 space-y-0">
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    className="w-16 h-8 text-right"
                                    data-testid="input-tax-rate"
                                    {...field}
                                    value={field.value || 0}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <span className="text-muted-foreground text-xs">%</span>
                              </FormItem>
                            )}
                          />
                          <span className="tabular-nums" data-testid="text-tax">${taxAmount.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Total</span>
                        <span className="tabular-nums" data-testid="text-total">${total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Link href="/invoices">
              <Button type="button" variant="outline" data-testid="button-cancel">
                Cancel
              </Button>
            </Link>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={handleGenerateAllSummaries}
              disabled={isGeneratingAll}
              data-testid="button-generate-summaries"
            >
              {isGeneratingAll ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Summary
                </>
              )}
            </Button>
            <Button
              type="submit"
              className="gap-2"
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                !canSubmit
              }
              data-testid="button-save-invoice"
            >
              <Save className="h-4 w-4" />
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : isEditing
                ? "Update Invoice"
                : "Create Invoice"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default function InvoiceFormPage() {
  const [location] = useLocation();
  const [, params] = useRoute("/invoices/:id");
  const [, editParams] = useRoute("/invoices/:id/edit");

  const invoiceId = params?.id || editParams?.id;
  const isEditing = !!invoiceId && invoiceId !== "new";

  // Check for duplicate mode
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const duplicateId = searchParams.get('duplicate');
  const isDuplicating = !!duplicateId;

  // Always wrap with InvoiceProvider
  // For editing/duplicating: pass the invoice ID
  // For new invoices: pass undefined (provider will still fetch clients list)
  const id = isEditing ? invoiceId : (isDuplicating ? duplicateId : undefined);

  return (
    <InvoiceProvider invoiceId={id}>
      <InvoiceFormContent />
    </InvoiceProvider>
  );
}
