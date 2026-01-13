import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { registerChatRoutes } from "./replit_integrations/chat";
import multer from "multer";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import axios from "axios";

// Configure upload storage
const upload = multer({ 
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Ensure uploads directory exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

async function getExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;
  try {
    const response = await axios.get(`https://open.er-api.com/v6/latest/${from}`);
    const rate = response.data.rates[to];
    if (!rate) throw new Error(`Rate not found for ${to}`);
    return rate;
  } catch (error) {
    console.error("Exchange rate error:", error);
    throw new Error("Failed to fetch exchange rate");
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register Chat Routes (Integration)
  registerChatRoutes(app);

  // --- Settings ---
  app.get(api.settings.get.path, async (req, res) => {
    const settings = await storage.getSettings();
    res.json(settings);
  });

  app.patch(api.settings.update.path, async (req, res) => {
    try {
      const input = api.settings.update.input!.parse(req.body);
      const updated = await storage.updateSettings(input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // --- Expenses ---
  app.get(api.expenses.list.path, async (req, res) => {
    const { startDate, endDate, category } = req.query;
    const expenses = await storage.getExpenses(
      startDate as string, 
      endDate as string, 
      category as string
    );
    res.json(expenses);
  });

  app.post(api.expenses.create.path, async (req, res) => {
    try {
      const bodySchema = api.expenses.create.input.extend({
        date: z.coerce.date(),
        amount: z.coerce.number(), // This is the amount in the selected currency
        currency: z.string().default("USD"),
      });
      const input = bodySchema.parse(req.body);
      
      const sessionSettings = await storage.getSettings();
      const baseCurrency = sessionSettings.baseCurrency;
      
      let convertedAmount = input.amount;
      let rate = "1.0";
      
      if (input.currency !== baseCurrency) {
        const numericRate = await getExchangeRate(input.currency, baseCurrency);
        convertedAmount = Math.round(input.amount * numericRate);
        rate = numericRate.toString();
      }

      const expense = await storage.createExpense({
        ...input,
        amount: convertedAmount,
        originalAmount: input.amount,
        exchangeRate: rate,
      });
      res.status(201).json(expense);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.expenses.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getExpense(id);
      if (!existing) return res.status(404).json({ message: "Expense not found" });

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
        
        const sessionSettings = await storage.getSettings();
        const baseCurrency = sessionSettings.baseCurrency;
        
        let convertedAmount = amount;
        let rate = "1.0";
        
        if (currency !== baseCurrency) {
          const numericRate = await getExchangeRate(currency, baseCurrency);
          convertedAmount = Math.round(amount * numericRate);
          rate = numericRate.toString();
        }

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
       if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.expenses.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteExpense(id);
    res.status(204).send();
  });

  app.get(api.expenses.stats.path, async (req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  // --- Recurring Expenses ---
  app.get(api.recurring.list.path, async (req, res) => {
    const items = await storage.getRecurringExpenses();
    res.json(items);
  });

  app.post(api.recurring.create.path, async (req, res) => {
     try {
      const input = api.recurring.create.input.parse(req.body);
      const item = await storage.createRecurringExpense(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
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
      fileUrl: req.file.path,
      status: "pending"
    });
    res.status(201).json(invoice);
  });

  app.get(api.invoices.list.path, async (req, res) => {
    const invoices = await storage.getInvoices();
    res.json(invoices);
  });

  app.post(api.invoices.process.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const invoice = await storage.getInvoice(id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

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
      const updated = await storage.updateInvoice(id, {
        status: "processed",
        processedData: result
      });

      // Auto-create expense if valid
      if (result.amount && result.description) {
        await storage.createExpense({
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
      console.error("Invoice processing error:", error);
      await storage.updateInvoice(id, { status: "failed" });
      res.status(500).json({ message: "Failed to process invoice" });
    }
  });

  // --- Seed Data ---
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existing = await storage.getExpenses();
  if (existing.length === 0) {
    const today = new Date();
    await storage.createExpense({
      amount: 5000,
      description: "Groceries",
      date: today,
      category: "Food",
      type: "expense",
      isRecurring: false
    });
    await storage.createExpense({
      amount: 120000,
      description: "Salary",
      date: today,
      category: "Income",
      type: "income",
      isRecurring: false
    });
    await storage.createRecurringExpense({
      amount: 1500, // $15.00
      description: "Netflix",
      category: "Entertainment",
      frequency: "monthly",
      nextDueDate: new Date(today.getFullYear(), today.getMonth() + 1, 1),
      active: true
    });
  }
}
