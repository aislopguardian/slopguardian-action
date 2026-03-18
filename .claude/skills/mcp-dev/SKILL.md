---
name: mcp-dev
description: Guide for the MCP server in packages/mcp/ (future phase)
trigger: when working on MCP server code
---

# MCP Server Development

## Architecture
- stdio transport, @modelcontextprotocol/sdk
- File watcher detects AI modifications in real-time
- Buffer accumulates issues per session
- Before AI sends final response, injector fires corrections
- Session memory is ephemeral — in-memory only, zero network calls

## Not yet started
This package is phase 3. Core and action come first.
