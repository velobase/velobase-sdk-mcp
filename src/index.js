#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const pythonRoot = path.resolve(repoRoot, "..", "velobase-billing-python");
const jsRoot = path.resolve(repoRoot, "..", "velobase-billing-js");

const references = {
  python: {
    quickstart: {
      path: path.join(pythonRoot, "README.md"),
      description: "Python SDK install and quickstart guide",
    },
    api: {
      path: path.join(pythonRoot, "src", "velobase_billing", "_client.py"),
      description: "Python SDK client and resource entry points",
    },
    billing_resource: {
      path: path.join(
        pythonRoot,
        "src",
        "velobase_billing",
        "_resources",
        "billing.py",
      ),
      description: "Billing endpoints (freeze/consume/unfreeze)",
    },
    customer_resource: {
      path: path.join(
        pythonRoot,
        "src",
        "velobase_billing",
        "_resources",
        "customers.py",
      ),
      description: "Customer endpoints (deposit/get)",
    },
    errors: {
      path: path.join(pythonRoot, "src", "velobase_billing", "_errors.py"),
      description: "Error type definitions",
    },
    integration_test: {
      path: path.join(pythonRoot, "test", "integration.py"),
      description: "Integration tests and full usage flow",
    },
  },
  javascript: {
    quickstart: {
      path: path.join(jsRoot, "README.md"),
      description: "JavaScript SDK install and quickstart guide",
    },
    api: {
      path: path.join(jsRoot, "src", "client.ts"),
      description: "JavaScript SDK client and API wrapper",
    },
    types: {
      path: path.join(jsRoot, "src", "types.ts"),
      description: "Request/response type definitions",
    },
    errors: {
      path: path.join(jsRoot, "src", "errors.ts"),
      description: "Error type definitions",
    },
    integration_test: {
      path: path.join(jsRoot, "test", "integration.mjs"),
      description: "Integration tests and full usage flow",
    },
  },
};

const operations = {
  deposit: {
    desc: "Credit tokens to a customer",
    required: ["customer_id", "amount"],
    optional: ["idempotency_key", "name", "email", "metadata", "description"],
  },
  get_customer: {
    desc: "Get customer balance and profile",
    required: ["customer_id"],
    optional: [],
  },
  freeze: {
    desc: "Pre-freeze tokens to prevent over-consumption",
    required: ["customer_id", "amount", "business_id"],
    optional: ["metadata", "description"],
  },
  consume: {
    desc: "Confirm token consumption after business success",
    required: ["customer_id", "amount", "business_id"],
    optional: ["metadata", "description"],
  },
  unfreeze: {
    desc: "Release frozen tokens after business failure",
    required: ["customer_id", "amount", "business_id"],
    optional: ["metadata", "description"],
  },
};

function exists(filePath) {
  return fs.existsSync(filePath);
}

function normalizeLanguage(language) {
  if (!language) return "all";
  const value = String(language).toLowerCase();
  if (["python", "py"].includes(value)) return "python";
  if (["javascript", "js", "node", "nodejs", "ts", "typescript"].includes(value))
    return "javascript";
  if (["all", "both"].includes(value)) return "all";
  return value;
}

function formatReferences(language, topic = "all") {
  const selected = language === "all" ? ["python", "javascript"] : [language];
  const lines = [];
  for (const lang of selected) {
    const refs = references[lang];
    if (!refs) continue;
    lines.push(`## ${lang === "python" ? "Python SDK" : "JavaScript SDK"}`);
    for (const [key, item] of Object.entries(refs)) {
      if (topic !== "all" && key !== topic) continue;
      lines.push(
        `- ${key}: ${item.description}\n  - path: ${item.path}\n  - exists: ${exists(item.path)}`,
      );
    }
  }
  return lines.join("\n");
}

