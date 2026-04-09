#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const __filename = fileURLToPath(import.meta.url);
const PYTHON_README_URL =
  "https://github.com/velobase/velobase-billing-python/blob/main/README.md";
const JAVASCRIPT_README_URL =
  "https://github.com/velobase/velobase-billing-js/blob/main/README.md";

function normalizeLanguage(language) {
  if (!language) return "all";
  const value = String(language).toLowerCase();
  if (["python", "py"].includes(value)) return "python";
  if (["javascript", "js", "node", "nodejs", "ts", "typescript"].includes(value))
    return "javascript";
  if (["all", "both"].includes(value)) return "all";
  return value;
}

function sdkDownloadAndUsage(language) {
  const selected = language === "all" ? ["python", "javascript"] : [language];
  const blocks = [];
  for (const lang of selected) {
    if (lang === "python") {
      blocks.push(
        [
          "# Python SDK",
          "## Step 1: Install SDK",
          "```bash",
          "pip install velobase-billing",
          "```",
          "",
          "## Step 2: Check README after install",
          "- Ask AI to first inspect local site-packages files (README may or may not be packaged).",
          "- Suggested command:",
          "```bash",
          "python -m pip show -f velobase-billing",
          "```",
          "- If README is not found locally, use README online:",
          `  - ${PYTHON_README_URL}`,
          "",
          "## Step 3: Implement token billing flow in code",
          "- Initialize `Velobase(api_key=...)`",
          "- Deposit credits to customer (supports `credit_type`, `starts_at`, `expires_at`)",
          "- Use freeze before business execution, or use deduct for immediate charges",
          "- Use consume on success or unfreeze on failure",
          "- Keep idempotency keys stable (`idempotency_key` / `transaction_id`)",
        ].join("\n"),
      );
      continue;
    }

    blocks.push(
      [
        "# JavaScript SDK",
        "## Step 1: Install SDK",
        "```bash",
        "npm install @velobaseai/billing",
        "```",
        "",
        "## Step 2: Check README after install",
        "- Ask AI to read local README first:",
        "  - `node_modules/@velobaseai/billing/README.md`",
        "- If README is not found locally, use README online:",
        `  - ${JAVASCRIPT_README_URL}`,
        "",
        "## Step 3: Implement token billing flow in code",
        "- Initialize `new Velobase({ apiKey })`",
        "- Deposit credits to customer (supports `creditType`, `startsAt`, `expiresAt`)",
        "- Use freeze before business execution, or use deduct for immediate charges",
        "- Use consume on success or unfreeze on failure",
        "- Keep idempotency keys stable (`idempotencyKey` / `transactionId`)",
      ].join("\n"),
    );
  }
  return blocks.join("\n\n");
}

function createServer() {
  const server = new Server(
    {
      name: "velobase-sdk-mcp",
      version,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "sdk_download_and_usage",
        description:
          "Tell AI how to download/install Python or JavaScript SDK and how to use it, based on SDK README",
        inputSchema: {
          type: "object",
          properties: {
            language: {
              type: "string",
              description: "python | javascript | all (default: all)",
            },
          },
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    if (name === "sdk_download_and_usage") {
      const language = normalizeLanguage(args.language || "all");
      if (!["python", "javascript", "all"].includes(language)) {
        return {
          content: [
            {
              type: "text",
              text: "language must be python, javascript, or all",
            },
          ],
          isError: true,
        };
      }

      return { content: [{ type: "text", text: sdkDownloadAndUsage(language) }] };
    }

    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  });

  return server;
}

export { createServer };

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entry && entry === __filename) {
  main().catch((error) => {
    process.stderr.write(`velobase-sdk-mcp failed to start: ${String(error)}\n`);
    process.exit(1);
  });
}
