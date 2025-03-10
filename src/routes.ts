import { request, gql } from 'graphql-request';
import { ethers } from 'ethers';
import { Provider } from 'ethers';
import * as blockchain from './blockchain.js';

// SailFish V3 subgraph URL
const SUBGRAPH_URL = 'https://api.goldsky.com/api/public/project_cm5nst0b7iiqy01t6hxww7gao/subgraphs/sailfish-v3-occ-mainnet/1.0.0/gn';

// Query to find direct pools between two tokens
const DIRECT_POOLS_QUERY = gql`
  query findDirectPools($token0: String!, $token1: String!) {
    pools(
      where: {
        token0_in: [$token0, $token1]
        token1_in: [$token0, $token1]
        liquidity_gt: 0
      }
    ) {
      id
      token0 {
        id
        symbol
        decimals
        name
      }
      token1 {
        id
        symbol
        decimals
        name
      }
      feeTier
      liquidity
      token0Price
      token1Price
      totalValueLockedUSD
    }
  }
`;

// Query to find pools for indirect routes
const INDIRECT_POOLS_QUERY = gql`
  query findIndirectPools($tokenIn: String!, $tokenOut: String!) {
    # First, find pools containing tokenIn
    pools0: pools(
      where: {
        or: [
          { token0: $tokenIn, liquidity_gt: 0 }
          { token1: $tokenIn, liquidity_gt: 0 }
        ]
      }
    ) {
      id
      token0 {
        id
        symbol
        decimals
        name
      }
      token1 {
        id
        symbol
        decimals
        name
      }
      feeTier
      liquidity
      totalValueLockedUSD
    }
    # Then, find pools containing tokenOut
    pools1: pools(
      where: {
        or: [
          { token0: $tokenOut, liquidity_gt: 0 }
          { token1: $tokenOut, liquidity_gt: 0 }
        ]
      }
    ) {
      id
      token0 {
        id
        symbol
        decimals
        name
      }
      token1 {
        id
        symbol
        decimals
        name
      }
      feeTier
      liquidity
      totalValueLockedUSD
    }
  }
`;

// Interface for token information
export interface TokenInfo {
  id: string;
  address: string;
  symbol: string;
  decimals: number;
  name: string;
}

// Interface for pool information
export interface PoolInfo {
  id: string;
  token0: TokenInfo;
  token1: TokenInfo;
  feeTier: string;
  liquidity: string;
  token0Price?: string;
  token1Price?: string;
  totalValueLockedUSD: string;
}

// Interface for route information
export interface RouteInfo {
  type: 'direct' | 'indirect';
  path: PoolInfo[];
  intermediaryToken?: TokenInfo;
  totalFee: number;
}

// Interface for routes result
export interface RoutesResult {
  type: 'direct' | 'indirect';
  routes: RouteInfo[];
}

/**
 * Find all possible routes between two tokens
 * @param tokenInAddress The address of the input token
 * @param tokenOutAddress The address of the output token
 * @returns All possible routes between the two tokens
 */
export async function findAllRoutes(tokenInAddress: string, tokenOutAddress: string): Promise<RoutesResult> {
  try {
    // First, try to find direct routes
    const directPools = await request<{ pools: PoolInfo[] }>(SUBGRAPH_URL, DIRECT_POOLS_QUERY, {
      token0: tokenInAddress.toLowerCase(),
      token1: tokenOutAddress.toLowerCase(),
    });

    // If direct routes exist, return them
    if (directPools.pools.length > 0) {
      return {
        type: 'direct',
        routes: directPools.pools.map((pool) => ({
          type: 'direct' as const,
          path: [
            {
              ...pool,
              token0: {
                id: pool.token0.id,
                address: pool.token0.id,
                symbol: pool.token0.symbol,
                decimals: parseInt(pool.token0.decimals.toString()),
                name: pool.token0.name,
              },
              token1: {
                id: pool.token1.id,
                address: pool.token1.id,
                symbol: pool.token1.symbol,
                decimals: parseInt(pool.token1.decimals.toString()),
                name: pool.token1.name,
              },
            },
          ],
          totalFee: parseInt(pool.feeTier) / 1000000,
        })).sort((a, b) => 
          parseFloat(b.path[0].totalValueLockedUSD) - parseFloat(a.path[0].totalValueLockedUSD)
        ),
      };
    }

    // If no direct routes, look for indirect routes
    const indirectPools = await request<{ pools0: PoolInfo[], pools1: PoolInfo[] }>(SUBGRAPH_URL, INDIRECT_POOLS_QUERY, {
      tokenIn: tokenInAddress.toLowerCase(),
      tokenOut: tokenOutAddress.toLowerCase(),
    });

    // Find common tokens between pools containing tokenIn and tokenOut
    const intermediaryTokens = findIntermediaryTokens(
      indirectPools.pools0,
      indirectPools.pools1
    );

    // Construct indirect routes
    const routes = constructIndirectRoutes(
      indirectPools.pools0,
      indirectPools.pools1,
      intermediaryTokens
    );

    return {
      type: 'indirect',
      routes: routes,
    };
  } catch (error) {
    console.error('Error finding routes:', error);
    throw error;
  }
}

/**
 * Find intermediary tokens between two sets of pools
 * @param pools0 Pools containing the input token
 * @param pools1 Pools containing the output token
 * @returns Array of intermediary token addresses
 */