function quickstart(language) {
  if (language === "python") {
    return [
      "## Python Quickstart",
      "- Install: `pip install velobase-billing`",
      "- Initialize:",
      "```python",
      "from velobase_billing import Velobase",
      "",
      "client = Velobase(api_key='YOUR_API_KEY')",
      "```",
      "- Minimal flow:",
      "```python",
      "client.customers.deposit(customer_id='user_123', amount='100')",
      "customer = client.customers.get('user_123')",
      "print(customer.balance)",
      "```",
      "- Key constraints:",
      "  - amount must be a string > 0 (for example `'10'`)",
      "  - use the same business_id across freeze/consume/unfreeze for idempotency",
      "",
      formatReferences("python"),
    ].join("\n");
  }

  return [
    "## JavaScript Quickstart",
    "- Install: `npm i @velobaseai/billing`",
    "- Initialize:",
    "```ts",
    "import { Velobase } from '@velobaseai/billing';",
    "",
    "const client = new Velobase({ apiKey: process.env.VELOBASE_API_KEY! });",
    "```",
    "- Minimal flow:",
    "```ts",
    "await client.customers.deposit({ customerId: 'user_123', amount: '100' });",
    "const customer = await client.customers.get('user_123');",
    "console.log(customer.balance);",
    "```",
    "- Key constraints:",
    "  - amount must be a string > 0",
    "  - use the same businessId across freeze/consume/unfreeze",
    "",
    formatReferences("javascript"),
  ].join("\n");
}

function operationGuide(language, operation, style = "default") {
  const op = operations[operation];
  if (!op) {
    return `Unknown operation: ${operation}. Available: ${Object.keys(operations).join(", ")}`;
  }

  if (language === "python") {
    const codeMap = {
      deposit: `client.customers.deposit(customer_id='user_123', amount='100', idempotency_key='dep_001')`,
      get_customer: `customer = client.customers.get('user_123')`,
      freeze: `client.billing.freeze(customer_id='user_123', amount='10', business_id='order_001')`,
      consume: `client.billing.consume(customer_id='user_123', amount='10', business_id='order_001')`,
      unfreeze: `client.billing.unfreeze(customer_id='user_123', amount='10', business_id='order_001')`,
    };

    const asyncInit =
      style === "async"
        ? [
            "from velobase_billing import AsyncVelobase",
            "",
            "async with AsyncVelobase(api_key='YOUR_API_KEY') as client:",
            `    ${codeMap[operation]}`,
          ].join("\n")
        : [
            "from velobase_billing import Velobase",
            "",
            "client = Velobase(api_key='YOUR_API_KEY')",
            codeMap[operation],
          ].join("\n");

    return [
      `## Python ${operation} Guide`,
      `- Purpose: ${op.desc}`,
      `- Required params: ${op.required.join(", ") || "none"}`,
      `- Optional params: ${op.optional.join(", ") || "none"}`,
      "```python",
      asyncInit,
      "```",
      "",
      formatReferences("python", operation === "get_customer" ? "customer_resource" : "billing_resource"),
    ].join("\n");
  }

  const jsCodeMap = {
    deposit: `await client.customers.deposit({ customerId: 'user_123', amount: '100', idempotencyKey: 'dep_001' });`,
    get_customer: `const customer = await client.customers.get('user_123');`,
    freeze: `await client.billing.freeze({ customerId: 'user_123', amount: '10', businessId: 'order_001' });`,
    consume: `await client.billing.consume({ customerId: 'user_123', amount: '10', businessId: 'order_001' });`,
    unfreeze: `await client.billing.unfreeze({ customerId: 'user_123', amount: '10', businessId: 'order_001' });`,
  };

  const init =
    style === "cjs"
      ? [
          "const Velobase = require('@velobaseai/billing').default;",
          "const client = new Velobase({ apiKey: process.env.VELOBASE_API_KEY });",
          jsCodeMap[operation],
        ].join("\n")
      : [
          "import { Velobase } from '@velobaseai/billing';",
          "const client = new Velobase({ apiKey: process.env.VELOBASE_API_KEY! });",
          jsCodeMap[operation],
        ].join("\n");

  return [
    `## JavaScript ${operation} Guide`,
    `- Purpose: ${op.desc}`,
    `- Required params: ${op.required.join(", ") || "none"}`,
    `- Optional params: ${op.optional.join(", ") || "none"}`,
    "```ts",
    init,
    "```",
    "",
    formatReferences(
      "javascript",
      operation === "get_customer" ? "api" : "api",
    ),
  ].join("\n");
}

