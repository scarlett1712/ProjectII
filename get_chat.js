require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const adapter = new PrismaPg(url);
const prisma = new PrismaClient({ adapter });

async function main() {
  const messages = await prisma.chatMessage.findMany({
    take: 20,
    orderBy: { createdAt: "desc" }
  });

  console.log("Recent Messages:");
  messages.reverse().forEach((msg) => {
    console.log(`[${msg.createdAt.toISOString()}] ${msg.role}: ${msg.content.slice(0, 150)}`);
  });
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
