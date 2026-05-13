// Shared types for ClientEdit components

export type ClientProtocolItem = {
  id: number;
  clientProtocolId: number;
  protocolItemId: number;
  quantity: number;
  isIncluded: boolean;
  isRecommended: boolean;
  customSchedule: string | null;
  customDuration: string | null;
  customPrice: string | null;
  customNotes: string | null;
  customCategoryName: string | null;
  sortOrder: number;
};

export type ProtocolItem = {
  id: number;
  categoryId: number;
  name: string;
  schedule: string | null;
  duration: string | null;
  price: string | null;
  defaultQty: number | null;
  purpose: string | null;
  notes: string | null;
  affiliateUrl: string | null;
  affiliateCode: string | null;
  itemType: string;
  isActive: boolean;
  sortOrder: number;
};

export type Category = {
  id: number;
  name: string;
  displayName: string | null;
  description: string | null;
  sortOrder: number;
};

export type ClientProtocol = {
  id: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  templateId: number | null;
  durationMonths: number;
  status: "draft" | "pending_approval" | "approved" | "active" | "completed";
  coachingPackage: string | null;
  coachingPrice: string | null;
  discountPercent: number;
  paymentMethod: "venmo" | "cc" | "other" | "paypal";
  venmoHandle: string | null;
  customRequirements: string | null;
  notes: string | null;
  coachNotes: string | null;
  shippingName: string | null;
  shippingStreet: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingZip: string | null;
  shippingCountry: string | null;
  shippingPhone: string | null;
  accessToken: string;
  createdAt: Date;
  updatedAt: Date;
};

export type FormData = {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  templateId: string;
  durationMonths: number;
  status: "draft" | "pending_approval" | "approved" | "active" | "completed";
  clientVisibility: "hidden" | "option" | "active" | "archived";
  coachingPackage: string;
  coachingPrice: string;
  discountPercent: string;
  paymentMethod: "venmo" | "cc" | "other" | "paypal";
  venmoHandle: string;
  customRequirements: string;
  notes: string;
  coachNotes: string;
  shippingName: string;
  shippingStreet: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  shippingCountry: string;
  shippingPhone: string;
  paymentReminderOptOut: boolean;
  versionName: string;
  engagementLevel: "full_coaching" | "self_guided_checkins" | "protocol_only";
};

export type Template = {
  id: number;
  name: string;
  description: string | null;
  durationMonths: number;
  isDefault: boolean;
  hidePricing: boolean;
  autoSync: boolean;
  tags: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Program = {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
};

export type Phase = {
  id: number;
  phaseNumber: number;
  name: string;
  description: string | null;
  goals: string | null;
  templateId?: number | null;
};

export type ClientProgramInfo = {
  program: {
    id: number;
    name: string;
    totalMonths: number;
    description?: string | null;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  } | null;
  currentPhase: Phase | null;
  phases: Phase[] | null;
  phaseStartDate: Date | string | null;
  programStartDate?: Date | null;
} | null;

export type ProtocolComment = {
  id: number;
  clientProtocolId: number;
  userId: number | null;
  authorName: string;
  authorType: "admin" | "client";
  content: string;
  isInternal: boolean;
  createdAt: Date;
};

export type ProgressPhoto = {
  id: number;
  clientProtocolId: number;
  imageUrl: string;
  caption: string | null;
  photoDate: Date;
  createdAt: Date;
};

export type CloneHistory = {
  id: number;
  originalProtocolId: number;
  clonedProtocolId: number;
  clonedAt: Date;
  clonedByUserId: number | null;
  notes: string | null;
};
