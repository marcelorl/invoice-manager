import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { EmailTemplate } from "@shared/types";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";
import { useCreateEmailTemplate } from "./hooks/useCreateEmailTemplate";
import { useUpdateEmailTemplate } from "./hooks/useUpdateEmailTemplate";
import { useDeleteEmailTemplate } from "./hooks/useDeleteEmailTemplate";
import { TemplateCard } from "./components/template-card";
import { TemplateFormDialog } from "./components/template-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Mail, Edit, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { DefaultEditor } from "react-simple-wysiwyg";
import { templateSchema } from "./types";
import type { TemplateFormValues } from "./types";

export default function TemplatesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  const { data: templates, isLoading } = useEmailTemplates();

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      subject: "",
      body: "",
    },
  });

  const createMutation = useCreateEmailTemplate();

  const updateMutation = useUpdateEmailTemplate();

  const deleteMutation = useDeleteEmailTemplate();

  const onSubmit = (data: TemplateFormValues) => {
    if (editingTemplate) {
      updateMutation.mutate(
        { id: editingTemplate.id, data },
        {
          onSuccess: () => {
            setDialogOpen(false);
            setEditingTemplate(null);
            form.reset();
          },
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          setDialogOpen(false);
          form.reset();
        },
      });
    }
  };

  const openEditDialog = (template: EmailTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      subject: template.subject,
      body: template.body,
    });
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingTemplate(null);
    form.reset({
      name: "",
      subject: "Invoice {invoice_number} from Your Company",
      body: `<p>Dear {client_name},</p>
<p>Please find attached invoice {invoice_number} for {amount}.</p>
<p>The payment is due by {due_date}.</p>
<p>If you have any questions, please don't hesitate to contact us.</p>
<p>Thank you for your business!</p>
<p>Best regards,<br>Your Company</p>`,
    });
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Email Templates</h1>
          <p className="text-muted-foreground">Create and manage email templates for sending invoices</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openNewDialog} data-testid="button-add-template">
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Standard Invoice" data-testid="input-template-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Subject</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Invoice {invoice_number}" data-testid="input-template-subject" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message Body</FormLabel>
                      <FormControl>
                        <div className="border rounded-md" data-testid="input-template-body">
                          <DefaultEditor
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            style={{ minHeight: '300px' }}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Available variables: {'{client_name}'}, {'{invoice_number}'}, {'{amount}'}, {'{due_date}'}
                      </FormDescription>
                      <FormMessage />
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
                    data-testid="button-save-template"
                  >
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Template"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {templates && templates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <Card key={template.id} data-testid={`card-template-${template.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {template.name}
                    </CardTitle>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(template)}
                    data-testid={`button-edit-template-${template.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`button-delete-template-${template.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the "{template.name}" template.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(template.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Subject</p>
                    <p className="text-sm font-medium">{template.subject}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Preview</p>
                    <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                      {template.body}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">No templates yet</h3>
            <p className="text-muted-foreground mb-4">
              Create email templates to quickly send invoices
            </p>
            <Button onClick={openNewDialog} data-testid="button-create-first-template">
              Create Template
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
