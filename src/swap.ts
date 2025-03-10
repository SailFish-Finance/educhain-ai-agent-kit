import { ethers } from 'ethers';
import * as blockchain from './blockchain.js';
import * as subgraph from './subgraph.js';
import * as routes from './routes.js';
// import { Percent } from '@uniswap/sdk-core';

// SailFish V3 contract addresses
const CONTRACTS = {
  SwapRouter: '0x1a1e967e523435CeF20642e3D7811F7d0da9a704',
  Quoter: '0x14b4D9238550dc75Cf164FDa471Aa1d8A6A2b0c6',
  QuoterV2: '0x83EE12582E3448Ab69E664A2ba69b6AedE112205',
  UniswapV3Factory: '0x963A7f4eB46967A9fd3dFbabD354fC294FA2BF5C',
  WETH9: '0xd02E8c38a8E3db71f8b2ae30B8186d7874934e12', // Wrapped EDU address
};

// Common token addresses (can be expanded)
const TOKENS = {
  WETH: '0xd02E8c38a8E3db71f8b2ae30B8186d7874934e12', // Wrapped EDU
};

// ABIs
const SWAP_ROUTER_ABI = [
  {
    type: "constructor",
    inputs: [
      { name: "_factory", type: "address", internalType: "address" },
      { name: "_WETH9", type: "address", internalType: "address" },
      { name: "initCodeHash", type: "bytes32", internalType: "bytes32" },
    ],
    stateMutability: "nonpayable",
  },
  { type: "receive", stateMutability: "payable" },
  {
    type: "function",
    name: "WETH9",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "exactInput",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct ISwapRouter.ExactInputParams",
        components: [
          { name: "path", type: "bytes", internalType: "bytes" },
          {
            name: "recipient",
            type: "address",
            internalType: "address",
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "amountIn",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "amountOutMinimum",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
    ],
    outputs: [{ name: "amountOut", type: "uint256", internalType: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "exactInputSingle",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct ISwapRouter.ExactInputSingleParams",
        components: [
          { name: "tokenIn", type: "address", internalType: "address" },
          {
            name: "tokenOut",
            type: "address",
            internalType: "address",
          },
          { name: "fee", type: "uint24", internalType: "uint24" },
          {
            name: "recipient",
            type: "address",
            internalType: "address",
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "amountIn",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "amountOutMinimum",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "sqrtPriceLimitX96",
            type: "uint160",
            internalType: "uint160",
          },
        ],
      },
    ],
    outputs: [{ name: "amountOut", type: "uint256", internalType: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "exactOutput",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct ISwapRouter.ExactOutputParams",
        components: [
          { name: "path", type: "bytes", internalType: "bytes" },
          {
            name: "recipient",
            type: "address",
            internalType: "address",
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "amountOut",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "amountInMaximum",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
    ],
    outputs: [{ name: "amountIn", type: "uint256", internalType: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "exactOutputSingle",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct ISwapRouter.ExactOutputSingleParams",
        components: [
          { name: "tokenIn", type: "address", internalType: "address" },
          {
            name: "tokenOut",
            type: "address",
            internalType: "address",
          },
          { name: "fee", type: "uint24", internalType: "uint24" },
          {
            name: "recipient",
            type: "address",
            internalType: "address",
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "amountOut",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "amountInMaximum",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "sqrtPriceLimitX96",
            type: "uint160",
            internalType: "uint160",
          },
        ],
      },
    ],
    outputs: [{ name: "amountIn", type: "uint256", internalType: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "factory",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "multicall",
    inputs: [{ name: "data", type: "bytes[]", internalType: "bytes[]" }],
    outputs: [{ name: "results", type: "bytes[]", internalType: "bytes[]" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "refundETH",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "selfPermit",
    inputs: [
      { name: "token", type: "address", internalType: "address" },
      { name: "value", type: "uint256", internalType: "uint256" },
      { name: "deadline", type: "uint256", internalType: "uint256" },
      { name: "v", type: "uint8", internalType: "uint8" },
      { name: "r", type: "bytes32", internalType: "bytes32" },
      { name: "s", type: "bytes32", internalType: "bytes32" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "selfPermitAllowed",
    inputs: [
      { name: "token", type: "address", internalType: "address" },
      { name: "nonce", type: "uint256", internalType: "uint256" },
      { name: "expiry", type: "uint256", internalType: "uint256" },
      { name: "v", type: "uint8", internalType: "uint8" },
      { name: "r", type: "bytes32", internalType: "bytes32" },
      { name: "s", type: "bytes32", internalType: "bytes32" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "selfPermitAllowedIfNecessary",
    inputs: [
      { name: "token", type: "address", internalType: "address" },
      { name: "nonce", type: "uint256", internalType: "uint256" },
      { name: "expiry", type: "uint256", internalType: "uint256" },
      { name: "v", type: "uint8", internalType: "uint8" },
      { name: "r", type: "bytes32", internalType: "bytes32" },
      { name: "s", type: "bytes32", internalType: "bytes32" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "selfPermitIfNecessary",
    inputs: [
      { name: "token", type: "address", internalType: "address" },
      { name: "value", type: "uint256", internalType: "uint256" },
      { name: "deadline", type: "uint256", internalType: "uint256" },
      { name: "v", type: "uint8", internalType: "uint8" },
      { name: "r", type: "bytes32", internalType: "bytes32" },
      { name: "s", type: "bytes32", internalType: "bytes32" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "sweepToken",
    inputs: [
      { name: "token", type: "address", internalType: "address" },
      {
        name: "amountMinimum",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "recipient", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "sweepTokenWithFee",
    inputs: [
      { name: "token", type: "address", internalType: "address" },
      {
        name: "amountMinimum",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "recipient", type: "address", internalType: "address" },
      { name: "feeBips", type: "uint256", internalType: "uint256" },
      { name: "feeRecipient", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "uniswapV3SwapCallback",
    inputs: [
      { name: "amount0Delta", type: "int256", internalType: "int256" },
      { name: "amount1Delta", type: "int256", internalType: "int256" },
      { name: "_data", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "unwrapWETH9",
    inputs: [
      {
        name: "amountMinimum",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "recipient", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "unwrapWETH9WithFee",
    inputs: [
      {
        name: "amountMinimum",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "recipient", type: "address", internalType: "address" },
      { name: "feeBips", type: "uint256", internalType: "uint256" },
      { name: "feeRecipient", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];

const QUOTER_ABI = [
  {
    type: "constructor",
    inputs: [
      { name: "_factory", type: "address", internalType: "address" },
      { name: "_WETH9", type: "address", internalType: "address" },
      { name: "initCodeHash", type: "bytes32", internalType: "bytes32" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "WETH9",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "factory",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "quoteExactInput",
    inputs: [
      { name: "path", type: "bytes", internalType: "bytes" },
      { name: "amountIn", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      { name: "amountOut", type: "uint256", internalType: "uint256" },
      {
        name: "sqrtPriceX96AfterList",
        type: "uint160[]",
        internalType: "uint160[]",
      },
      {
        name: "initializedTicksCrossedList",
        type: "uint32[]",
        internalType: "uint32[]",
      },
      { name: "gasEstimate", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "quoteExactInputSingle",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct IQuoterV2.QuoteExactInputSingleParams",
        components: [
          { name: "tokenIn", type: "address", internalType: "address" },
          {
            name: "tokenOut",
            type: "address",
            internalType: "address",
          },
          {
            name: "amountIn",
            type: "uint256",
            internalType: "uint256",
          },
          { name: "fee", type: "uint24", internalType: "uint24" },
          {
            name: "sqrtPriceLimitX96",
            type: "uint160",
            internalType: "uint160",
          },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256", internalType: "uint256" },
      {
        name: "sqrtPriceX96After",
        type: "uint160",
        internalType: "uint160",
      },
      {
        name: "initializedTicksCrossed",
        type: "uint32",
        internalType: "uint32",
      },
      { name: "gasEstimate", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "quoteExactOutput",
    inputs: [
      { name: "path", type: "bytes", internalType: "bytes" },
      { name: "amountOut", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      { name: "amountIn", type: "uint256", internalType: "uint256" },
      {
        name: "sqrtPriceX96AfterList",
        type: "uint160[]",
        internalType: "uint160[]",
      },
      {
        name: "initializedTicksCrossedList",
        type: "uint32[]",
        internalType: "uint32[]",
      },
      { name: "gasEstimate", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "quoteExactOutputSingle",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct IQuoterV2.QuoteExactOutputSingleParams",
        components: [
          { name: "tokenIn", type: "address", internalType: "address" },
          {
            name: "tokenOut",
            type: "address",
            internalType: "address",
          },
          { name: "amount", type: "uint256", internalType: "uint256" },
          { name: "fee", type: "uint24", internalType: "uint24" },
          {
            name: "sqrtPriceLimitX96",
            type: "uint160",
            internalType: "uint160",
          },
        ],
      },
    ],
    outputs: [
      { name: "amountIn", type: "uint256", internalType: "uint256" },
      {
        name: "sqrtPriceX96After",
        type: "uint160",
        internalType: "uint160",
      },
      {
        name: "initializedTicksCrossed",
        type: "uint32",
        internalType: "uint32",
      },
      { name: "gasEstimate", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "uniswapV3SwapCallback",
    inputs: [
      { name: "amount0Delta", type: "int256", internalType: "int256" },
      { name: "amount1Delta", type: "int256", internalType: "int256" },
      { name: "path", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "view",
  },
];

// Fee tiers
const FEE_TIERS = {
  LOWEST: 100,   // 0.01%
  LOW: 500,      // 0.05%
  MEDIUM: 3000,  // 0.3%
  HIGH: 10000    // 1%
};

// Helper function to encode path for multi-hop swaps
function encodePath(path: string[], fees: number[]): string {
  if (path.length !== fees.length + 1) {
    throw new Error('Path and fees length mismatch');
  }

  let encoded = '0x';
  for (let i = 0; i < fees.length; i++) {
    encoded += path[i].slice(2);
    encoded += fees[i].toString(16).padStart(6, '0');
  }
  encoded += path[path.length - 1].slice(2);
  return encoded;
}

// Find the best route for a token pair
export async function findBestRoute(
  tokenA: string,
  tokenB: string
): Promise<routes.RouteInfo> {
  try {
    // Get the best route from the routes module
    const bestRoute = await routes.getBestRoute(tokenA, tokenB);
    
    if (!bestRoute) {
      throw new Error(`No route found for token pair ${tokenA}/${tokenB}`);
    }
    
    // Remove console.log to prevent interference with JSON parsing
    // console.log(`Found ${bestRoute.type} route for ${tokenA}/${tokenB} with fee: ${bestRoute.totalFee * 100}%`);
    
    return bestRoute;
  } catch (error) {
    console.error('Error finding best route:', error);
    throw error;
  }
}

// Calculate price impact percentage
export function calculatePriceImpact(
  amountIn: string,
  amountOut: string,
  midPrice: string,
  tokenInDecimals: number,
  tokenOutDecimals: number
): number {
  const amountInDecimal = parseFloat(amountIn);
  const amountOutDecimal = parseFloat(amountOut);
  const midPriceDecimal = parseFloat(midPrice);
  
  // Calculate expected output based on mid price
  const expectedOutput = amountInDecimal * midPriceDecimal;
  
  // Calculate price impact
  const impact = (expectedOutput - amountOutDecimal) / expectedOutput * 100;
  
  return Math.max(0, impact); // Ensure we don't return negative values
}

// Apply slippage to an amount
export function applySlippage(
  amount: string,
  slippagePercentage: number,
  increase: boolean = false
): string {
  const amountBigInt = ethers.getBigInt(amount);
  const slippageFactor = 1000 - (slippagePercentage * 10); // Convert percentage to basis points
  
  if (increase) {
    // Increase amount by slippage (for maximum input)
    return ((amountBigInt * BigInt(1000)) / BigInt(slippageFactor)).toString();
  } else {
    // Decrease amount by slippage (for minimum output)
    return ((amountBigInt * BigInt(slippageFactor)) / BigInt(1000)).toString();
  }
}

// Get quote for token swap
export async function getSwapQuote(
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  slippagePercentage: number = 0.5
): Promise<{
  amountOut: string;
  formattedAmountOut: string;
  minimumAmountOut: string;
  formattedMinimumAmountOut: string;
  tokenInSymbol: string;
  tokenOutSymbol: string;
  tokenInDecimals: number;
  tokenOutDecimals: number;
  route: routes.RouteInfo;
  priceImpact: number;
  midPrice: string;
}> {
  try {
    // Find the best route for the token pair
    const route = await findBestRoute(tokenIn, tokenOut);
    
    const provider = blockchain.getProvider();
    
    // Get token details
    const tokenInContract = new ethers.Contract(tokenIn, ERC20_ABI, provider);
    const tokenOutContract = new ethers.Contract(tokenOut, ERC20_ABI, provider);
    
    const [tokenInDecimals, tokenOutDecimals, tokenInSymbol, tokenOutSymbol] = await Promise.all([
      tokenInContract.decimals(),
      tokenOutContract.decimals(),
      tokenInContract.symbol(),
      tokenOutContract.symbol(),
    ]);
    
    // Convert amount to token units
    const amountInWei = ethers.parseUnits(amountIn, tokenInDecimals);
    
    // Get quote based on route type
    let amountOutWei: bigint;
    let midPrice: string;
    
    if (route.type === 'direct') {
      // Direct route (single hop)
      const pool = route.path[0];
      const fee = parseInt(pool.feeTier);
      
      // Get quote using the QuoterV2 contract
      const quoterContract = new ethers.Contract(CONTRACTS.QuoterV2, QUOTER_ABI, provider);
      const quoteParams = {
        tokenIn,
        tokenOut,
        amountIn: amountInWei,
        fee,
        sqrtPriceLimitX96: 0 // No price limit
      };
      
      // Use a static call to get the quote without sending a transaction
      const quoterInterface = new ethers.Interface(QUOTER_ABI);
      const calldata = quoterInterface.encodeFunctionData('quoteExactInputSingle', [quoteParams]);
      
      const result = await provider.call({
        to: CONTRACTS.QuoterV2,
        data: calldata,
      });
      
      const decodedResult = quoterInterface.decodeFunctionResult('quoteExactInputSingle', result);
      amountOutWei = decodedResult[0]; // Get the first return value (amountOut)
      
      // Get mid price from the pool
      if (pool.token0.address.toLowerCase() === tokenIn.toLowerCase()) {
        midPrice = pool.token1Price || '0';
      } else {
        midPrice = pool.token0Price || '0';
      }
    } else {
      // Indirect route (multi-hop)
      // For simplicity, we'll use the direct route approach for each hop and multiply the results
      // In a production environment, you would use the exactInput function with a path
      
      // First hop
      const pool1 = route.path[0];
      const fee1 = parseInt(pool1.feeTier);
      const intermediaryToken = route.intermediaryToken!;
      
      // Second hop
      const pool2 = route.path[1];
      const fee2 = parseInt(pool2.feeTier);
      
      // Get quote for first hop
      const quoterContract = new ethers.Contract(CONTRACTS.QuoterV2, QUOTER_ABI, provider);
      
      // First hop quote
      const quoteParams1 = {
        tokenIn,
        tokenOut: intermediaryToken.address,
        amountIn: amountInWei,
        fee: fee1,
        sqrtPriceLimitX96: 0
      };
      
      const quoterInterface = new ethers.Interface(QUOTER_ABI);
      const calldata1 = quoterInterface.encodeFunctionData('quoteExactInputSingle', [quoteParams1]);
      
      const result1 = await provider.call({
        to: CONTRACTS.QuoterV2,
        data: calldata1,
      });
      
      const decodedResult1 = quoterInterface.decodeFunctionResult('quoteExactInputSingle', result1);
      const intermediateAmountWei = decodedResult1[0];
      
      // Second hop quote
      const quoteParams2 = {
        tokenIn: intermediaryToken.address,
        tokenOut,
        amountIn: intermediateAmountWei,
        fee: fee2,
        sqrtPriceLimitX96: 0
      };
      
      const calldata2 = quoterInterface.encodeFunctionData('quoteExactInputSingle', [quoteParams2]);
      
      const result2 = await provider.call({
        to: CONTRACTS.QuoterV2,
        data: calldata2,
      });
      
      const decodedResult2 = quoterInterface.decodeFunctionResult('quoteExactInputSingle', result2);
      amountOutWei = decodedResult2[0];
      
      // Calculate mid price for multi-hop (approximate)
      const midPrice1 = pool1.token0.address.toLowerCase() === tokenIn.toLowerCase() 
        ? pool1.token1Price || '0'
        : pool1.token0Price || '0';
        
      const midPrice2 = pool2.token0.address.toLowerCase() === intermediaryToken.address.toLowerCase()
        ? pool2.token1Price || '0'
        : pool2.token0Price || '0';
        
      midPrice = (parseFloat(midPrice1) * parseFloat(midPrice2)).toString();
    }
    
    // Format amount out
    const formattedAmountOut = ethers.formatUnits(amountOutWei, tokenOutDecimals);
    
    // Calculate minimum amount out with slippage
    const minimumAmountOut = applySlippage(amountOutWei.toString(), slippagePercentage);
    const formattedMinimumAmountOut = ethers.formatUnits(minimumAmountOut, tokenOutDecimals);
    
    // Calculate price impact
    const priceImpact = calculatePriceImpact(
      amountIn,
      formattedAmountOut,
      midPrice,
      tokenInDecimals,
      tokenOutDecimals
    );
    
    return {
      amountOut: amountOutWei.toString(),
      formattedAmountOut,
      minimumAmountOut,
      formattedMinimumAmountOut,
      tokenInSymbol,
      tokenOutSymbol,
      tokenInDecimals,
      tokenOutDecimals,
      route,
      priceImpact,
      midPrice
    };
  } catch (error) {
    console.error('Error getting swap quote:', error);
    throw error;
  }
}

// Swap token to token
export async function swapExactTokensForTokens(
  privateKey: string,
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  slippagePercentage: number = 0.5 // Default 0.5% slippage
): Promise<{
  hash: string;
  from: string;
  amountIn: string;
  amountOut: string;
  tokenIn: string;
  tokenOut: string;
  tokenInSymbol: string;
  tokenOutSymbol: string;
  route: routes.RouteInfo;
}> {
  try {
    const provider = blockchain.getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    const fromAddress = wallet.address;
    
    // Get quote and route information
    const quote = await getSwapQuote(tokenIn, tokenOut, amountIn, slippagePercentage);
    const route = quote.route;
    
    // Convert amount to token units
    const amountInWei = ethers.parseUnits(amountIn, quote.tokenInDecimals);
    const minAmountOut = ethers.getBigInt(quote.minimumAmountOut);
    
    // Approve router to spend tokens
    const tokenContract = new ethers.Contract(tokenIn, ERC20_ABI, wallet);
    const approveTx = await tokenContract.approve(CONTRACTS.SwapRouter, amountInWei);
    await approveTx.wait();
    
    // Create swap router contract
    const swapRouter = new ethers.Contract(CONTRACTS.SwapRouter, SWAP_ROUTER_ABI, wallet);
    
    // Execute swap based on route type
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now
    let tx;
    
    if (route.type === 'direct') {
      // Direct route (single hop)
      const fee = parseInt(route.path[0].feeTier);
      
      const swapParams = {
        tokenIn,
        tokenOut,
        fee,
        recipient: fromAddress,
        deadline,
        amountIn: amountInWei,
        amountOutMinimum: minAmountOut,
        sqrtPriceLimitX96: 0 // No price limit
      };
      
      tx = await swapRouter.exactInputSingle(swapParams);
    } else {
      // Indirect route (multi-hop)
      const intermediaryToken = route.intermediaryToken!;
      
      // Encode the path for multi-hop swap
      const path = ethers.solidityPacked(
        ['address', 'uint24', 'address', 'uint24', 'address'],
        [
          tokenIn,
          parseInt(route.path[0].feeTier),
          intermediaryToken.address,
          parseInt(route.path[1].feeTier),
          tokenOut
        ]
      );
      
      const swapParams = {
        path,
        recipient: fromAddress,
        deadline,
        amountIn: amountInWei,
        amountOutMinimum: minAmountOut
      };
      
      tx = await swapRouter.exactInput(swapParams);
    }
    
    const receipt = await tx.wait();
    
    if (!receipt) {
      throw new Error('Transaction failed');
    }
    
    return {
      hash: tx.hash,
      from: fromAddress,
      amountIn,
      amountOut: quote.formattedMinimumAmountOut,
      tokenIn,
      tokenOut,
      tokenInSymbol: quote.tokenInSymbol,
      tokenOutSymbol: quote.tokenOutSymbol,
      route
    };
  } catch (error) {
    console.error('Error swapping tokens:', error);
    throw error;
  }
}

// Swap EDU to token
export async function swapExactEDUForTokens(
  privateKey: string,
  tokenOut: string,
  amountIn: string,
  slippagePercentage: number = 0.5 // Default 0.5% slippage
): Promise<{
  hash: string;
  from: string;
  amountIn: string;
  amountOut: string;
  tokenOut: string;
  tokenOutSymbol: string;
  route: routes.RouteInfo;
}> {
  try {
    const provider = blockchain.getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    const fromAddress = wallet.address;
    
    // Get quote and route information
    const quote = await getSwapQuote(CONTRACTS.WETH9, tokenOut, amountIn, slippagePercentage);
    const route = quote.route;
    
    // Convert EDU amount to wei
    const amountInWei = ethers.parseEther(amountIn);
    const minAmountOut = ethers.getBigInt(quote.minimumAmountOut);
    
    // Create swap router contract
    const swapRouter = new ethers.Contract(CONTRACTS.SwapRouter, SWAP_ROUTER_ABI, wallet);
    
    // Execute swap based on route type
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now
    let tx;
    
    try {
      // Transaction details are logged to server console only, not mixed with JSON response
      
      if (route.type === 'direct') {
        // Direct route (single hop)
        const fee = parseInt(route.path[0].feeTier);
        
        const swapParams = {
          tokenIn: CONTRACTS.WETH9,
          tokenOut,
          fee,
          recipient: fromAddress,
          deadline,
          amountIn: amountInWei,
          amountOutMinimum: minAmountOut,
          sqrtPriceLimitX96: 0 // No price limit
        };
        
        // Check if the value is reasonable (not excessively large)
        if (amountInWei > ethers.parseEther('1000000')) {
          throw new Error(`Amount too large: ${ethers.formatEther(amountInWei)} EDU`);
        }
        
        // Use a gas limit to prevent excessive gas usage
        tx = await swapRouter.exactInputSingle(swapParams, { 
          value: amountInWei,
          gasLimit: 500000 // Set a reasonable gas limit
        });
      } else {
        // Indirect route (multi-hop)
        const intermediaryToken = route.intermediaryToken!;
        
        // Encode the path for multi-hop swap
        const path = ethers.solidityPacked(
          ['address', 'uint24', 'address', 'uint24', 'address'],
          [
            CONTRACTS.WETH9,
            parseInt(route.path[0].feeTier),
            intermediaryToken.address,
            parseInt(route.path[1].feeTier),
            tokenOut
          ]
        );
        
        const swapParams = {
          path,
          recipient: fromAddress,
          deadline,
          amountIn: amountInWei,
          amountOutMinimum: minAmountOut
        };
        
        // Check if the value is reasonable (not excessively large)
        if (amountInWei > ethers.parseEther('1000000')) {
          throw new Error(`Amount too large: ${ethers.formatEther(amountInWei)} EDU`);
        }
        
        // Use a gas limit to prevent excessive gas usage
        tx = await swapRouter.exactInput(swapParams, { 
          value: amountInWei,
          gasLimit: 500000 // Set a reasonable gas limit
        });
      }
    } catch (error: any) {
      console.error('Error executing swap transaction:', error);
      
      // Provide more detailed error information
      if (error.message && error.message.includes('insufficient funds')) {
        throw new Error(`Insufficient funds for transaction. Make sure you have enough EDU for the swap amount (${amountIn} EDU) plus gas fees.`);
      }
      
      throw error;
    }
    
    const receipt = await tx.wait();
    
    if (!receipt) {
      throw new Error('Transaction failed');
    }
    
    return {
      hash: tx.hash,
      from: fromAddress,
      amountIn,
      amountOut: quote.formattedMinimumAmountOut,
      tokenOut,
      tokenOutSymbol: quote.tokenOutSymbol,
      route
    };
  } catch (error) {
    console.error('Error swapping EDU for tokens:', error);
    throw error;
  }
}

// Wrap EDU to WEDU
export async function wrapEDU(
  privateKey: string,
  amount: string
): Promise<{
  hash: string;
  from: string;
  amount: string;
  success: boolean;
}> {
  try {
    const provider = blockchain.getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    const fromAddress = wallet.address;
    
    // Convert EDU amount to wei
    const amountInWei = ethers.parseEther(amount);
    
    // Create WETH9 contract instance
    const wethAbi = [
      'function deposit() external payable',
      'function withdraw(uint256 amount) external',
      'function balanceOf(address owner) view returns (uint256)',
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];
    
    const wethContract = new ethers.Contract(CONTRACTS.WETH9, wethAbi, wallet);
    
    // Deposit EDU to get WEDU
    const tx = await wethContract.deposit({ value: amountInWei });
    const receipt = await tx.wait();
    
    if (!receipt) {
      throw new Error('Transaction failed');
    }
    
    return {
      hash: tx.hash,
      from: fromAddress,
      amount,
      success: true
    };
  } catch (error) {
    console.error('Error wrapping EDU to WEDU:', error);
    throw error;
  }
}

// Unwrap WEDU to EDU
export async function unwrapWEDU(
  privateKey: string,
  amount: string
): Promise<{
  hash: string;
  from: string;
  amount: string;
  success: boolean;
}> {
  try {
    const provider = blockchain.getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    const fromAddress = wallet.address;
    
    // Convert WEDU amount to wei
    const amountInWei = ethers.parseEther(amount);
    
    // Create WETH9 contract instance
    const wethAbi = [
      'function deposit() external payable',
      'function withdraw(uint256 amount) external',
      'function balanceOf(address owner) view returns (uint256)',
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];
    
    const wethContract = new ethers.Contract(CONTRACTS.WETH9, wethAbi, wallet);
    
    // Check balance
    const balance = await wethContract.balanceOf(fromAddress);
    if (balance < amountInWei) {
      throw new Error(`Insufficient WEDU balance. You have ${ethers.formatEther(balance)} WEDU, but tried to unwrap ${amount} WEDU.`);
    }
    
    // Withdraw WEDU to get EDU
    const tx = await wethContract.withdraw(amountInWei);
    const receipt = await tx.wait();
    
    if (!receipt) {
      throw new Error('Transaction failed');
    }
    
    return {
      hash: tx.hash,
      from: fromAddress,
      amount,
      success: true
    };
  } catch (error) {
    console.error('Error unwrapping WEDU to EDU:', error);
    throw error;
  }
}

// Swap token to EDU
export async function swapExactTokensForEDU(
  privateKey: string,
  tokenIn: string,
  amountIn: string,
  slippagePercentage: number = 0.5, // Default 0.5% slippage
  fee?: number
): Promise<{
  hash: string;
  from: string;
  amountIn: string;
  amountOut: string;
  tokenIn: string;
  tokenInSymbol: string;
}> {
  try {
    const provider = blockchain.getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    const fromAddress = wallet.address;
    
    // If fee is not provided, find the best route
    const route = await findBestRoute(tokenIn, CONTRACTS.WETH9);
    const fee = parseInt(route.path[0].feeTier);
    
    // Get token details
    const tokenInContract = new ethers.Contract(tokenIn, ERC20_ABI, provider);
    const tokenInDecimals = await tokenInContract.decimals();
    const tokenInSymbol = await tokenInContract.symbol();
    
    // Convert amount to token units
    const amountInWei = ethers.parseUnits(amountIn, tokenInDecimals);
    
    // Approve router to spend tokens
    const approveTx = await tokenInContract.approve(CONTRACTS.SwapRouter, amountInWei);
    await approveTx.wait();
    
    // Get quote for token to WETH (since we'll be using WETH internally)
    const quoterContract = new ethers.Contract(CONTRACTS.QuoterV2, QUOTER_ABI, provider);
    const quoteParams = {
      tokenIn,
      tokenOut: CONTRACTS.WETH9,
      amountIn: amountInWei,
      fee,
      sqrtPriceLimitX96: 0 // No price limit
    };
    
    // Use a static call to get the quote without sending a transaction
    const quoterInterface = new ethers.Interface(QUOTER_ABI);
    const calldata = quoterInterface.encodeFunctionData('quoteExactInputSingle', [quoteParams]);
    
    const result = await provider.call({
      to: CONTRACTS.QuoterV2,
      data: calldata,
    });
    
    const decodedResult = quoterInterface.decodeFunctionResult('quoteExactInputSingle', result);
    const amountOutWei = decodedResult[0]; // Get the first return value (amountOut)
    
    // Calculate minimum amount out with slippage
    const slippageFactor = 1000 - (slippagePercentage * 10); // Convert percentage to basis points
    const minAmountOut = (amountOutWei * BigInt(slippageFactor)) / BigInt(1000);
    
    // Create swap router contract
    const swapRouter = new ethers.Contract(CONTRACTS.SwapRouter, SWAP_ROUTER_ABI, wallet);
    
    // Execute swap
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now
    
    // We need to swap to WETH and then unwrap it to ETH
    const swapParams = {
      tokenIn,
      tokenOut: CONTRACTS.WETH9,
      fee,
      recipient: CONTRACTS.SwapRouter, // Send to router for unwrapping
      deadline,
      amountIn: amountInWei,
      amountOutMinimum: minAmountOut,
      sqrtPriceLimitX96: 0 // No price limit
    };
    
    const tx = await swapRouter.exactInputSingle(swapParams);
    
    // Unwrap WETH to ETH and send to user
    await swapRouter.unwrapWETH9(minAmountOut, fromAddress);
    
    const receipt = await tx.wait();
    
    if (!receipt) {
      throw new Error('Transaction failed');
    }
    
    return {
      hash: tx.hash,
      from: fromAddress,
      amountIn,
      amountOut: ethers.formatEther(minAmountOut),
      tokenIn,
      tokenInSymbol
    };
  } catch (error) {
    console.error('Error swapping tokens for EDU:', error);
    throw error;
  }
}
