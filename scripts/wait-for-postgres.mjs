#!/usr/bin/env node
import { connectPg } from "./lib/db-connection.mjs";

async function main() {
  const { client, label } = await connectPg();
  console.log("Postgres listo:", label);
  await client.end();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
