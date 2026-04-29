import { Member } from "../members";
import { FeedItem } from "../types/feed";

export const canApprove = (actor: Member): boolean => {
  return actor.role === "ADMIN"; // Only Dale/Parents can move something out of pending
};

export const canCreate = (actor: Member, type: FeedItem["type"]): boolean => {
  if (actor.role === "ADMIN") return true;
  if (actor.role === "TEEN") return type !== "message"; // 13yo can't broadcast messages yet
  return type === "task"; // Kids can only request tasks (chores)
};

export const canArchive = (actor: Member, item: FeedItem): boolean => {
  if (actor.role === "ADMIN") return true;
  // Use actorMemberId for the real relational check
  return actor.id === item.actorMemberId; 
};

