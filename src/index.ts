#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { ethers } from 'ethers';
import * as subgraph from './subgraph.js';
import * as blockchain from './blockchain.js';
import * as swap from './swap.js';
import * as external_market from './external_market.js';

class SailFishSubgraphServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'educhain-agent-kit',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupResourceHandlers();
    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupResourceHandlers() {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'sailfish://overview',
          name: 'SailFish DEX Overview',
          mimeType: 'application/json',
          description: 'Overview of SailFish DEX including TVL, volume, and other metrics',
        },
      ],
    }));

    // List resource templates
    this.server.setRequestHandler(
      ListResourceTemplatesRequestSchema,
      async () => ({
        resourceTemplates: [
          {
            uriTemplate: 'sailfish://token/{tokenId}',
            name: 'Token Information',
            mimeType: 'application/json',
            description: 'Information about a specific token on SailFish DEX',
          },
          {
            uriTemplate: 'sailfish://pool/{poolId}',
            name: 'Pool Information',
            mimeType: 'application/json',
            description: 'Information about a specific liquidity pool on SailFish DEX',
          },
        ],
      })
    );

    // Handle resource reading
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        try {
          const { uri } = request.params;
          let content = '';

          // Handle overview resource
          if (uri === 'sailfish://overview') {
            const factory = await subgraph.getFactory();
            const ethPrice = await subgraph.getEthPrice();
            
            content = JSON.stringify({
              totalValueLockedUSD: factory?.totalValueLockedUSD || '0',
              totalVolumeUSD: factory?.totalVolumeUSD || '0',
              txCount: factory?.txCount || '0',
              poolCount: factory?.poolCount || '0',
              ethPriceUSD: ethPrice || '0',
              timestamp: new Date().toISOString(),
            }, null, 2);
          } 
          // Handle token resource
          else if (uri.startsWith('sailfish://token/')) {
            const tokenId = uri.replace('sailfish://token/', '');
            const token = await subgraph.getToken(tokenId);
            
            if (!token) {
              throw new McpError(
                ErrorCode.InvalidRequest,
                `Token with ID ${tokenId} not found`
              );
            }
            
            const tokenPrice = await subgraph.getTokenPrice(tokenId);
            
            content = JSON.stringify({
              ...token,
              priceUSD: tokenPrice || 'Unknown',
              timestamp: new Date().toISOString(),
            }, null, 2);
          } 
          // Handle pool resource
          else if (uri.startsWith('sailfish://pool/')) {
            const poolId = uri.replace('sailfish://pool/', '');
            const pool = await subgraph.getPool(poolId);
            
            if (!pool) {
              throw new McpError(
                ErrorCode.InvalidRequest,
                `Pool with ID ${poolId} not found`
              );
            }
            
            content = JSON.stringify({
              ...pool,
              timestamp: new Date().toISOString(),
            }, null, 2);
          } else {
            throw new McpError(
              ErrorCode.InvalidRequest,
              `Invalid URI format: ${uri}`
            );
          }

          return {
            contents: [
              {
                uri: request.params.uri,
                mimeType: 'application/json',
                text: content,
              },
            ],
          };
        } catch (error) {
          if (error instanceof McpError) {
            throw error;
          }
          
          console.error('Error handling resource request:', error);
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to fetch data: ${(error as Error).message}`
          );
        }
      }
    );
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_token_price',
          description: 'Get the current price of a token on SailFish DEX',
          inputSchema: {
            type: 'object',
            properties: {
              tokenId: {
                type: 'string',
                description: 'Token address',
              },
            },
            required: ['tokenId'],
          },
        },
        {
          name: 'get_token_info',
          description: 'Get detailed information about a token on SailFish DEX',
          inputSchema: {
            type: 'object',
            properties: {
              tokenId: {
                type: 'string',
                description: 'Token address',
              },
            },
            required: ['tokenId'],
          },
        },
        {
          name: 'get_pool_info',
          description: 'Get detailed information about a liquidity pool on SailFish DEX',
          inputSchema: {
            type: 'object',
            properties: {
              poolId: {
                type: 'string',
                description: 'Pool address',
              },
            },
            required: ['poolId'],
          },
        },
        {
          name: 'get_top_tokens',
          description: 'Get a list of top tokens by TVL on SailFish DEX',
          inputSchema: {
            type: 'object',
            properties: {
              count: {
                type: 'number',
                description: 'Number of tokens to return (default: 10)',
              },
            },
            required: [],
          },
        },
        {
          name: 'get_top_pools',
          description: 'Get a list of top liquidity pools by TVL on SailFish DEX',
          inputSchema: {
            type: 'object',
            properties: {
              count: {
                type: 'number',
                description: 'Number of pools to return (default: 10)',
              },
            },
            required: [],
          },
        },
        {
          name: 'get_total_tvl',
          description: 'Get the total value locked (TVL) in SailFish DEX',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'get_24h_volume',
          description: 'Get the 24-hour trading volume on SailFish DEX',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'get_token_historical_data',
          description: 'Get historical data for a token on SailFish DEX',
          inputSchema: {
            type: 'object',
            properties: {
              tokenId: {
                type: 'string',
                description: 'Token address',
              },
              days: {
                type: 'number',
                description: 'Number of days of data to return (default: 7)',
              },
            },
            required: ['tokenId'],
          },
        },
        {
          name: 'get_pool_historical_data',
          description: 'Get historical data for a liquidity pool on SailFish DEX',
          inputSchema: {
            type: 'object',
            properties: {
              poolId: {
                type: 'string',
                description: 'Pool address',
              },
              days: {
                type: 'number',
                description: 'Number of days of data to return (default: 7)',
              },
            },
            required: ['poolId'],
          },
        },
        {
          name: 'get_edu_balance',
          description: 'Get the EDU balance of a wallet address',
          inputSchema: {
            type: 'object',
            properties: {
              walletAddress: {
                type: 'string',
                description: 'Wallet address to check',
              },
            },
            required: ['walletAddress'],
          },
        },
        {
          name: 'get_token_balance',
          description: 'Get the token balance of a wallet address with USD value using SailFish as price oracle',
          inputSchema: {
            type: 'object',
            properties: {
              tokenAddress: {
                type: 'string',
                description: 'Token contract address',
              },
              walletAddress: {
                type: 'string',
                description: 'Wallet address to check',
              },
            },
            required: ['tokenAddress', 'walletAddress'],
          },
        },
        {
          name: 'get_multiple_token_balances',
          description: 'Get multiple token balances for a wallet address with USD values using SailFish as price oracle',
          inputSchema: {
            type: 'object',
            properties: {
              tokenAddresses: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'List of token contract addresses',
              },
              walletAddress: {
                type: 'string',
                description: 'Wallet address to check',
              },
            },
            required: ['tokenAddresses', 'walletAddress'],
          },
        },
        {
          name: 'get_nft_balance',
          description: 'Get the NFT balance of a wallet address for a specific NFT collection',
          inputSchema: {
            type: 'object',
            properties: {
              nftAddress: {
                type: 'string',
                description: 'NFT contract address',
              },
              walletAddress: {
                type: 'string',
                description: 'Wallet address to check',
              },
              fetchTokenIds: {
                type: 'boolean',
                description: 'Whether to fetch token IDs (default: true)',
              },
            },
            required: ['nftAddress', 'walletAddress'],
          },
        },
        {
          name: 'get_wallet_overview',
          description: 'Get an overview of a wallet including EDU, tokens, and NFTs',
          inputSchema: {
            type: 'object',
            properties: {
              walletAddress: {
                type: 'string',
                description: 'Wallet address to check',
              },
              tokenAddresses: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'List of token contract addresses to check',
              },
              nftAddresses: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'List of NFT contract addresses to check',
              },
            },
            required: ['walletAddress'],
          },
        },
        {
          name: 'set_rpc_url',
          description: 'Set the RPC URL for blockchain interactions',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'RPC URL to use for blockchain interactions',
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'get_rpc_url',
          description: 'Get the current RPC URL used for blockchain interactions',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'send_edu',
          description: 'Send EDU native token to another wallet address',
          inputSchema: {
            type: 'object',
            properties: {
              privateKey: {
                type: 'string',
                description: 'Private key of the sender wallet',
              },
              toAddress: {
                type: 'string',
                description: 'Recipient wallet address',
              },
              amount: {
                type: 'string',
                description: 'Amount of EDU to send',
              },
            },
            required: ['privateKey', 'toAddress', 'amount'],
          },
        },
        {
          name: 'get_wallet_address_from_private_key',
          description: 'Get wallet address from private key with proper checksum formatting',
          inputSchema: {
            type: 'object',
            properties: {
              privateKey: {
                type: 'string',
                description: 'Private key of the wallet',
              },
            },
            required: ['privateKey'],
          },
        },
        {
          name: 'send_erc20_token',
          description: 'Send ERC20 token to another wallet address',
          inputSchema: {
            type: 'object',
            properties: {
              privateKey: {
                type: 'string',
                description: 'Private key of the sender wallet',
              },
              tokenAddress: {
                type: 'string',
                description: 'Token contract address',
              },
              toAddress: {
                type: 'string',
                description: 'Recipient wallet address',
              },
              amount: {
                type: 'string',
                description: 'Amount of tokens to send',
              },
              confirm: {
                type: 'boolean',
                description: 'Confirm the transaction after verifying wallet address (default: true)',
              },
            },
            required: ['privateKey', 'tokenAddress', 'toAddress', 'amount'],
          },
        },
        {
          name: 'get_swap_quote',
          description: 'Get a quote for swapping tokens on SailFish DEX',
          inputSchema: {
            type: 'object',
            properties: {
              tokenIn: {
                type: 'string',
                description: 'Address of the input token',
              },
              tokenOut: {
                type: 'string',
                description: 'Address of the output token',
              },
              amountIn: {
                type: 'string',
                description: 'Amount of input token to swap',
              },
              fee: {
                type: 'number',
                description: 'Fee tier (100=0.01%, 500=0.05%, 3000=0.3%, 10000=1%)',
              },
            },
            required: ['tokenIn', 'tokenOut', 'amountIn'],
          },
        },
        {
          name: 'swap_tokens',
          description: 'Swap tokens on SailFish DEX (token to token)',
          inputSchema: {
            type: 'object',
            properties: {
              privateKey: {
                type: 'string',
                description: 'Private key of the sender wallet',
              },
              tokenIn: {
                type: 'string',
                description: 'Address of the input token',
              },
              tokenOut: {
                type: 'string',
                description: 'Address of the output token',
              },
              amountIn: {
                type: 'string',
                description: 'Amount of input token to swap',
              },
              slippagePercentage: {
                type: 'number',
                description: 'Slippage tolerance percentage (default: 0.5)',
              },
              fee: {
                type: 'number',
                description: 'Fee tier (100=0.01%, 500=0.05%, 3000=0.3%, 10000=1%)',
              },
            },
            required: ['privateKey', 'tokenIn', 'tokenOut', 'amountIn'],
          },
        },
        {
          name: 'swap_edu_for_tokens',
          description: 'Swap EDU for tokens on SailFish DEX',
          inputSchema: {
            type: 'object',
            properties: {
              privateKey: {
                type: 'string',
                description: 'Private key of the sender wallet',
              },
              tokenOut: {
                type: 'string',
                description: 'Address of the output token',
              },
              amountIn: {
                type: 'string',
                description: 'Amount of EDU to swap',
              },
              slippagePercentage: {
                type: 'number',
                description: 'Slippage tolerance percentage (default: 0.5)',
              },
              fee: {
                type: 'number',
                description: 'Fee tier (100=0.01%, 500=0.05%, 3000=0.3%, 10000=1%)',
              },
            },
            required: ['privateKey', 'tokenOut', 'amountIn'],
          },
        },
        {
          name: 'swap_tokens_for_edu',
          description: 'Swap tokens for EDU on SailFish DEX',
          inputSchema: {
            type: 'object',
            properties: {
              privateKey: {
                type: 'string',
                description: 'Private key of the sender wallet',
              },
              tokenIn: {
                type: 'string',
                description: 'Address of the input token',
              },
              amountIn: {
                type: 'string',
                description: 'Amount of tokens to swap',
              },
              slippagePercentage: {
                type: 'number',
                description: 'Slippage tolerance percentage (default: 0.5)',
              },
              fee: {
                type: 'number',
                description: 'Fee tier (100=0.01%, 500=0.05%, 3000=0.3%, 10000=1%)',
              },
            },
            required: ['privateKey', 'tokenIn', 'amountIn'],
          },
        },
        {
          name: 'get_external_market_data',
          description: 'Get external market data for EDU from centralized exchanges',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'check_arbitrage_opportunities',
          description: 'Check for arbitrage opportunities between centralized exchanges and SailFish DEX',
          inputSchema: {
            type: 'object',
            properties: {
              threshold: {
                type: 'number',
                description: 'Minimum price difference percentage to consider as an arbitrage opportunity (default: 1.0)',
              },
            },
            required: [],
          },
        },
        {
          name: 'update_external_market_config',
          description: 'Update the configuration for external market data API',
          inputSchema: {
            type: 'object',
            properties: {
              apiUrl: {
                type: 'string',
                description: 'API URL for external market data',
              },
              apiKey: {
                type: 'string',
                description: 'API key for external market data (if required)',
              },
              symbols: {
                type: 'object',
                properties: {
                  EDU: {
                    type: 'string',
                    description: 'Symbol for EDU token on the external API',
                  },
                  USD: {
                    type: 'string',
                    description: 'Symbol for USD on the external API',
                  },
                },
                description: 'Symbol mappings for the external API',
              },
            },
            required: [],
          },
        },
        {
          name: 'get_external_market_config',
          description: 'Get the current configuration for external market data API',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'wrap_edu',
          description: 'Wrap EDU to WEDU (Wrapped EDU)',
          inputSchema: {
            type: 'object',
            properties: {
              privateKey: {
                type: 'string',
                description: 'Private key of the wallet',
              },
              amount: {
                type: 'string',
                description: 'Amount of EDU to wrap',
              },
            },
            required: ['privateKey', 'amount'],
          },
        },
        {
          name: 'unwrap_wedu',
          description: 'Unwrap WEDU (Wrapped EDU) to EDU',
          inputSchema: {
            type: 'object',
            properties: {
              privateKey: {
                type: 'string',
                description: 'Private key of the wallet',
              },
              amount: {
                type: 'string',
                description: 'Amount of WEDU to unwrap',
              },
            },
            required: ['privateKey', 'amount'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args = {} } = request.params;
        
        switch (name) {
          case 'get_token_price': {
            if (!args.tokenId || typeof args.tokenId !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Token ID is required');
            }
            
            const price = await subgraph.getTokenPrice(args.tokenId);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ price: price || 'Unknown' }, null, 2),
                },
              ],
            };
          }
          
          case 'get_token_info': {
            if (!args.tokenId || typeof args.tokenId !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Token ID is required');
            }
            
            const token = await subgraph.getToken(args.tokenId);
            if (!token) {
              throw new McpError(ErrorCode.InvalidRequest, `Token with ID ${args.tokenId} not found`);
            }
            
            const price = await subgraph.getTokenPrice(args.tokenId);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ ...token, priceUSD: price || 'Unknown' }, null, 2),
                },
              ],
            };
          }
          
          case 'get_pool_info': {
            if (!args.poolId || typeof args.poolId !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Pool ID is required');
            }
            
            const pool = await subgraph.getPool(args.poolId);
            if (!pool) {
              throw new McpError(ErrorCode.InvalidRequest, `Pool with ID ${args.poolId} not found`);
            }
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(pool, null, 2),
                },
              ],
            };
          }
          
          case 'get_top_tokens': {
            const count = typeof args.count === 'number' ? args.count : 10;
            const tokens = await subgraph.getTopTokens(count);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(tokens, null, 2),
                },
              ],
            };
          }
          
          case 'get_top_pools': {
            const count = typeof args.count === 'number' ? args.count : 10;
            const pools = await subgraph.getTopPools(count);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(pools, null, 2),
                },
              ],
            };
          }
          
          case 'get_total_tvl': {
            const tvl = await subgraph.getTotalTVL();
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ totalValueLockedUSD: tvl }, null, 2),
                },
              ],
            };
          }
          
          case 'get_24h_volume': {
            const volume = await subgraph.get24HVolume();
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ volumeUSD: volume }, null, 2),
                },
              ],
            };
          }
          
          case 'get_token_historical_data': {
            if (!args.tokenId || typeof args.tokenId !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Token ID is required');
            }
            
            const days = typeof args.days === 'number' ? args.days : 7;
            const data = await subgraph.getTokenDayData(args.tokenId, days);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          }
          
          case 'get_pool_historical_data': {
            if (!args.poolId || typeof args.poolId !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Pool ID is required');
            }
            
            const days = typeof args.days === 'number' ? args.days : 7;
            const data = await subgraph.getPoolDayData(args.poolId, days);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          }
          
          case 'get_edu_balance': {
            if (!args.walletAddress || typeof args.walletAddress !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Wallet address is required');
            }
            
            const balance = await blockchain.getEduBalance(args.walletAddress);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(balance, null, 2),
                },
              ],
            };
          }
          
          case 'get_token_balance': {
            if (!args.tokenAddress || typeof args.tokenAddress !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Token address is required');
            }
            
            if (!args.walletAddress || typeof args.walletAddress !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Wallet address is required');
            }
            
            const balance = await blockchain.getTokenBalance(args.tokenAddress, args.walletAddress);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(balance, null, 2),
                },
              ],
            };
          }
          
          case 'get_multiple_token_balances': {
            if (!args.tokenAddresses || !Array.isArray(args.tokenAddresses)) {
              throw new McpError(ErrorCode.InvalidParams, 'Token addresses array is required');
            }
            
            if (!args.walletAddress || typeof args.walletAddress !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Wallet address is required');
            }
            
            const balances = await blockchain.getMultipleTokenBalances(args.tokenAddresses, args.walletAddress);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(balances, null, 2),
                },
              ],
            };
          }
          
          case 'get_nft_balance': {
            if (!args.nftAddress || typeof args.nftAddress !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'NFT address is required');
            }
            
            if (!args.walletAddress || typeof args.walletAddress !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Wallet address is required');
            }
            
            const fetchTokenIds = args.fetchTokenIds !== false;
            const balance = await blockchain.getERC721Balance(args.nftAddress, args.walletAddress, fetchTokenIds);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(balance, null, 2),
                },
              ],
            };
          }
          
          case 'get_wallet_overview': {
            if (!args.walletAddress || typeof args.walletAddress !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Wallet address is required');
            }
            
            const tokenAddresses = Array.isArray(args.tokenAddresses) ? args.tokenAddresses : [];
            const nftAddresses = Array.isArray(args.nftAddresses) ? args.nftAddresses : [];
            
            const overview = await blockchain.getWalletOverview(args.walletAddress, tokenAddresses, nftAddresses);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(overview, null, 2),
                },
              ],
            };
          }
          
          case 'set_rpc_url': {
            if (!args.url || typeof args.url !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'RPC URL is required');
            }
            
            blockchain.setRpcUrl(args.url);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ success: true, rpcUrl: args.url }, null, 2),
                },
              ],
            };
          }
          
          case 'get_rpc_url': {
            const rpcUrl = blockchain.getRpcUrl();
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ rpcUrl }, null, 2),
                },
              ],
            };
          }
          
          case 'get_wallet_address_from_private_key': {
            if (!args.privateKey || typeof args.privateKey !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Private key is required');
            }
            
            const walletAddress = blockchain.getWalletAddressFromPrivateKey(args.privateKey);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ walletAddress }, null, 2),
                },
              ],
            };
          }
          
          case 'send_edu': {
            if (!args.privateKey || typeof args.privateKey !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Private key is required');
            }
            
            if (!args.toAddress || typeof args.toAddress !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Recipient address is required');
            }
            
            if (!args.amount || typeof args.amount !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Amount is required');
            }
            
            // Get wallet address from private key for information
            const fromAddress = blockchain.getWalletAddressFromPrivateKey(args.privateKey);
            
            // Proceed with the transaction
            const result = await blockchain.sendEdu(args.privateKey, args.toAddress, args.amount);
            
            // Add from address to the result for better context
            const enhancedResult = {
              ...result,
              fromAddress
            };
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(enhancedResult, null, 2),
                },
              ],
            };
          }
          
          case 'send_erc20_token': {
            if (!args.privateKey || typeof args.privateKey !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Private key is required');
            }
            
            if (!args.tokenAddress || typeof args.tokenAddress !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Token address is required');
            }
            
            if (!args.toAddress || typeof args.toAddress !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Recipient address is required');
            }
            
            if (!args.amount || typeof args.amount !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Amount is required');
            }
            
            // Get wallet address from private key for information
            const fromAddress = blockchain.getWalletAddressFromPrivateKey(args.privateKey);
            
            // Try to get token details for better context
            let tokenSymbol = 'Unknown';
            try {
              const provider = blockchain.getProvider();
              const tokenContract = new ethers.Contract(args.tokenAddress, ['function symbol() view returns (string)'], provider);
              tokenSymbol = await tokenContract.symbol();
            } catch (error) {
              console.error('Error fetching token symbol:', error);
            }
            
            // Proceed with the transaction
            const result = await blockchain.sendErc20Token(args.privateKey, args.tokenAddress, args.toAddress, args.amount);
            
            // Add from address and token symbol to the result for better context
            const enhancedResult = {
              ...result,
              fromAddress,
              tokenSymbol
            };
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(enhancedResult, null, 2),
                },
              ],
            };
          }
          
          case 'get_swap_quote': {
            if (!args.tokenIn || typeof args.tokenIn !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Input token address is required');
            }
            
            if (!args.tokenOut || typeof args.tokenOut !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Output token address is required');
            }
            
            if (!args.amountIn || typeof args.amountIn !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Input amount is required');
            }
            
            const slippagePercentage = typeof args.slippagePercentage === 'number' ? args.slippagePercentage : 0.5;
            
            const quote = await swap.getSwapQuote(args.tokenIn, args.tokenOut, args.amountIn, slippagePercentage);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    inputToken: {
                      address: args.tokenIn,
                      symbol: quote.tokenInSymbol,
                      decimals: quote.tokenInDecimals,
                      amount: args.amountIn,
                      rawAmount: ethers.parseUnits(args.amountIn, quote.tokenInDecimals).toString()
                    },
                    outputToken: {
                      address: args.tokenOut,
                      symbol: quote.tokenOutSymbol,
                      decimals: quote.tokenOutDecimals,
                      amount: quote.formattedAmountOut,
                      minimumAmount: quote.formattedMinimumAmountOut,
                      rawAmount: quote.amountOut,
                      rawMinimumAmount: quote.minimumAmountOut
                    },
                    exchangeRate: (Number(quote.formattedAmountOut) / Number(args.amountIn)).toString(),
                    priceImpact: quote.priceImpact.toFixed(2),
                    routeType: quote.route.type,
                    slippage: slippagePercentage.toString(),
                    note: "Amounts are formatted using the token's decimal places. Raw amounts are in wei units."
                  }, null, 2),
                },
              ],
            };
          }
          
          case 'swap_tokens': {
            if (!args.privateKey || typeof args.privateKey !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Private key is required');
            }
            
            if (!args.tokenIn || typeof args.tokenIn !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Input token address is required');
            }
            
            if (!args.tokenOut || typeof args.tokenOut !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Output token address is required');
            }
            
            if (!args.amountIn || typeof args.amountIn !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Input amount is required');
            }
            
            const slippagePercentage = typeof args.slippagePercentage === 'number' ? args.slippagePercentage : 0.5;
            const fee = typeof args.fee === 'number' ? args.fee : 3000; // Default to 0.3%
            
            const result = await swap.swapExactTokensForTokens(
              args.privateKey,
              args.tokenIn,
              args.tokenOut,
              args.amountIn,
              slippagePercentage
            );
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }
          
          case 'swap_edu_for_tokens': {
            if (!args.privateKey || typeof args.privateKey !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Private key is required');
            }
            
            if (!args.tokenOut || typeof args.tokenOut !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Output token address is required');
            }
            
            if (!args.amountIn || typeof args.amountIn !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Input amount is required');
            }
            
            const slippagePercentage = typeof args.slippagePercentage === 'number' ? args.slippagePercentage : 0.5;
            const fee = typeof args.fee === 'number' ? args.fee : 3000; // Default to 0.3%
            
            const result = await swap.swapExactEDUForTokens(
              args.privateKey,
              args.tokenOut,
              args.amountIn,
              slippagePercentage
            );
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }
          
          case 'swap_tokens_for_edu': {
            if (!args.privateKey || typeof args.privateKey !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Private key is required');
            }
            
            if (!args.tokenIn || typeof args.tokenIn !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Input token address is required');
            }
            
            if (!args.amountIn || typeof args.amountIn !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Input amount is required');
            }
            
            const slippagePercentage = typeof args.slippagePercentage === 'number' ? args.slippagePercentage : 0.5;
            const fee = typeof args.fee === 'number' ? args.fee : 3000; // Default to 0.3%
            
            const result = await swap.swapExactTokensForEDU(
              args.privateKey,
              args.tokenIn,
              args.amountIn,
              slippagePercentage
            );
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }
          
          case 'get_external_market_data': {
            try {
              const data = await external_market.getExternalMarketData();
              
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(data, null, 2),
                  },
                ],
              };
            } catch (error) {
              console.error('Error getting external market data:', error);
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({ 
                      error: 'Failed to fetch external market data',
                      message: (error as Error).message,
                      note: 'You may need to update the external market API configuration'
                    }, null, 2),
                  },
                ],
                isError: true,
              };
            }
          }
          
          case 'check_arbitrage_opportunities': {
            try {
              const threshold = typeof args.threshold === 'number' ? args.threshold : 1.0;
              const opportunities = await external_market.checkArbitrageOpportunities(threshold);
              
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(opportunities, null, 2),
                  },
                ],
              };
            } catch (error) {
              console.error('Error checking arbitrage opportunities:', error);
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({ 
                      error: 'Failed to check arbitrage opportunities',
                      message: (error as Error).message,
                      note: 'You may need to update the external market API configuration'
                    }, null, 2),
                  },
                ],
                isError: true,
              };
            }
          }
          
          case 'update_external_market_config': {
            try {
              const newConfig: any = {};
              
              if (typeof args.apiUrl === 'string') {
                newConfig.apiUrl = args.apiUrl;
              }
              
              if (typeof args.apiKey === 'string') {
                newConfig.apiKey = args.apiKey;
              }
              
              if (typeof args.symbols === 'object' && args.symbols !== null) {
                newConfig.symbols = {} as { EDU: string; USD: string };
                
                if (typeof (args.symbols as any).EDU === 'string') {
                  newConfig.symbols.EDU = (args.symbols as any).EDU;
                }
                
                if (typeof (args.symbols as any).USD === 'string') {
                  newConfig.symbols.USD = (args.symbols as any).USD;
                }
              }
              
              external_market.updateConfig(newConfig);
              const currentConfig = external_market.getConfig();
              
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      success: true,
                      message: 'External market API configuration updated',
                      config: currentConfig
                    }, null, 2),
                  },
                ],
              };
            } catch (error) {
              console.error('Error updating external market config:', error);
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({ 
                      error: 'Failed to update external market API configuration',
                      message: (error as Error).message
                    }, null, 2),
                  },
                ],
                isError: true,
              };
            }
          }
          
          case 'get_external_market_config': {
            try {
              const config = external_market.getConfig();
              
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(config, null, 2),
                  },
                ],
              };
            } catch (error) {
              console.error('Error getting external market config:', error);
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({ 
                      error: 'Failed to get external market API configuration',
                      message: (error as Error).message
                    }, null, 2),
                  },
                ],
                isError: true,
              };
            }
          }
          
          case 'wrap_edu': {
            if (!args.privateKey || typeof args.privateKey !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Private key is required');
            }
            
            if (!args.amount || typeof args.amount !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Amount is required');
            }
            
            try {
              const result = await swap.wrapEDU(args.privateKey, args.amount);
              
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      ...result,
                      message: `Successfully wrapped ${args.amount} EDU to WEDU`,
                      note: "WEDU (Wrapped EDU) is required for interacting with SailFish DEX. You can unwrap it back to EDU at any time."
                    }, null, 2),
                  },
                ],
              };
            } catch (error) {
              console.error('Error wrapping EDU to WEDU:', error);
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({ 
                      error: 'Failed to wrap EDU to WEDU',
                      message: (error as Error).message
                    }, null, 2),
                  },
                ],
                isError: true,
              };
            }
          }
          
          case 'unwrap_wedu': {
            if (!args.privateKey || typeof args.privateKey !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Private key is required');
            }
            
            if (!args.amount || typeof args.amount !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Amount is required');
            }
            
            try {
              const result = await swap.unwrapWEDU(args.privateKey, args.amount);
              
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      ...result,
                      message: `Successfully unwrapped ${args.amount} WEDU to EDU`,
                    }, null, 2),
                  },
                ],
              };
            } catch (error) {
              console.error('Error unwrapping WEDU to EDU:', error);
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({ 
                      error: 'Failed to unwrap WEDU to EDU',
                      message: (error as Error).message
                    }, null, 2),
                  },
                ],
                isError: true,
              };
            }
          }
          
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        
        console.error('Error handling tool call:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('EDUCHAIN Agent Kit running on stdio');
  }
}

const server = new SailFishSubgraphServer();
server.run().catch(console.error);
