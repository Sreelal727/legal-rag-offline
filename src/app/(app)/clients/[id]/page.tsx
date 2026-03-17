export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, MapPin, FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppMessageDialog } from "@/components/whatsapp-message-dialog";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      caseClients: {
        include: { case: true },
      },
      notices: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!client) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/clients">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold">{client.name}</h1>
            <Badge variant="secondary">{client.clientType}</Badge>
          </div>
          {client.phone && (
            <WhatsAppMessageDialog
              clientId={client.id}
              clientName={client.name}
              clientPhone={client.phone}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {client.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" /> {client.email}
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" /> {client.phone}
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" /> {client.address}
              </div>
            )}
            {client.panNumber && <p className="text-sm"><strong>PAN:</strong> {client.panNumber}</p>}
            {client.aadharNumber && <p className="text-sm"><strong>Aadhar:</strong> {client.aadharNumber}</p>}
            {client.gstNumber && <p className="text-sm"><strong>GST:</strong> {client.gstNumber}</p>}
            {client.notes && (
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Associated Cases</CardTitle>
          </CardHeader>
          <CardContent>
            {client.caseClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cases</p>
            ) : (
              <div className="space-y-3">
                {client.caseClients.map((cc) => (
                  <Link
                    key={cc.id}
                    href={`/cases/${cc.case.id}`}
                    className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{cc.case.caseNumber}</p>
                      <p className="text-xs text-muted-foreground">{cc.case.title}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={cc.case.status === "ACTIVE" ? "default" : "secondary"}>
                        {cc.case.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">{cc.role}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
