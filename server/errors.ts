import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { log } from "./index";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      message: err.errors[0].message,
      field: err.errors[0].path.join('.'),
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  log(`[Error] ${status}: ${message}`, "error");
  res.status(status).json({ message });
}
