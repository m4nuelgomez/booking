import { prisma } from "../src/lib/prisma";
import { normalizePhone } from "../src/lib/phone";

async function main() {
  // Clients
  const clients = await prisma.client.findMany({
    select: { id: true, phone: true },
  });

  for (const c of clients) {
    const p = normalizePhone(c.phone);
    if (p !== c.phone) {
      await prisma.client.update({
        where: { id: c.id },
        data: { phone: p },
      });
    }
  }

  // Conversations
  const convos = await prisma.conversation.findMany({
    select: { id: true, contactPhone: true },
  });

  for (const c of convos) {
    const p = normalizePhone(c.contactPhone);
    if (p !== c.contactPhone) {
      await prisma.conversation.update({
        where: { id: c.id },
        data: { contactPhone: p },
      });
    }
  }

  console.log("✅ Backfill complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
