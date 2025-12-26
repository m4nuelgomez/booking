import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("Missing DATABASE_URL in environment");
}

const pool = new Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const businessId = process.env.SEED_BUSINESS_ID ?? "dev-business";
  const businessName = process.env.SEED_BUSINESS_NAME ?? "dev-business";

  // WhatsApp seed
  const phoneNumberId = process.env.SEED_WA_PHONE_NUMBER_ID ?? "";
  const displayNumber = process.env.SEED_WA_DISPLAY_NUMBER ?? "";
  const wabaId = process.env.SEED_WA_WABA_ID
    ? String(process.env.SEED_WA_WABA_ID)
    : null;

  if (!phoneNumberId) throw new Error("Missing SEED_WA_PHONE_NUMBER_ID");

  const business = await prisma.business.upsert({
    where: { id: businessId },
    create: { id: businessId, name: businessName },
    update: { name: businessName },
    select: { id: true, name: true },
  });

  const wa = await prisma.channelAccount.upsert({
    where: {
      channel_providerAccountId: {
        channel: "whatsapp",
        providerAccountId: phoneNumberId,
      },
    },
    create: {
      businessId: business.id,
      channel: "whatsapp",
      providerAccountId: phoneNumberId,
      displayNumber: displayNumber || null,
      config: { wabaId, provider: "meta" },
    },
    update: {
      businessId: business.id,
      displayNumber: displayNumber || null,
      config: { wabaId, provider: "meta" },
    },
    select: {
      id: true,
      businessId: true,
      channel: true,
      providerAccountId: true,
    },
  });

  console.log("Seed OK:", { business, wa });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
