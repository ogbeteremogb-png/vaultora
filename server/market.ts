type Price = { symbol: string; name: string; price: number; change: number };
let cache: { expiresAt: number; prices: Price[] } | null = null;
const fallback: Price[] = [
  { symbol: "BTC", name: "Bitcoin", price: 104820.12, change: 2.84 },
  { symbol: "ETH", name: "Ethereum", price: 3842.76, change: 1.42 },
  { symbol: "USDT", name: "Tether", price: 1, change: 0.01 },
];

export async function getMarketPrices(): Promise<Price[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.prices;
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=usd&include_24hr_change=true", { signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error("Market provider unavailable");
    const data = await response.json() as Record<string, { usd: number; usd_24h_change?: number }>;
    const prices: Price[] = [
      { symbol: "BTC", name: "Bitcoin", price: data.bitcoin.usd, change: data.bitcoin.usd_24h_change ?? 0 },
      { symbol: "ETH", name: "Ethereum", price: data.ethereum.usd, change: data.ethereum.usd_24h_change ?? 0 },
      { symbol: "USDT", name: "Tether", price: data.tether.usd, change: data.tether.usd_24h_change ?? 0 },
    ];
    cache = { expiresAt: Date.now() + 60_000, prices };
    return prices;
  } catch {
    cache = { expiresAt: Date.now() + 15_000, prices: fallback };
    return fallback;
  }
}
