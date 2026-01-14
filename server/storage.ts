import { expenses, recurringExpenses, invoices, type Expense, type InsertExpense, type RecurringExpense, type InsertRecurringExpense, type Invoice, type InsertInvoice, conversations, messages, settings, type Setting, type InsertSetting, users, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { IChatStorage } from "./replit_integrations/chat/storage";

export interface IStorage extends IChatStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Expenses
  getExpenses(userId: number, startDate?: string, endDate?: string, category?: string): Promise<Expense[]>;
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense & { userId: number }): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<void>;
  getStats(userId: number): Promise<{ totalIncome: number; totalExpense: number; balance: number; monthlyIncome: number }>;

  // Recurring
  getRecurringExpenses(userId: number): Promise<RecurringExpense[]>;
  createRecurringExpense(expense: InsertRecurringExpense & { userId: number }): Promise<RecurringExpense>;
  deleteRecurringExpense(id: number): Promise<void>;

  // Invoices
  createInvoice(invoice: InsertInvoice & { userId: number }): Promise<Invoice>;
  getInvoices(userId: number): Promise<Invoice[]>;
  updateInvoice(id: number, updates: Partial<Invoice>): Promise<Invoice | undefined>;
  getInvoice(id: number): Promise<Invoice | undefined>;

  // Settings
  getSettings(userId: number): Promise<Setting>;
  updateSettings(userId: number, updates: Partial<InsertSetting>): Promise<Setting>;
}

export class DatabaseStorage implements IStorage {
  // Settings Implementation
  async getSettings(userId: number): Promise<Setting> {
    const [existing] = await db.select().from(settings).where(eq(settings.userId, userId));
    if (!existing) {
      const [created] = await db.insert(settings).values({ userId, baseCurrency: "USD" }).returning();
      return created;
    }
    return existing;
  }

  async updateSettings(userId: number, updates: Partial<InsertSetting>): Promise<Setting> {
    const existing = await this.getSettings(userId);
    const [updated] = await db.update(settings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(settings.id, existing.id))
      .returning();
    return updated;
  }

  // User Implementation
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Chat Implementation (required by interface but implemented in replit_integrations)
  async getConversation(id: number) {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }
  async getAllConversations() {
    return db.select().from(conversations).orderBy(desc(conversations.createdAt));
  }
  async createConversation(title: string) {
    const [conversation] = await db.insert(conversations).values({ title }).returning();
    return conversation;
  }
  async deleteConversation(id: number) {
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  }
  async getMessagesByConversation(conversationId: number) {
    return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  }
  async createMessage(conversationId: number, role: string, content: string) {
    const [message] = await db.insert(messages).values({ conversationId, role, content }).returning();
    return message;
  }

  // Expense Implementation
  async getExpenses(userId: number, startDate?: string, endDate?: string, category?: string): Promise<Expense[]> {
    const conditions = [eq(expenses.userId, userId)];
    if (startDate) conditions.push(gte(expenses.date, new Date(startDate)));
    if (endDate) conditions.push(lte(expenses.date, new Date(endDate)));
    if (category) conditions.push(eq(expenses.category, category));

    return await db.select()
      .from(expenses)
      .where(and(...conditions))
      .orderBy(desc(expenses.date));
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    const [result] = await db.select().from(expenses).where(eq(expenses.id, id));
    return result;
  }

  async createExpense(insertExpense: InsertExpense & { userId: number }): Promise<Expense> {
    const [expense] = await db.insert(expenses).values(insertExpense).returning();
    return expense;
  }

  async updateExpense(id: number, updates: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [updated] = await db.update(expenses)
      .set(updates)
      .where(eq(expenses.id, id))
      .returning();
    return updated;
  }

  async deleteExpense(id: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  async getStats(userId: number): Promise<{ totalIncome: number; totalExpense: number; balance: number; monthlyIncome: number }> {
    const allExpenses = await db.select().from(expenses).where(eq(expenses.userId, userId));
    
    let totalIncome = 0;
    let totalExpense = 0;
    
    allExpenses.forEach(e => {
      if (e.type === 'income') totalIncome += e.amount;
      else totalExpense += e.amount;
    });

    const balance = totalIncome - totalExpense;
    
    // Simple monthly income calc (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyIncome = allExpenses
      .filter(e => e.type === 'income' && new Date(e.date) >= startOfMonth)
      .reduce((acc, curr) => acc + curr.amount, 0);

    return { totalIncome, totalExpense, balance, monthlyIncome };
  }

  // Recurring
  async getRecurringExpenses(userId: number): Promise<RecurringExpense[]> {
    return await db.select().from(recurringExpenses).where(and(eq(recurringExpenses.userId, userId), eq(recurringExpenses.active, true)));
  }

  async createRecurringExpense(insertRecurring: InsertRecurringExpense & { userId: number }): Promise<RecurringExpense> {
    const [recurring] = await db.insert(recurringExpenses).values(insertRecurring).returning();
    return recurring;
  }

  async deleteRecurringExpense(id: number): Promise<void> {
    await db.update(recurringExpenses).set({ active: false }).where(eq(recurringExpenses.id, id));
  }

  // Invoices
  async createInvoice(insertInvoice: InsertInvoice & { userId: number }): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values(insertInvoice).returning();
    return invoice;
  }

  async getInvoices(userId: number): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.createdAt));
  }

  async updateInvoice(id: number, updates: Partial<Invoice>): Promise<Invoice | undefined> {
    const [updated] = await db.update(invoices).set(updates).where(eq(invoices.id, id)).returning();
    return updated;
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }
}

export const storage = new DatabaseStorage();
