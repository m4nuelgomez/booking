import { prisma } from "../src/lib/prisma";

const DEFAULT_BUSINESS_ID = process.env.DEFAULT_BUSINESS_ID ?? "dev-business";

async function main() {
  const convos = await prisma.conversation.findMany({
    where: { businessId: DEFAULT_BUSINESS_ID },
    select: { id: true, contactPhone: true, clientId: true },
  });

  for (const c of convos) {
    if (c.clientId) continue;

    const client = await prisma.client.findUnique({
      where: {
        businessId_phone: {
          businessId: DEFAULT_BUSINESS_ID,
          phone: c.contactPhone,
        },
      },
      select: { id: true },
    });

    if (client) {
      await prisma.conversation.update({
        where: { id: c.id },
        data: { clientId: client.id },
      });
    }
  }

  console.log("✅ Linked conversations to clients");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
