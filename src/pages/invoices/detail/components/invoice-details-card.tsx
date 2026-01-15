import type { Client, InvoiceMetadata } from "@shared/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBusinessSettings } from "@/contexts/BusinessSettingsContext";

interface InvoiceDetailsCardProps {
  client?: Client | null;
  metadata?: InvoiceMetadata | null;
}

export function InvoiceDetailsCard({ client, metadata }: InvoiceDetailsCardProps) {
  const { settings } = useBusinessSettings();

  // Prefer metadata (historical snapshot) over live data
  const businessData = metadata?.business || settings;
  const billToData = metadata?.billTo || client;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">From</h3>
            <div className="text-sm">
              <p className="font-medium">{businessData?.company_name || "Your Company"}</p>
              <p>{businessData?.owner_name}</p>
              <p>{businessData?.address}</p>
              <p>{businessData?.city}, {businessData?.state} {businessData?.postal_code}</p>
              <p>{businessData?.country}</p>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Bill To</h3>
            <div className="text-sm">
              <p className="font-medium">{billToData?.name || "No client"}</p>
              {billToData && (
                <>
                  <p>{billToData.address}</p>
                  <p>{billToData.city}, {billToData.state} {billToData.postal_code}</p>
                  <p>{billToData.country}</p>
                </>
              )}
            </div>
          </div>
          <div></div>
        </div>
      </CardContent>
    </Card>
  );
}
