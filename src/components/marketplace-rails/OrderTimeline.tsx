import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Package, 
  Truck, 
  Home, 
  CreditCard,
  DollarSign,
  AlertTriangle,
  HelpCircle
} from "lucide-react";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface OrderTimelineProps {
  orderId: string;
  orderStatus: string;
  paymentStatus: string | null;
  paidAt: string | null;
}

interface TimelineEvent {
  id: string;
  event_type: string;
  event_note: string | null;
  created_at: string;
  actor_role: string;
}

const TIMELINE_STEPS = [
  { key: "paid", label: "Payment Received", icon: CreditCard },
  { key: "label_created", label: "Label Created", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
  { key: "funds_released", label: "Funds Released", icon: DollarSign },
];

export function OrderTimeline({ orderId, orderStatus, paymentStatus, paidAt }: OrderTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [orderId]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("order_status_events")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[OrderTimeline] Error fetching events:", error);
        setEvents([]);
      } else {
        setEvents(data || []);
      }
    } catch (err) {
      console.error("[OrderTimeline] Failed to fetch events:", err);
    } finally {
      setLoading(false);
    }
  };

  // Infer timeline from order status if no events exist
  const inferredSteps = new Set<string>();
  
  if (events.length > 0) {
    events.forEach(e => inferredSteps.add(e.event_type));
  } else {
    // Read-only inference from existing status
    const status = paymentStatus || orderStatus;
    if (status === "paid" || paidAt) {
      inferredSteps.add("paid");
    }
    if (status === "shipped") {
      inferredSteps.add("paid");
      inferredSteps.add("shipped");
    }
    if (status === "delivered") {
      inferredSteps.add("paid");
      inferredSteps.add("shipped");
      inferredSteps.add("delivered");
    }
    if (status === "completed") {
      inferredSteps.add("paid");
      inferredSteps.add("shipped");
      inferredSteps.add("delivered");
      inferredSteps.add("completed");
      inferredSteps.add("funds_released");
    }
  }

  // Find next step
  const nextStepIndex = TIMELINE_STEPS.findIndex(step => !inferredSteps.has(step.key));
  const nextStep = nextStepIndex >= 0 ? TIMELINE_STEPS[nextStepIndex] : null;

  const getEventTime = (eventType: string): string | null => {
    const event = events.find(e => e.event_type === eventType);
    return event?.created_at || null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Order Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 bg-muted rounded-full" />
                <div className="h-4 w-32 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Order Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {TIMELINE_STEPS.map((step, index) => {
            const isCompleted = inferredSteps.has(step.key);
            const eventTime = getEventTime(step.key);
            const Icon = step.icon;
            const isNext = nextStep?.key === step.key;

            return (
              <div key={step.key} className="relative">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`
                      flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                      ${isCompleted 
                        ? "bg-primary text-primary-foreground" 
                        : isNext 
                          ? "bg-primary/20 text-primary border-2 border-primary border-dashed"
                          : "bg-muted text-muted-foreground"
                      }
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.label}
                      </span>
                      {isNext && (
                        <Badge variant="outline" className="text-xs">
                          What's next?
                        </Badge>
                      )}
                    </div>
                    {eventTime && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {format(new Date(eventTime), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    )}
                    {!eventTime && isCompleted && paidAt && step.key === "paid" && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {format(new Date(paidAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Connector line */}
                {index < TIMELINE_STEPS.length - 1 && (
                  <div
                    className={`
                      absolute left-5 top-10 w-0.5 h-6 -translate-x-1/2
                      ${isCompleted ? "bg-primary" : "bg-muted"}
                    `}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Hold/Dispute indicators */}
        {events.some(e => e.event_type === "funds_on_hold") && (
          <>
            <Separator className="my-4" />
            <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-lg border border-warning/30">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div>
                <p className="font-medium text-sm">Funds On Hold</p>
                <p className="text-xs text-muted-foreground">
                  Payout is temporarily held for verification.
                </p>
              </div>
            </div>
          </>
        )}

        {events.length === 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-start gap-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Timeline is inferred from order status. Detailed tracking will be added as events occur.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
