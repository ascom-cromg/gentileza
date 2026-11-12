import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  sender: text("sender").notNull(),
  recipient: text("recipient").notNull(),
  message: text("message").notNull(),
  searchText: text("search_text").notNull(),
  category: text("category").notNull(),
  color: text("color").notNull(),
  actor: text("actor").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("messages_created_idx").on(table.createdAt), index("messages_actor_idx").on(table.actor)]);

export const reactions = sqliteTable("reactions", {
  messageId: text("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  actor: text("actor").notNull(),
}, (table) => [primaryKey({ columns: [table.messageId, table.actor] })]);

// Preserve legacy data. Its public routes are retired; new messages are never
// published to, or stored in, the former mural.
export const staff = sqliteTable("staff", {
  email: text("email").primaryKey(),
  name: text("name").notNull(),
  searchText: text("search_text").notNull(),
  active: integer("active").notNull().default(1),
  updatedAt: integer("updated_at").notNull(),
});

export const deliveries = sqliteTable("deliveries", {
  id: text("id").primaryKey(),
  actor: text("actor").notNull(),
  payloadHash: text("payload_hash").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  status: text("status").notNull(),
  providerId: text("provider_id"),
  createdAt: integer("created_at").notNull(),
}, table => [index("deliveries_actor_created_idx").on(table.actor, table.createdAt)]);

export const directoryImports = sqliteTable("directory_imports", {
  id: text("id").primaryKey(),
  total: integer("total").notNull(),
  activeCount: integer("active_count").notNull(),
  importedAt: integer("imported_at").notNull(),
});

export const googleFlows = sqliteTable("google_flows", {id:text("id").primaryKey(),expiresAt:integer("expires_at").notNull()});
export const googleSessions = sqliteTable("google_sessions", {id:text("id").primaryKey(),subject:text("subject").notNull(),email:text("email").notNull(),name:text("name").notNull(),tokens:text("tokens").notNull(),expiresAt:integer("expires_at").notNull()});
