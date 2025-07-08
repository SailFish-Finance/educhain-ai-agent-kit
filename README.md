[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/sailfish-finance-educhain-ai-agent-kit-badge.png)](https://mseep.ai/app/sailfish-finance-educhain-ai-agent-kit)

<div align="center">

<a href="https://glama.ai/mcp/servers/fd54q7e2lz">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/fd54q7e2lz/badge" alt="EDUCHAIN Agent Kit MCP server" />
</a>

# EDUCHAIN Agent Kit

</div>

![SailfishAgent](https://github.com/user-attachments/assets/32a0f51a-fb86-4841-b120-b581d9db6fbf)


This MCP (Model Context Protocol) server provides tools and resources for interacting with EDUCHAIN. It allows Claude to query information about tokens and pools and perform swaps through SailFish DEX.

## Features

### Token and Pool Information
- Get token prices and details
- Get pool information and statistics
- View historical data for tokens and pools
- Get top tokens and pools by TVL

### Wallet Operations
- Check EDU and token balances
- Get wallet overviews including tokens and NFTs
- Send EDU and ERC20 tokens

### Swap Operations
- Get swap quotes with price impact and route information
- Swap tokens for tokens
- Swap EDU for tokens (using WEDU internally)
- Swap tokens for EDU (using WEDU internally)

> **Note:** SailFish DEX, like other Uniswap v3 forks, doesn't support native token swaps directly. Instead, it uses WEDU (Wrapped EDU) internally. When you use the swap functions for EDU, the system automatically handles the wrapping/unwrapping process, so you can work directly with EDU in your transactions. If you need more control, you can also use the `wrap_edu` and `unwrap_wedu` functions to manually convert between EDU and WEDU.

### Arbitrage Operations
- Get external market data for EDU from centralized exchanges
- Check for arbitrage opportunities between CEX and SailFish DEX
- Configurable external market data API
- Customizable arbitrage detection threshold

## Tools

### Token and Pool Information

- `get_token_price`: Get the current price of a token on SailFish DEX
- `get_token_info`: Get detailed information about a token on SailFish DEX
- `get_pool_info`: Get detailed information about a liquidity pool on SailFish DEX
- `get_top_tokens`: Get a list of top tokens by TVL on SailFish DEX
- `get_top_pools`: Get a list of top liquidity pools by TVL on SailFish DEX
- `get_total_tvl`: Get the total value locked (TVL) in SailFish DEX
- `get_24h_volume`: Get the 24-hour trading volume on SailFish DEX
- `get_token_historical_data`: Get historical data for a token on SailFish DEX
- `get_pool_historical_data`: Get historical data for a liquidity pool on SailFish DEX

### Wallet Operations

- `get_edu_balance`: Get the EDU balance of a wallet address
- `get_token_balance`: Get the token balance of a wallet address with USD value
- `get_multiple_token_balances`: Get multiple token balances for a wallet address
- `get_nft_balance`: Get the NFT balance of a wallet address for a specific NFT collection
- `get_wallet_overview`: Get an overview of a wallet including EDU, tokens, and NFTs
- `get_wallet_address_from_private_key`: Get wallet address from private key
- `send_edu`: Send EDU native token to another wallet address
- `send_erc20_token`: Send ERC20 token to another wallet address

### Swap Operations

- `get_swap_quote`: Get a quote for swapping tokens on SailFish DEX
- `swap_tokens`: Swap tokens on SailFish DEX (token to token)
- `swap_edu_for_tokens`: Swap EDU for tokens on SailFish DEX
- `swap_tokens_for_edu`: Swap tokens for EDU on SailFish DEX
- `wrap_edu`: Wrap EDU to WEDU (Wrapped EDU)
- `unwrap_wedu`: Unwrap WEDU (Wrapped EDU) to EDU

### Arbitrage Operations

- `get_external_market_data`: Get external market data for EDU from centralized exchanges
- `check_arbitrage_opportunities`: Check for arbitrage opportunities between CEX and SailFish DEX
- `update_external_market_config`: Update the configuration for external market data API
- `get_external_market_config`: Get the current configuration for external market data API

### Configuration

- `set_rpc_url`: Set the RPC URL for blockchain interactions
- `get_rpc_url`: Get the current RPC URL used for blockchain interactions

## Resources

- `sailfish://overview`: Overview of SailFish DEX including TVL, volume, and other metrics
- `sailfish://token/{tokenId}`: Information about a specific token on SailFish DEX
- `sailfish://pool/{poolId}`: Information about a specific liquidity pool on SailFish DEX

## Installation

1. Make sure you have Node.js installed
2. Clone this repository
3. Install dependencies:
   ```
   npm install
   ```
4. Build the project:
   ```
   npm run build
   ```
5. Add the MCP server to your Claude Desktop configuration file:
   ```json
   {
     "mcpServers": {
       "sailfish": {
         "command": "node",
         "args": ["/path/to/SubgraphMCP/build/index.js"],
         "env": {
           "RPC_URL": "https://your-edu-rpc-url.com"
         }
       }
     }
   }
   ```

## Usage Examples

### Get Token Price
```javascript
use_mcp_tool("sailfish", "get_token_price", {
  "tokenId": "0x836d275563bAb5E93Fd6Ca62a95dB7065Da94342"
});
```

### Get Swap Quote
```javascript
use_mcp_tool("sailfish", "get_swap_quote", {
  "tokenIn": "0xd02E8c38a8E3db71f8b2ae30B8186d7874934e12",
  "tokenOut": "0x836d275563bAb5E93Fd6Ca62a95dB7065Da94342",
  "amountIn": "10"
});
```

### Swap Tokens
```javascript
use_mcp_tool("sailfish", "swap_tokens", {
  "privateKey": "YOUR_PRIVATE_KEY",
  "tokenIn": "0xd02E8c38a8E3db71f8b2ae30B8186d7874934e12",
  "tokenOut": "0x836d275563bAb5E93Fd6Ca62a95dB7065Da94342",
  "amountIn": "10",
  "slippagePercentage": 0.5
});
```

### Check Arbitrage Opportunities
```javascript
use_mcp_tool("sailfish", "check_arbitrage_opportunities", {
  "threshold": 1.5
});
```

### Update External Market API Configuration
```javascript
use_mcp_tool("sailfish", "update_external_market_config", {
  "apiUrl": "https://api.example.com/crypto/prices",
  "apiKey": "YOUR_API_KEY",
  "symbols": {
    "EDU": "EDU",
    "USD": "USDT"
  }
});
```

### Wrap EDU to WEDU
```javascript
use_mcp_tool("sailfish", "wrap_edu", {
  "privateKey": "YOUR_PRIVATE_KEY",
  "amount": "10"
});
```

### Unwrap WEDU to EDU
```javascript
use_mcp_tool("sailfish", "unwrap_wedu", {
  "privateKey": "YOUR_PRIVATE_KEY",
  "amount": "10"
});
```

## Testing

You can run the test script to verify the functionality:

```
node build/test.js
```

This will test the routing and swap quote functionality without executing actual swaps.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
