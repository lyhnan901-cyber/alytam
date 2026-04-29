import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building, Phone, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string;
  status: string;
  estimated_value: number | null;
  interest: string[] | null;
}

interface LeadKanbanProps {
  leads: Lead[];
  onUpdate: () => void;
}

const columns = [
  { id: "new", title: "جديد", color: "bg-blue-500" },
  { id: "contacted", title: "تم التواصل", color: "bg-yellow-500" },
  { id: "qualified", title: "مؤهل", color: "bg-purple-500" },
  { id: "proposal", title: "عرض سعر", color: "bg-orange-500" },
  { id: "negotiation", title: "تفاوض", color: "bg-indigo-500" },
  { id: "won", title: "مكتسب", color: "bg-green-500" },
  { id: "lost", title: "خاسر", color: "bg-red-500" },
];

export function LeadKanban({ leads, onUpdate }: LeadKanbanProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [draggedLead, setDraggedLead] = useState<string | null>(null);

  const handleDragStart = (leadId: string) => {
    setDraggedLead(leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (newStatus: string) => {
    if (!draggedLead) return;

    try {
      const { error } = await supabase
        .from("leads")
        .update({ status: newStatus, last_contact_at: new Date().toISOString() })
        .eq("id", draggedLead);

      if (error) throw error;

      toast({ title: "تم تحديث حالة الملف" });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "خطأ في تحديث الحالة",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDraggedLead(null);
    }
  };

  const getLeadsByStatus = (status: string) =>
    leads.filter((lead) => lead.status === status);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => {
        const columnLeads = getLeadsByStatus(column.id);
        const totalValue = columnLeads.reduce(
          (sum, lead) => sum + (lead.estimated_value || 0),
          0
        );

        return (
          <div
            key={column.id}
            className="flex-shrink-0 w-72"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
          >
            <Card className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${column.color}`} />
                    <CardTitle className="text-sm">{column.title}</CardTitle>
                  </div>
                  <Badge variant="secondary">{columnLeads.length}</Badge>
                </div>
                {totalValue > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {totalValue.toLocaleString()} ر.س
                  </p>
                )}
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {columnLeads.map((lead) => (
                      <Card
                        key={lead.id}
                        className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                        draggable
                        onDragStart={() => handleDragStart(lead.id)}
                        onClick={() => navigate(`/leads/${lead.id}`)}
                      >
                        <CardContent className="p-3 space-y-2">
                          <h4 className="font-medium text-sm">{lead.name}</h4>
                          {lead.company && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {lead.company}
                            </p>
                          )}
                          {lead.phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </p>
                          )}
                          {lead.estimated_value && (
                            <p className="text-xs font-medium text-green-600 flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {lead.estimated_value.toLocaleString()} ر.س
                            </p>
                          )}
                          {lead.interest && lead.interest.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {lead.interest.slice(0, 2).map((item, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-[10px] px-1 py-0"
                                >
                                  {item}
                                </Badge>
                              ))}
                              {lead.interest.length > 2 && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1 py-0"
                                >
                                  +{lead.interest.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
