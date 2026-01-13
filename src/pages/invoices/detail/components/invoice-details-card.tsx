import type { Client } from "@shared/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettings } from "@/hooks/useSettings";

interface InvoiceDetailsCardProps {
  client?: Client | null;
}

export function InvoiceDetailsCard({ client }: InvoiceDetailsCardProps) {
  const { data: settings } = useSettings();
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
              <p className="font-medium">{settings?.company_name || "Your Company"}</p>
              <p>{settings?.owner_name}</p>
              <p>{settings?.address}</p>
              <p>{settings?.city}, {settings?.state} {settings?.postal_code}</p>
              <p>{settings?.country}</p>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Bill To</h3>
            <div className="text-sm">
              <p className="font-medium">{client?.name || "No client"}</p>
              {client && (
                <>
                  <p>{client.address}</p>
                  <p>{client.city}, {client.state} {client.postal_code}</p>
                  <p>{client.country}</p>
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
