export type {
  User,
  Tenant,
  TenantMember,
  Service,
  WorkingHours,
  BusyPeriod,
  Appointment,
  Customer,
  Conversation,
  Message,
  TeamMember,
  AISettings,
} from "@prisma/client";

export {
  Role,
  Plan,
  AppointmentStatus,
  BookingChannel,
  ConversationChannel,
  ConversationStatus,
  MessageRole,
} from "@prisma/client";

export interface TenantContext {
  id: string;
  name: string;
  slug: string;
  plan: import("@prisma/client").Plan;
  timezone: string;
  logo: string | null;
  parentTenantId: string | null;
}

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: import("@prisma/client").Role;
}

export interface StatCardData {
  label: string;
  value: string | number;
  delta: number;
  deltaLabel: string;
  sparkline: number[];
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}
