# EDUCHAIN Agent Kit

This MCP (Model Context Protocol) server is integrated into Claude's MCP and developed by SailFish. It provides access to SailFish DEX data through the Goldsky subgraph API, allowing Claude to retrieve information about tokens, pools, prices, volumes, and TVL (Total Value Locked) from the SailFish DEX. It also enables checking token and NFT balances with USD value calculation using SailFish as a price oracle.

## Features

The server provides the following capabilities:

### SailFish DEX Data

#### Resources

- `sailfish://overview` - Overview of SailFish DEX including TVL, volume, and other metrics
- `sailfish://token/{tokenId}` - Information about a specific token on SailFish DEX
- `sailfish://pool/{poolId}` - Information about a specific liquidity pool on SailFish DEX

#### Tools

- `get_token_price` - Get the current price of a token on SailFish DEX
- `get_token_info` - Get detailed information about a token on SailFish DEX
- `get_pool_info` - Get detailed information about a liquidity pool on SailFish DEX
- `get_top_tokens` - Get a list of top tokens by TVL on SailFish DEX
- `get_top_pools` - Get a list of top liquidity pools by TVL on SailFish DEX
- `get_total_tvl` - Get the total value locked (TVL) in SailFish DEX
- `get_24h_volume` - Get the 24-hour trading volume on SailFish DEX
- `get_token_historical_data` - Get historical data for a token on SailFish DEX
- `get_pool_historical_data` - Get historical data for a liquidity pool on SailFish DEX

### Blockchain Interaction

#### Tools

- `get_edu_balance` - Get the EDU balance of a wallet address
- `get_token_balance` - Get the token balance of a wallet address with USD value using SailFish as price oracle
- `get_multiple_token_balances` - Get multiple token balances for a wallet address with USD values
- `get_nft_balance` - Get the NFT balance of a wallet address for a specific NFT collection
- `get_wallet_overview` - Get an overview of a wallet including EDU, tokens, and NFTs
- `set_rpc_url` - Set the RPC URL for blockchain interactions
- `get_rpc_url` - Get the current RPC URL used for blockchain interactions
- `get_wallet_address_from_private_key` - Get wallet address from private key with proper checksum formatting
- `send_edu` - Send EDU native token to another wallet address with transaction preview and confirmation
- `send_erc20_token` - Send ERC20 token to another wallet address with transaction preview and confirmation

## Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Build the server: `npm run build`
4. Configure Claude Desktop to use this MCP server by adding it to the configuration file at `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "educhain-agent-kit": {
      "command": "node",
      "args": ["/path/to/SubgraphMCP/build/index.js"],
      "env": {},
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Usage Examples

Once the MCP server is configured and Claude Desktop is restarted, you can ask Claude to use the EDUCHAIN Agent Kit tools:

### SailFish DEX Data Examples

- "What's the total TVL on SailFish DEX?"
- "Show me the price of token 0x1234... on SailFish"
- "What are the top 5 pools by TVL on SailFish?"
- "Get me information about the pool 0xabcd..."
- "What was the 24-hour trading volume on SailFish?"

### Blockchain Interaction Examples

- "What's the EDU balance of wallet 0x1234...?"
- "Show me the token balance of 0xabcd... for wallet 0x1234..."
- "Get the NFT balance of wallet 0x1234... for collection 0xabcd..."
- "Give me an overview of wallet 0x1234... including these tokens: 0xabcd..., 0xefgh..."
- "Change the RPC URL to https://example.com/rpc"
- "Send 1.5 EDU from my wallet to 0x1234... using my private key"
- "Transfer 10 tokens from the contract 0xabcd... to wallet 0x1234... using my private key"

## RPC URL Configuration

By default, the EDUCHAIN Agent Kit uses the RPC URL `https://rpc.edu-chain.raas.gelato.cloud` for blockchain interactions with chain ID 41923 (EDUCHAIN). You can change this URL using the `set_rpc_url` tool.

## Wallet Balance Features

The EDUCHAIN Agent Kit provides comprehensive wallet balance checking capabilities:

- **EDU Native Balance**: Check the native EDU token balance of any wallet address
- **ERC20 Token Balances**: Check the balance of any ERC20 token with USD value calculation using SailFish as price oracle
- **NFT Balances**: Check NFT balances for specific collections
- **Wallet Overview**: Get a comprehensive overview of a wallet including EDU, ERC20 tokens, and NFTs

## Transaction Features

The EDUCHAIN Agent Kit allows you to send tokens to other wallet addresses:

- **Get Wallet Address from Private Key**: Derive and verify your wallet address from a private key with proper checksum formatting
- **Wallet Address Verification**: Verify your wallet address before proceeding with transactions
- **Send EDU**: Send EDU native token to another wallet address
- **Send ERC20 Tokens**: Send any ERC20 token to another wallet address

All transaction features require providing a private key to sign the transactions. The private key is only used for signing and is not stored or transmitted beyond the immediate transaction. For security, you can use the `get_wallet_address_from_private_key` tool to verify your wallet address before proceeding with any transaction.

## USD Value Calculation

When checking token balances, the EDUCHAIN Agent Kit attempts to calculate the USD value of the tokens using SailFish as a price oracle. This works for tokens that are listed on SailFish DEX. For tokens not listed on SailFish, the USD value will not be available.

## Development

- `npm run build` - Build the TypeScript code
- `npm run start` - Run the built server
- `npm run dev` - Run the server in development mode with ts-node

## API Reference

The server uses the following APIs:

- SailFish subgraph API: `https://api.goldsky.com/api/public/project_cm5nst0b7iiqy01t6hxww7gao/subgraphs/sailfish-v3-occ-mainnet/1.0.0/gn`
- EDUCHAIN JSON-RPC API: `https://rpc.edu-chain.raas.gelato.cloud` (chain ID: 41923, default, can be changed)
