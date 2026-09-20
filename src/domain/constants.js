export const ROLES = ["owner", "manager", "staff", "read_only"];

export const ROLE_LABELS = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
  read_only: "Read only",
};

export const LEAD_PRIORITIES = ["low", "normal", "high", "urgent"];

export const DEFAULT_PIPELINE_STAGES = [
  { name: "New", probability: 10, probability_percentage: 10, color: "#94a3b8" },
  { name: "Contacted", probability: 25, probability_percentage: 25, color: "#60a5fa" },
  { name: "Qualified", probability: 40, probability_percentage: 40, color: "#38bdf8" },
  { name: "Quote Sent", probability: 60, probability_percentage: 60, color: "#fbbf24" },
  { name: "Negotiation", probability: 75, probability_percentage: 75, color: "#f97316" },
  { name: "Won", probability: 100, probability_percentage: 100, color: "#22c55e", is_closed: true, is_won: true },
  { name: "Lost", probability: 0, probability_percentage: 0, color: "#ef4444", is_closed: true, is_lost: true },
];

export const PLAN_LIMITS = {
  starter: { users: 3 },
  business: { users: 15 },
  professional: { users: 50 },
  enterprise: { users: 999 },
};

export const CONTACT_METHODS = ["phone", "email", "whatsapp", "sms", "social_media", "other"];
export const LIFECYCLE_STATUSES = ["lead", "prospect", "customer", "inactive_customer", "partner", "supplier", "other"];

export const TEMPLATE_CATEGORIES = [
  "lead_response",
  "follow_up",
  "quote_follow_up",
  "appointment",
  "thank_you",
  "reactivation",
  "marketing",
  "custom",
];
