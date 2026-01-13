import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export * from "./models/chat";

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  amount: integer("amount").notNull(), // Converted amount in base currency cents
  originalAmount: integer("original_amount"), // Amount in original currency cents
  currency: text("currency").notNull().default("USD"),
  exchangeRate: text("exchange_rate"), // Use text/numeric for precision
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  category: text("category").notNull(),
  type: text("type").notNull(), // 'income' | 'expense'
  isRecurring: boolean("is_recurring").default(false),
  recurringId: integer("recurring_id"),
});

export const recurringExpenses = pgTable("recurring_expenses", {
  id: serial("id").primaryKey(),
  amount: integer("amount").notNull(), // Stored in cents
  currency: text("currency").notNull().default("USD"),
  description: text("description").notNull(),
  category: text("category").notNull(),
  frequency: text("frequency").notNull(), // 'daily' | 'weekly' | 'monthly' | 'yearly'
  nextDueDate: timestamp("next_due_date").notNull(),
  active: boolean("active").default(true),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  baseCurrency: text("base_currency").notNull().default("USD"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  fileUrl: text("file_url").notNull(),
  processedData: jsonb("processed_data"), // Stores AI extracted data
  createdAt: timestamp("created_at").defaultNow(),
  status: text("status").notNull().default("pending"), // 'pending', 'processed', 'failed'
});

// Schemas
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true });
export const insertRecurringExpenseSchema = createInsertSchema(recurringExpenses).omit({ id: true });
export const insertSettingSchema = createInsertSchema(settings).omit({ id: true, updatedAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });

// Types
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type RecurringExpense = typeof recurringExpenses.$inferSelect;
export type InsertRecurringExpense = z.infer<typeof insertRecurringExpenseSchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
