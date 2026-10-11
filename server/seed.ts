import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { ensureRole } from "./auth";
import { plans, users, wallets } from "../drizzle/schema";

const seedPlans = [
  { slug: "starter", name: "Starter", roiPercent: "8.00", durationDays: 30, minAmount: "100.00000000", maxAmount: "4999.00000000", sortOrder: 1 },
  { slug: "pro", name: "Pro", roiPercent: "18.00", durationDays: 60, minAmount: "5000.00000000", maxAmount: "24999.00000000", sortOrder: 2 },
  { slug: "elite", name: "Elite", roiPercent: "35.00", durationDays: 90, minAmount: "25000.00000000", maxAmount: "1000000.00000000", sortOrder: 3 },
];
const seedWallets = [
  { coin: "BTC", network: "Bitcoin", address: "bc1qvaultora0btcdepositaddress", label: "Primary BTC vault", sortOrder: 1 },
  { coin: "ETH", network: "Ethereum", address: "0xVaultoraEthDepositAddress001", label: "Primary ETH vault", sortOrder: 1 },
  { coin: "USDT", network: "TRC20", address: "TVaultoraUsdtTrc20DepositAddress", label: "Primary USDT vault", sortOrder: 1 },
];

export async function ensureSeedData() {
  const db = await getDb();
  if (!db) return;
  for (const plan of seedPlans) {
    const existing = (await db.select().from(plans).where(eq(plans.slug, plan.slug)).limit(1))[0];
    if (!existing) await db.insert(plans).values({ ...plan, enabled: true });
  }
  for (const wallet of seedWallets) {
    const existing = (await db.select().from(wallets).where(eq(wallets.address, wallet.address)).limit(1))[0];
    if (!existing) await db.insert(wallets).values({ ...wallet, enabled: true });
  }
  const bootstrapEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  if (bootstrapEmail) {
    const user = (await db.select().from(users).where(eq(users.email, bootstrapEmail)).limit(1))[0];
    if (user) await ensureRole(user.id, "admin");
  }
}