function troubleshoot({ language, symptom, statusCode }) {
  const lang = normalizeLanguage(language);
  const text = String(symptom || "").toLowerCase();

  const checks = [
    "- Check whether API Key is empty or from the wrong project",
    "- Check whether baseUrl points to Velobase API (default https://api.velobase.com)",
    "- Check whether amount is a string and > 0",
    "- Check whether freeze/consume/unfreeze uses the same business_id/businessId",
    "- Check network accessibility (status=0 usually means network error)",
  ];

  const status = Number.isFinite(statusCode) ? Number(statusCode) : null;
  if (status === 401 || text.includes("401") || text.includes("unauth")) {
    return [
      "## Diagnosis: Authentication failure",
      "- Symptom: AuthenticationError / VelobaseAuthenticationError",
      "- Fix:",
      "  - Validate API Key and remove trailing spaces",
      "  - Confirm the key matches the target project",
      "  - Verify local environment variable loading",
      "",
      formatReferences(lang === "all" ? "all" : lang, "errors"),
    ].join("\n");
  }

  if (
    status === 400 ||
    text.includes("amount") ||
    text.includes("validation") ||
    text.includes("param")
  ) {
    return [
      "## Diagnosis: Parameter validation failure",
      "- Common causes:",
      "  - amount <= 0 or amount is not a string",
      "  - customer_id/customerId is empty",
      "  - business_id/businessId is missing for billing flow",
      "- Fix: align parameter names and types with SDK definitions",
      "",
      formatReferences(lang === "all" ? "all" : lang, "types"),
      formatReferences(lang === "all" ? "all" : lang, "integration_test"),
    ].join("\n");
  }

  if (
    status === 404 ||
    text.includes("not found") ||
    text.includes("business")
  ) {
    return [
      "## Diagnosis: Resource not found",
      "- Common causes:",
      "  - consume/unfreeze used a business_id that was never frozen",
      "  - customer_id does not exist and was never funded",
      "- Suggested fixes:",
      "  - run deposit or freeze before follow-up operations",
      "  - use a stable business_id from your business order ID",
      "",
      formatReferences(lang === "all" ? "all" : lang, "integration_test"),
    ].join("\n");
  }

  if (status === 409 || text.includes("conflict") || text.includes("duplicate")) {
    return [
      "## Diagnosis: Idempotency conflict",
      "- Common cause: same idempotency key/business ID submitted with different payloads",
      "- Suggested fixes:",
      "  - use idempotency_key/idempotencyKey for deposit",
      "  - use stable business_id/businessId for freeze/consume/unfreeze",
      "  - keep request payload exactly the same for the same idempotency key",
      "",
      formatReferences(lang === "all" ? "all" : lang, "integration_test"),
    ].join("\n");
  }

  if (status === 429 || status === 500 || text.includes("network") || text.includes("timeout")) {
    return [
      "## Diagnosis: Network/server transient error",
      "- Notes: SDK includes retry logic for 429/5xx",
      "- Suggested fixes:",
      "  - increase timeout when needed",
      "  - check proxy/firewall and DNS settings",
      "  - inspect request logs for excessive burst traffic",
      "",
      formatReferences(lang === "all" ? "all" : lang, "api"),
    ].join("\n");
  }

  return [
    "## Generic Troubleshooting Checklist",
    ...checks,
    "",
    formatReferences(lang === "all" ? "all" : lang),
  ].join("\n");
}

