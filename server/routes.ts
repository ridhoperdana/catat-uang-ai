import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { registerChatRoutes } from "./replit_integrations/chat";
import multer from "multer";
import fs from "fs";
import OpenAI from "openai";
import { convertExpenseAmount } from "./utils";
import { z } from "zod";

// Configure upload storage
const upload = multer({ 
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Ensure uploads directory exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register Chat Routes (Integration)
  registerChatRoutes(app);

  // Auth Middleware
  app.use("/api", (req, res, next) => {
    // Skip auth for login/register/logout/user
    const publicPaths = ["/login", "/register", "/logout", "/user"];
    if (publicPaths.some(path => req.path === path)) {
      return next();
    }
    
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).send("Unauthorized");
  });

  // --- Settings ---
  app.get(api.settings.get.path, async (req, res) => {
    const settings = await storage.getSettings(req.user!.id);
    res.json(settings);
  });

  app.patch(api.settings.update.path, async (req, res, next) => {
    try {
      const input = api.settings.update.input!.parse(req.body);
      const updated = await storage.updateSettings(req.user!.id, input);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // --- Expenses ---
  app.get(api.expenses.list.path, async (req, res) => {
    const { startDate, endDate, category } = req.query;
    const expenses = await storage.getExpenses(
      req.user!.id,
      startDate as string, 
      endDate as string, 
      category as string
    );
    res.json(expenses);
  });

  app.post(api.expenses.create.path, async (req, res, next) => {
    try {
      const bodySchema = api.expenses.create.input.extend({
        date: z.coerce.date(),
        amount: z.coerce.number(), // This is the amount in the selected currency
        currency: z.string().default("USD"),
      });
      const input = bodySchema.parse(req.body);
      
      const sessionSettings = await storage.getSettings(req.user!.id);
      const { convertedAmount, rate } = await convertExpenseAmount(
        input.amount,
        input.currency,
        sessionSettings.baseCurrency
      );

      const expense = await storage.createExpense({
        ...input,
        userId: req.user!.id,
        amount: convertedAmount,
        originalAmount: input.amount,
        exchangeRate: rate,
      });
      res.status(201).json(expense);
    } catch (err) {
      next(err);
    }
  });

  app.put(api.expenses.update.path, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getExpense(id);
      if (!existing || existing.userId !== req.user!.id) {
        return res.status(404).json({ message: "Expense not found" });
      }

      const bodySchema = api.expenses.update.input.extend({
        date: z.coerce.date().optional(),
        amount: z.coerce.number().optional(),
        currency: z.string().optional(),
      });
      const input = bodySchema.parse(req.body);
      
      let updateData = { ...input };

      // If amount or currency changed, we might need to re-convert
      if (input.amount !== undefined || input.currency !== undefined) {
        const currency = input.currency || existing.currency || "USD";
        const amount = input.amount !== undefined ? input.amount : (existing.originalAmount || existing.amount);
        
        const sessionSettings = await storage.getSettings(req.user!.id);
        const { convertedAmount, rate } = await convertExpenseAmount(
          amount,
          currency,
          sessionSettings.baseCurrency
        );

        updateData = {
          ...updateData,
          amount: convertedAmount,
          originalAmount: amount,
          currency: currency,
          exchangeRate: rate,
        };
      }

      const updated = await storage.updateExpense(id, updateData);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.delete(api.expenses.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getExpense(id);
    if (!existing || existing.userId !== req.user!.id) {
      return res.status(404).json({ message: "Expense not found" });
    }
    await storage.deleteExpense(id);
    res.status(204).send();
  });

  app.get(api.expenses.stats.path, async (req, res) => {
    const stats = await storage.getStats(req.user!.id);
    res.json(stats);
  });

  // --- Recurring Expenses ---
  app.get(api.recurring.list.path, async (req, res) => {
    const items = await storage.getRecurringExpenses(req.user!.id);
    res.json(items);
  });

  app.post(api.recurring.create.path, async (req, res, next) => {
     try {
      const input = api.recurring.create.input.parse(req.body);
      const item = await storage.createRecurringExpense({
        ...input,
        userId: req.user!.id
      });
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  });

  app.delete(api.recurring.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteRecurringExpense(id);
    res.status(204).send();
  });

  // --- Invoices ---
  app.post(api.invoices.upload.path, upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    
    // In a real app, upload to S3/Object Storage. Here we just return a local path mock or save basic info
    // We'll treat the local path as the "url" for now
    const invoice = await storage.createInvoice({
      userId: req.user!.id,
      fileUrl: req.file.path,
      status: "pending"
    });
    res.status(201).json(invoice);
  });

  app.get(api.invoices.list.path, async (req, res) => {
    const invoices = await storage.getInvoices(req.user!.id);
    res.json(invoices);
  });

  app.post(api.invoices.process.path, async (req, res, next) => {
    const id = parseInt(req.params.id);
    const invoice = await storage.getInvoice(id);
    if (!invoice || invoice.userId !== req.user!.id) return res.status(404).json({ message: "Invoice not found" });

    try {
      // Prioritize user key if they set it in Secrets, else use Replit Integration
      const apiKey = process.env.OPENROUTER_API_KEY || process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY;
      const baseURL = process.env.OPENROUTER_BASE_URL || process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

      if (!apiKey) {
        return res.status(500).json({ message: "No AI API Key configured" });
      }

      const openai = new OpenAI({ apiKey, baseURL });

      // Read file and convert to base64
      const fileBuffer = fs.readFileSync(invoice.fileUrl);
      const base64Image = fileBuffer.toString('base64');
      const dataUrl = `data:image/jpeg;base64,${base64Image}`; // Assuming JPEG for simplicity, usually detect mime type

      const response = await openai.chat.completions.create({
        model: "openai/gpt-4o", // Good vision model
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Extract invoice details: amount (in cents), date (ISO), description, category (Food, Transport, Housing, Utilities, Entertainment, Health, Other), and type (income or expense). Return ONLY JSON." },
              {
                type: "image_url",
                image_url: {
                  url: dataUrl
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Update invoice with data
      await storage.updateInvoice(id, {
        status: "processed",
        processedData: result
      });

      // Auto-create expense if valid
      if (result.amount && result.description) {
        await storage.createExpense({
          userId: req.user!.id,
          amount: result.amount,
          description: result.description,
          date: new Date(result.date || Date.now()),
          category: result.category || "Other",
          type: result.type || "expense",
          isRecurring: false
        });
      }

      res.json({ success: true, data: result });
    } catch (error) {
      await storage.updateInvoice(id, { status: "failed" });
      next(error);
    }
  });

  return httpServer;
}
