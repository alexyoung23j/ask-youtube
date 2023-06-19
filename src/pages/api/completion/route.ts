import { prisma } from "~/server/db";

export async function POST(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data } = await req.json();

  console.log(data);

  return {};
}
