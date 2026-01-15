import { Card, CardContent } from "@/components/ui/card";
import type { InvoiceMetadata } from "@shared/types";

interface InvoiceTermsCardProps {
  terms?: string;
  metadata?: InvoiceMetadata | null;
}

export function InvoiceTermsCard({ terms, metadata }: InvoiceTermsCardProps) {
  // Prefer metadata (historical snapshot) over live data
  const displayTerms = metadata?.terms || terms || '';

  if (!displayTerms) {
    return null;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div>
          <h3 className="text-sm font-medium mb-2">Terms & Conditions</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{displayTerms}</p>
        </div>
      </CardContent>
    </Card>
  );
}
