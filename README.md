# velobase-sdk-mcp

An MCP server that helps AI tools discover, use, and troubleshoot the Velobase Billing SDKs (Python/JavaScript).

## Features

- `sdk_download_and_usage`: Tell AI how to download/install Python or JavaScript SDK and how to use it based on the SDK README

Tool input:
- `language`: `python` | `javascript` | `all` (default)

## Requirements

- Node.js >= 18

## Install

```bash
npm install
```

## Run

```bash
npm start
```

## MCP Config Example (stdio)

### Option 1: npx package (recommended)

```json
{
  "mcpServers": {
    "velobase-sdk-guide": {
      "command": "npx",
      "args": ["-y", "@velobaseai/velobase-sdk-mcp@latest"]
    }
  }
}
```

### Option 2: local development mode

```json
{
  "mcpServers": {
    "velobase-sdk-guide": {
      "command": "node",
      "args": ["e:/velobase/velobase-sdk-mcp/src/index.js"]
    }
  }
}
```

## Referenced SDK Repos

- `e:/velobase/velobase-billing-python`
- `e:/velobase/velobase-billing-js`