function createServer() {
  const server = new Server(
    {
      name: "velobase-sdk-mcp",
      version: "0.1.0",
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
        name: "sdk_capabilities",
        description: "Get Python/JS SDK capability summary, package names, and API list",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "sdk_quickstart",
        description: "Get install and minimal runnable examples by language",
        inputSchema: {
          type: "object",
          properties: {
            language: {
              type: "string",
              description: "python | javascript | js",
            },
          },
          required: ["language"],
        },
      },
      {
        name: "sdk_locate_reference",
        description: "Return concrete SDK reference file paths for deeper reading",
        inputSchema: {
          type: "object",
          properties: {
            language: {
              type: "string",
              description: "python | javascript | all",
            },
            topic: {
              type: "string",
              description:
                "quickstart | api | billing_resource | customer_resource | types | errors | integration_test | all",
            },
          },
        },
      },
      {
        name: "sdk_operation_guide",
        description: "Provide parameter requirements and code templates by operation",
        inputSchema: {
          type: "object",
          properties: {
            language: {
              type: "string",
              description: "python | javascript",
            },
            operation: {
              type: "string",
              description: "deposit | get_customer | freeze | consume | unfreeze",
            },
            style: {
              type: "string",
              description: "python: default|async, javascript: default|cjs",
            },
          },
          required: ["language", "operation"],
        },
      },
      {
        name: "sdk_troubleshoot",
        description: "Provide diagnosis and fixes based on symptoms and status code",
        inputSchema: {
          type: "object",
          properties: {
            language: {
              type: "string",
              description: "python | javascript | all",
            },
            symptom: {
              type: "string",
              description: "Error message, keyword, or symptom description",
            },
            status_code: {
              type: "number",
              description: "Optional HTTP status code, e.g. 401/400/404/409/429/500",
            },
          },
          required: ["symptom"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    if (name === "sdk_capabilities") {
      const text = [
        "# Velobase SDK Capability Overview",
        "## Python",
        "- Package: velobase-billing",
        "- Entry: Velobase / AsyncVelobase",
        "- Resources: customers.deposit/get, billing.freeze/consume/unfreeze",
        "## JavaScript",
        "- Package: @velobaseai/billing",
        "- Entry: new Velobase({ apiKey })",
        "- Resources: customers.deposit/get, billing.freeze/consume/unfreeze",
        "## Shared Constraints",
        "- amount must be a string > 0",
        "- Deposit idempotency key: idempotency_key / idempotencyKey",
        "- Billing flow business key: business_id / businessId",
        "",
        formatReferences("all"),
      ].join("\n");
      return { content: [{ type: "text", text }] };
    }

    if (name === "sdk_quickstart") {
      const language = normalizeLanguage(args.language);
      if (!["python", "javascript"].includes(language)) {
        return {
          content: [
            {
              type: "text",
              text: "language must be python or javascript",
            },
          ],
        };
      }
      return { content: [{ type: "text", text: quickstart(language) }] };
    }

    if (name === "sdk_locate_reference") {
      const language = normalizeLanguage(args.language || "all");
      const topic = String(args.topic || "all");
      const text = formatReferences(language, topic);
      return { content: [{ type: "text", text }] };
    }

    if (name === "sdk_operation_guide") {
      const language = normalizeLanguage(args.language);
      if (!["python", "javascript"].includes(language)) {
        return {
          content: [
            {
              type: "text",
              text: "language must be python or javascript",
            },
          ],
        };
      }
      const operation = String(args.operation || "");
      const style = String(args.style || "default");
      const text = operationGuide(language, operation, style);
      return { content: [{ type: "text", text }] };
    }

    if (name === "sdk_troubleshoot") {
      const language = normalizeLanguage(args.language || "all");
      const symptom = args.symptom;
      const statusCode = args.status_code;
      const text = troubleshoot({ language, symptom, statusCode });
      return { content: [{ type: "text", text }] };
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
