import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- USERS & PROFILES ---
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deviceId: text("device_id").notNull().unique(), // Anonymous device tracking for frictionless auth
  role: text("role").default("citizen"), // 'citizen' or 'admin'
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch() * 1000)`),
}, (t) => ({
  deviceIdIdx: index("device_id_idx").on(t.deviceId),
}));

export const userProfiles = sqliteTable("user_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id).notNull(),
  age: integer("age"),
  state: text("state"),
  district: text("district"),
  occupation: text("occupation"),
  studentStatus: text("student_status"),
  farmerStatus: text("farmer_status"),
  employmentStatus: text("employment_status"),
  gender: text("gender"),
  incomeRange: text("income_range"),
  disabilityStatus: text("disability_status"),
  housingStatus: text("housing_status"),
  educationLevel: text("education_level"),
  familySize: integer("family_size"),
  ruralUrban: text("rural_urban"), // 'rural' or 'urban'
  lastUpdated: integer("last_updated", { mode: "timestamp" }).default(sql`(unixepoch() * 1000)`),
}, (t) => ({
  userIdIdx: index("profile_user_id_idx").on(t.userId),
}));

// --- SCHEMES ---
export const schemes = sqliteTable("schemes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  nameHindi: text("name_hindi"),
  nameKannada: text("name_kannada"),
  category: text("category").notNull(),
  source: text("source").notNull(),
  description: text("description").notNull(),
  beneficiaries: text("beneficiaries"), // E.g., "Farmer", "Student"
  state: text("state").default("Pan India"),
  district: text("district"),
  eligibility: text("eligibility").notNull(), // High level text
  benefits: text("benefits").notNull(),
  documents: text("documents").notNull(), // Legacy text field, migrating to schemeDocuments
  applicationMode: text("application_mode"), // "Online", "Offline", "Both"
  applicationProcess: text("application_process").notNull(),
  officialLink: text("official_link"),
  sourceUrl: text("source_url"),
  sourceName: text("source_name").default("Official Government Portal"),
  lastVerified: integer("last_verified", { mode: "timestamp" }),
  status: text("status").default("Verified"), // "Verified", "Needs Review", "Outdated"
  tags: text("tags", { mode: "json" }).$type<string[]>(),
  keywords: text("keywords", { mode: "json" }).$type<string[]>(),
}, (t) => ({
  categoryIdx: index("scheme_category_idx").on(t.category),
  stateIdx: index("scheme_state_idx").on(t.state),
  sourceIdx: index("scheme_source_idx").on(t.source),
  statusIdx: index("scheme_status_idx").on(t.status),
}));

// --- ELIGIBILITY RULES (STRUCTURED) ---
export const schemeEligibilityRules = sqliteTable("scheme_eligibility_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  schemeId: integer("scheme_id").references(() => schemes.id).notNull(),
  ruleType: text("rule_type").notNull(), // e.g., "age", "income", "occupation"
  operator: text("operator").notNull(), // e.g., ">=", "<=", "==", "in"
  value: text("value").notNull(), // serialized value
  description: text("description"), // e.g., "Must be over 18 years old"
});

// --- DOCUMENTS (STRUCTURED) ---
export const schemeDocuments = sqliteTable("scheme_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  schemeId: integer("scheme_id").references(() => schemes.id).notNull(),
  documentName: text("document_name").notNull(),
  reasonRequired: text("reason_required"),
  isOptional: integer("is_optional", { mode: "boolean" }).default(false),
});

// --- SAVED SCHEMES & APPLICATIONS ---
export const savedSchemes = sqliteTable("saved_schemes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id).notNull(),
  schemeId: integer("scheme_id").references(() => schemes.id).notNull(),
  savedAt: integer("saved_at", { mode: "timestamp" }).default(sql`(unixepoch() * 1000)`),
}, (t) => ({
  savedUserIdIdx: index("saved_user_id_idx").on(t.userId),
}));

export const applications = sqliteTable("applications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id).notNull(),
  schemeId: integer("scheme_id").references(() => schemes.id).notNull(),
  status: text("status").notNull().default("Interested"), // Interested, Preparing, Applied, Approved, Rejected
  applicationDate: integer("application_date", { mode: "timestamp" }),
  referenceNumber: text("reference_number"),
  notes: text("notes"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch() * 1000)`),
}, (t) => ({
  appUserIdIdx: index("app_user_id_idx").on(t.userId),
}));

// --- CONVERSATIONS ---
export const conversations = sqliteTable("conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  deviceId: text("device_id"),
  startedAt: integer("started_at", { mode: "timestamp" }).default(sql`(unixepoch() * 1000)`),
});

export const conversationMessages = sqliteTable("conversation_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  sender: text("sender").notNull(), // "user" or "bot"
  message: text("message").notNull(),
  intent: text("intent"), // only populated if sender is "user"
  language: text("language").default("en"),
  timestamp: integer("timestamp", { mode: "timestamp" }).default(sql`(unixepoch() * 1000)`),
});

// --- SEARCH HISTORY ---
export const searchHistory = sqliteTable("search_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  deviceId: text("device_id"),
  query: text("query").notNull(),
  filters: text("filters", { mode: "json" }),
  timestamp: integer("timestamp", { mode: "timestamp" }).default(sql`(unixepoch() * 1000)`),
});


// --- ZOD SCHEMAS & TYPES ---
export const insertSchemeSchema = createInsertSchema(schemes).omit({ id: true });
export const insertConversationMessageSchema = createInsertSchema(conversationMessages);

// Type Exports
export type Scheme = typeof schemes.$inferSelect;
export type InsertScheme = typeof schemes.$inferInsert;

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

export type SavedScheme = typeof savedSchemes.$inferSelect;
export type InsertSavedScheme = typeof savedSchemes.$inferInsert;

export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type InsertConversationMessage = typeof conversationMessages.$inferInsert;

export type SchemeEligibilityRule = typeof schemeEligibilityRules.$inferSelect;
export type SchemeDocument = typeof schemeDocuments.$inferSelect;

export type ChatRequest = {
  message: string;
  language?: string; 
};

export type ChatResponse = {
  response: string;
  intent: string;
  schemes?: Scheme[]; 
  suggestedQuestions?: string[];
};
