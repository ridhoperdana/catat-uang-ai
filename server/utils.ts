import axios from "axios";
import { getCurrencyMetadata } from "@shared/schema";

export async function getExchangeRate(from: string, to: string): Promise<number> {
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

export async function convertExpenseAmount(
  amount: number,
  currency: string,
  baseCurrency: string
) {
  const baseMeta = getCurrencyMetadata(baseCurrency);
  const inputMeta = getCurrencyMetadata(currency);
  
  const inputScale = Math.pow(10, inputMeta.decimals);
  const baseScale = Math.pow(10, baseMeta.decimals);

  if (currency === baseCurrency) {
    return {
      convertedAmount: amount,
      rate: "1.0"
    };
  }

  const numericRate = await getExchangeRate(currency, baseCurrency);
  const convertedAmount = Math.round((amount / inputScale) * numericRate * baseScale);
  
  return {
    convertedAmount,
    rate: numericRate.toString()
  };
}
