#!/usr/bin/env node
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListResourcesRequestSchema, ListResourceTemplatesRequestSchema, ListToolsRequestSchema, McpError, ReadResourceRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { ethers } from 'ethers';
import * as subgraph from './subgraph.js';
import * as blockchain from './blockchain.js';
class SailFishSubgraphServer {
    constructor() {
        this.server = new Server({
            name: 'educhain-agent-kit',
            version: '1.0.0',
        }, {
            capabilities: {
                resources: {},
                tools: {},
            },
        });
        this.setupResourceHandlers();
        this.setupToolHandlers();
        // Error handling
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', () => __awaiter(this, void 0, void 0, function* () {
            yield this.server.close();
            process.exit(0);
        }));
    }
    setupResourceHandlers() {
        // List available resources
        this.server.setRequestHandler(ListResourcesRequestSchema, () => __awaiter(this, void 0, void 0, function* () {
            return ({
                resources: [
                    {
                        uri: 'sailfish://overview',
                        name: 'SailFish DEX Overview',
                        mimeType: 'application/json',
                        description: 'Overview of SailFish DEX including TVL, volume, and other metrics',
                    },
                ],
            });
        }));
        // List resource templates
        this.server.setRequestHandler(ListResourceTemplatesRequestSchema, () => __awaiter(this, void 0, void 0, function* () {
            return ({
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
            });
        }));
        // Handle resource reading
        this.server.setRequestHandler(ReadResourceRequestSchema, (request) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { uri } = request.params;
                let content = '';
                // Handle overview resource
                if (uri === 'sailfish://overview') {
                    const factory = yield subgraph.getFactory();
                    const ethPrice = yield subgraph.getEthPrice();
                    content = JSON.stringify({
                        totalValueLockedUSD: (factory === null || factory === void 0 ? void 0 : factory.totalValueLockedUSD) || '0',
                        totalVolumeUSD: (factory === null || factory === void 0 ? void 0 : factory.totalVolumeUSD) || '0',
                        txCount: (factory === null || factory === void 0 ? void 0 : factory.txCount) || '0',
                        poolCount: (factory === null || factory === void 0 ? void 0 : factory.poolCount) || '0',
                        ethPriceUSD: ethPrice || '0',
                        timestamp: new Date().toISOString(),
                    }, null, 2);
                }
                // Handle token resource
                else if (uri.startsWith('sailfish://token/')) {
                    const tokenId = uri.replace('sailfish://token/', '');
                    const token = yield subgraph.getToken(tokenId);
                    if (!token) {
                        throw new McpError(ErrorCode.InvalidRequest, `Token with ID ${tokenId} not found`);
                    }
                    const tokenPrice = yield subgraph.getTokenPrice(tokenId);
                    content = JSON.stringify(Object.assign(Object.assign({}, token), { priceUSD: tokenPrice || 'Unknown', timestamp: new Date().toISOString() }), null, 2);
                }
                // Handle pool resource
                else if (uri.startsWith('sailfish://pool/')) {
                    const poolId = uri.replace('sailfish://pool/', '');
                    const pool = yield subgraph.getPool(poolId);
                    if (!pool) {
                        throw new McpError(ErrorCode.InvalidRequest, `Pool with ID ${poolId} not found`);
                    }
                    content = JSON.stringify(Object.assign(Object.assign({}, pool), { timestamp: new Date().toISOString() }), null, 2);
                }
                else {
                    throw new McpError(ErrorCode.InvalidRequest, `Invalid URI format: ${uri}`);
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
            }
            catch (error) {
                if (error instanceof McpError) {
                    throw error;
                }
                console.error('Error handling resource request:', error);
                throw new McpError(ErrorCode.InternalError, `Failed to fetch data: ${error.message}`);
            }
        }));
    }
    setupToolHandlers() {
        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, () => __awaiter(this, void 0, void 0, function* () {
            return ({
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
                ],
            });
        }));
        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, (request) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { name, arguments: args = {} } = request.params;
                switch (name) {
                    case 'get_token_price': {
                        if (!args.tokenId || typeof args.tokenId !== 'string') {
                            throw new McpError(ErrorCode.InvalidParams, 'Token ID is required');
                        }
                        const price = yield subgraph.getTokenPrice(args.tokenId);
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
                        const token = yield subgraph.getToken(args.tokenId);
                        if (!token) {
                            throw new McpError(ErrorCode.InvalidRequest, `Token with ID ${args.tokenId} not found`);
                        }
                        const price = yield subgraph.getTokenPrice(args.tokenId);
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(Object.assign(Object.assign({}, token), { priceUSD: price || 'Unknown' }), null, 2),
                                },
                            ],
                        };
                    }
                    case 'get_pool_info': {
                        if (!args.poolId || typeof args.poolId !== 'string') {
                            throw new McpError(ErrorCode.InvalidParams, 'Pool ID is required');
                        }
                        const pool = yield subgraph.getPool(args.poolId);
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
                        const tokens = yield subgraph.getTopTokens(count);
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
                        const pools = yield subgraph.getTopPools(count);
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
                        const tvl = yield subgraph.getTotalTVL();
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
                        const volume = yield subgraph.get24HVolume();
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
                        const data = yield subgraph.getTokenDayData(args.tokenId, days);
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
                        const data = yield subgraph.getPoolDayData(args.poolId, days);
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
                        const balance = yield blockchain.getEduBalance(args.walletAddress);
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
                        const balance = yield blockchain.getTokenBalance(args.tokenAddress, args.walletAddress);
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
                        const balances = yield blockchain.getMultipleTokenBalances(args.tokenAddresses, args.walletAddress);
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
                        const balance = yield blockchain.getERC721Balance(args.nftAddress, args.walletAddress, fetchTokenIds);
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
                        const overview = yield blockchain.getWalletOverview(args.walletAddress, tokenAddresses, nftAddresses);
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
                        const result = yield blockchain.sendEdu(args.privateKey, args.toAddress, args.amount);
                        // Add from address to the result for better context
                        const enhancedResult = Object.assign(Object.assign({}, result), { fromAddress });
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
                            tokenSymbol = yield tokenContract.symbol();
                        }
                        catch (error) {
                            console.error('Error fetching token symbol:', error);
                        }
                        // Proceed with the transaction
                        const result = yield blockchain.sendErc20Token(args.privateKey, args.tokenAddress, args.toAddress, args.amount);
                        // Add from address and token symbol to the result for better context
                        const enhancedResult = Object.assign(Object.assign({}, result), { fromAddress,
                            tokenSymbol });
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(enhancedResult, null, 2),
                                },
                            ],
                        };
                    }
                    default:
                        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
                }
            }
            catch (error) {
                if (error instanceof McpError) {
                    throw error;
                }
                console.error('Error handling tool call:', error);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${error.message}`,
                        },
                    ],
                    isError: true,
                };
            }
        }));
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            const transport = new StdioServerTransport();
            yield this.server.connect(transport);
            console.error('EDUCHAIN Agent Kit running on stdio');
        });
    }
}
const server = new SailFishSubgraphServer();
server.run().catch(console.error);
//# sourceMappingURL=index.js.map