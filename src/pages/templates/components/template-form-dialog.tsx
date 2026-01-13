import type { EmailTemplate } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DefaultEditor from "react-simple-wysiwyg";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTemplate: EmailTemplate | null;
  control: any;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function TemplateFormDialog({
  open,
  onOpenChange,
  editingTemplate,
  control,
  onSubmit,
  isPending,
}: TemplateFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <FormField
            control={control}
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
            control={control}
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
            control={control}
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              data-testid="button-save-template"
            >
              {isPending ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
