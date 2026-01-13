import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getCurrencyMetadata } from "@shared/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAmount(amount: number, currency: string = "USD") {
  const metadata = getCurrencyMetadata(currency);
  const scale = Math.pow(10, metadata.decimals);
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: metadata.decimals,
  }).format(amount / scale);
}
