// Shared between the Quick Message button menu (which needs prompts too)
// and anywhere the sent history is displayed, so labels can't drift apart.
export const QUICK_MESSAGE_TYPES = [
  "pickup_on_way",
  "pickup_arrived",
  "pickup_cant_reach",
  "pickup_15min",
  "pickup_ready",
  "dropoff_on_way",
  "no_response_warning",
  "leave_review_or_tip",
] as const;

export type QuickMessageType = (typeof QUICK_MESSAGE_TYPES)[number];

export const QUICK_MESSAGE_LABELS: Record<QuickMessageType, string> = {
  pickup_on_way: "On my way (mobile pickup)",
  pickup_arrived: "I've arrived (mobile pickup)",
  pickup_cant_reach: "Can't reach client",
  pickup_15min: "15 min until ready",
  pickup_ready: "Ready for pickup",
  dropoff_on_way: "Drop-off on my way",
  no_response_warning: "Unable to contact — need a response",
  leave_review_or_tip: "Leave a Review or Tip",
};
