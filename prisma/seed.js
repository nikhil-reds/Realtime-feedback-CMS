const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL || "";
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "admin123@gmail.com";
  const password = "rubenius@reds123";
  const name = "Experience Admin";

  console.log("Seeding admin user into database...");

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password,
      name,
      role: "ADMIN",
    },
    create: {
      email,
      password,
      name,
      role: "ADMIN",
    },
  });

  console.log(`Demo admin seeded successfully!\nUser ID: ${user.id}\nEmail: ${user.email}\nRole: ${user.role}`);
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
