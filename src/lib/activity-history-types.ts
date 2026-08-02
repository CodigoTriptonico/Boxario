export type ActivityHistoryRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  title: string;
  description: string;
  actorName: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};