function findIntermediaryTokens(pools0: PoolInfo[], pools1: PoolInfo[]): string[] {
  const tokens0 = new Set<string>();
  const tokens1 = new Set<string>();

  // Collect all tokens from first hop pools
  pools0.forEach((pool) => {
    tokens0.add(pool.token0.id);
    tokens0.add(pool.token1.id);
  });

  // Collect all tokens from second hop pools
  pools1.forEach((pool) => {
    tokens1.add(pool.token0.id);
    tokens1.add(pool.token1.id);
  });

  // Find intersection of tokens (potential intermediary tokens)
  return Array.from(tokens0).filter((token) => tokens1.has(token));
}

/**
 * Construct indirect routes between two tokens
 * @param pools0 Pools containing the input token
 * @param pools1 Pools containing the output token
 * @param intermediaryTokens Array of intermediary token addresses
 * @returns Array of indirect routes
 */
function constructIndirectRoutes(pools0: PoolInfo[], pools1: PoolInfo[], intermediaryTokens: string[]): RouteInfo[] {
  const routes: RouteInfo[] = [];

  intermediaryTokens.forEach((intermediaryToken) => {
    const firstHopPools = pools0.filter(
      (pool) =>
        pool.token0.id === intermediaryToken ||
        pool.token1.id === intermediaryToken
    );

    const secondHopPools = pools1.filter(
      (pool) =>
        pool.token0.id === intermediaryToken ||
        pool.token1.id === intermediaryToken
    );

    firstHopPools.forEach((firstPool) => {
      secondHopPools.forEach((secondPool) => {
        const intermediaryTokenDetails: TokenInfo = {
          id: intermediaryToken,
          address: intermediaryToken,
          symbol:
            firstPool.token0.id === intermediaryToken
              ? firstPool.token0.symbol
              : firstPool.token1.symbol,
          decimals:
            firstPool.token0.id === intermediaryToken
              ? parseInt(firstPool.token0.decimals.toString())
              : parseInt(firstPool.token1.decimals.toString()),
          name:
            firstPool.token0.id === intermediaryToken
              ? firstPool.token0.name
              : firstPool.token1.name,
        };

        routes.push({
          type: 'indirect' as const,
          path: [
            {
              ...firstPool,
              token0: {
                id: firstPool.token0.id,
                address: firstPool.token0.id,
                symbol: firstPool.token0.symbol,
                decimals: parseInt(firstPool.token0.decimals.toString()),
                name: firstPool.token0.name,
              },
              token1: {
                id: firstPool.token1.id,
                address: firstPool.token1.id,
                symbol: firstPool.token1.symbol,
                decimals: parseInt(firstPool.token1.decimals.toString()),
                name: firstPool.token1.name,
              },
            },
            {
              ...secondPool,
              token0: {
                id: secondPool.token0.id,
                address: secondPool.token0.id,
                symbol: secondPool.token0.symbol,
                decimals: parseInt(secondPool.token0.decimals.toString()),
                name: secondPool.token0.name,
              },
              token1: {
                id: secondPool.token1.id,
                address: secondPool.token1.id,
                symbol: secondPool.token1.symbol,
                decimals: parseInt(secondPool.token1.decimals.toString()),
                name: secondPool.token1.name,
              },
            },
          ],
          intermediaryToken: intermediaryTokenDetails,
          totalFee: (parseInt(firstPool.feeTier) + parseInt(secondPool.feeTier)) / 1000000,
        });
      });
    });
  });

  // Sort routes by total liquidity (sum of both pools)
  return routes.sort(
    (a, b) =>
      parseFloat(b.path[0].totalValueLockedUSD) +
      parseFloat(b.path[1].totalValueLockedUSD) -
      (parseFloat(a.path[0].totalValueLockedUSD) + parseFloat(a.path[1].totalValueLockedUSD))
  );
}

/**
 * Get pool information from the contract
 * @param poolAddress The address of the pool
 * @param provider The ethers provider
 * @returns Pool information
 */
export async function getPoolInfo(poolAddress: string, provider: Provider) {
  const IUniswapV3PoolABI = [
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function fee() external view returns (uint24)',
    'function liquidity() external view returns (uint128)',
    'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  ];
  
  const ERC20_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
  ];

  const poolContract = new ethers.Contract(
    poolAddress,
    IUniswapV3PoolABI,
    provider
  );

  const [token0, token1, fee, liquidity, slot0] = await Promise.all([
    poolContract.token0(),
    poolContract.token1(),
    poolContract.fee(),
    poolContract.liquidity(),
    poolContract.slot0(),
  ]);

  const [reserve0, reserve1] = await Promise.all([
    new ethers.Contract(token0, ERC20_ABI, provider).balanceOf(poolAddress),
    new ethers.Contract(token1, ERC20_ABI, provider).balanceOf(poolAddress),
  ]);

  return {
    token0,
    token1,
    fee: Number(fee),
    liquidity,
    sqrtPriceX96: slot0[0],
    tick: slot0[1],
    reserve0,
    reserve1,
  };
}

/**
 * Get the best route for a swap
 * @param tokenInAddress The address of the input token
 * @param tokenOutAddress The address of the output token
 * @returns The best route for the swap
 */
export async function getBestRoute(tokenInAddress: string, tokenOutAddress: string): Promise<RouteInfo> {
  const routes = await findAllRoutes(tokenInAddress, tokenOutAddress);
  
  if (routes.routes.length === 0) {
    throw new Error('No route found');
  }
  
  // Return the route with the highest liquidity
  return routes.routes[0];
}
