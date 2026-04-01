# velobase-sdk-mcp

An MCP server that helps AI tools discover, use, and troubleshoot the Velobase Billing SDKs (Python/JavaScript).

## Features

- `sdk_capabilities`: Show capability overview for both SDKs
- `sdk_quickstart`: Return install and minimal examples by language
- `sdk_locate_reference`: Return key SDK reference file paths
- `sdk_operation_guide`: Generate parameter and code templates by operation
- `sdk_troubleshoot`: Provide diagnosis and fixes based on error symptoms

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
