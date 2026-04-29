export const mapFeedItem = (row: any) => {
  // 🚀 Pure Relational Mapping: We only trust the joined member data
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    subtitle: row.subtitle,
    time: row.time,
    status: row.status,
    updatedAt: row.updated_at,
    icon: row.icon || "🔔",
    
    // Identity Mapping from the 'household_members' join
    actor: row.member?.name || "System", 
    avatar: row.member?.avatar || "??",
    color: row.member?.color || "bg-slate-500",
    role: row.member?.role || "CHILD",
    
    actorMemberId: row.actor_member_id,
    recurrence: row.recurrence,
  };
};

