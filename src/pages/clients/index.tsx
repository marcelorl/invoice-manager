import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Client, EmailTemplate } from "@shared/types";
import { queryClient } from "@/lib/queryClient";
import * as api from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Users, Edit, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { GoogleDrivePicker } from "./components/google-drive-picker";

const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  rate: z.number().min(0, "Rate must be positive").optional(),
  reminder_type: z.enum(["weekly_friday", "monthly_end", "none"]).optional(),
  email_template_id: z.string().optional().or(z.literal("")),
  google_drive_folder_url: z.string().optional().or(z.literal("")),
  target_email: z.string().email("Invalid email").optional().or(z.literal("")),
  cc_email: z.string().email("Invalid email").optional().or(z.literal("")),
  terms: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export default function ClientsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: api.getClients,
  });

  const { data: emailTemplates } = useQuery<EmailTemplate[]>({
    queryKey: ["email-templates"],
    queryFn: api.getEmailTemplates,
  });

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      state: "",
      postal_code: "",
      country: "",
      rate: 0,
      reminder_type: "none",
      email_template_id: "",
      google_drive_folder_url: "",
      target_email: "",
      cc_email: "",
      terms: "Please make the payment by the due date.",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ClientFormValues) => api.createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Client created successfully" });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({ title: "Error creating client", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ClientFormValues) => api.updateClient(editingClient!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Client updated successfully" });
      setDialogOpen(false);
      setEditingClient(null);
      form.reset();
    },
    onError: (error) => {
      toast({ title: "Error updating client", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Client deleted" });
    },
    onError: (error) => {
      toast({ title: "Error deleting client", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: ClientFormValues) => {
    const sanitizedData = {
      ...data,
      reminder_type: data.reminder_type === "none" ? null : data.reminder_type,
      email_template_id: data.email_template_id || null,
      google_drive_folder_url: data.google_drive_folder_url || null,
      target_email: data.target_email || null,
      cc_email: data.cc_email || null,
    };
    if (editingClient) {
      updateMutation.mutate(sanitizedData as ClientFormValues);
    } else {
      createMutation.mutate(sanitizedData as ClientFormValues);
    }
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    form.reset({
      name: client.name,
      address: client.address,
      city: client.city,
      state: client.state,
      postal_code: client.postal_code,
      country: client.country,
      rate: client.rate,
      reminder_type: client.reminder_type as "weekly_friday" | "monthly_end" | "none",
      email_template_id: client.email_template_id,
      google_drive_folder_url: client.google_drive_folder_url || "",
      target_email: client.target_email,
      cc_email: client.cc_email || "",
      terms: client.terms,
    });
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingClient(null);
    form.reset({
      name: "",
      address: "",
      city: "",
      state: "",
      postal_code: "",
      country: "",
      rate: 0,
      reminder_type: "none",
      email_template_id: "",
      google_drive_folder_url: "",
      target_email: "",
      cc_email: "",
      terms: "Please make the payment by the due date.",
    });
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-muted-foreground">Manage your clients and contacts</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openNewDialog} data-testid="button-add-client">
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingClient ? "Edit Client" : "Add Client"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company / Client Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Acme Inc." data-testid="input-client-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly Rate (USD)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          data-testid="input-client-rate"
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Default rate for invoice line items
                      </p>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="123 Main Street" data-testid="input-client-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="New York" data-testid="input-client-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="NY" data-testid="input-client-state" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="postal_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="10001" data-testid="input-client-postal" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="United States" data-testid="input-client-country" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Separator className="my-4" />
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Reminder Settings</h3>
                
                <FormField
                  control={form.control}
                  name="reminder_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Reminder Schedule</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-reminder-type">
                            <SelectValue placeholder="Select reminder schedule" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No automatic reminders</SelectItem>
                          <SelectItem value="weekly_friday">Weekly (every Friday)</SelectItem>
                          <SelectItem value="monthly_end">Monthly (last day of month)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email_template_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Template</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(val === "none" ? "" : val)} 
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-email-template">
                            <SelectValue placeholder="Select email template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No template selected</SelectItem>
                          {emailTemplates?.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="google_drive_folder_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Google Drive Folder URL</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://drive.google.com/drive/folders/..."
                            data-testid="input-google-drive-folder"
                          />
                        </FormControl>
                        <GoogleDrivePicker
                          onFolderSelected={(folderUrl, folderName) => {
                            field.onChange(folderUrl);
                          }}
                        />
                      </div>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Invoices for this client will be saved to this Google Drive folder
                      </p>
                    </FormItem>
                  )}
                />

                <Separator className="my-4" />
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Email Recipients</h3>

                <FormField
                  control={form.control}
                  name="target_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Send Invoice To</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="billing@example.com"
                          data-testid="input-target-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cc_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CC Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="accounts@example.com"
                          data-testid="input-cc-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator className="my-4" />
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Invoice Settings</h3>

                <FormField
                  control={form.control}
                  name="terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Terms & Conditions</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={3}
                          placeholder="Please make the payment by the due date."
                          data-testid="input-client-terms"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        These terms will appear on all invoices for this client
                      </p>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-client"
                  >
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Client"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {clients && clients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id} data-testid={`row-client-${client.id}`}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {[client.city, client.state, client.country].filter(Boolean).join(", ") || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(client)}
                          data-testid={`button-edit-client-${client.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              data-testid={`button-delete-client-${client.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Client?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete {client.name}. Existing invoices will not be affected.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(client.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No clients yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first client to start creating invoices
              </p>
              <Button onClick={openNewDialog} data-testid="button-add-first-client">
                Add Client
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
