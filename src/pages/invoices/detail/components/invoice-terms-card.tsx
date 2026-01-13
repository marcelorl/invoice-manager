import { Card, CardContent } from "@/components/ui/card";

interface InvoiceTermsCardProps {
  terms: string;
}

export function InvoiceTermsCard({ terms }: InvoiceTermsCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div>
          <h3 className="text-sm font-medium mb-2">Terms & Conditions</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{terms}</p>
        </div>
      </CardContent>
    </Card>
  );
}
