export type FeedStatus = "pending" | "active" | "archived";

export type FeedItem = {
  id: string;
  type: "event" | "task" | "message" | "reminder";
  title: string;
  subtitle?: string;
  time: string;
  status: FeedStatus;
  updatedAt: string;
  
  // Identity (Hydrated)
  actor: string; 
  avatar: string;
  color: string;
  role: string;
  icon: string;
  
  // Relational Link
  actorMemberId?: string;
  recurrence?: "daily" | "weekly" | "none";
};

