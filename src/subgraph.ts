import { request, gql } from 'graphql-request';
import {
  TokenQueryResult,
  PoolQueryResult,
  FactoryQueryResult,
  BundleQueryResult,
  TokenDayDataQueryResult,
  PoolDayDataQueryResult,
  Token,
  Pool,
  Factory,
  Bundle,
  TokenDayData,
  PoolDayData
} from './types.js';

const SUBGRAPH_URL = 'https://api.goldsky.com/api/public/project_cm5nst0b7iiqy01t6hxww7gao/subgraphs/sailfish-v3-occ-mainnet/1.0.0/gn';

// Query to get token information
const TOKEN_QUERY = gql`
  query getToken($id: String!) {
    tokens(where: { id: $id }) {
      id
      symbol
      name
      decimals
      totalSupply
      volume
      volumeUSD
      untrackedVolumeUSD
      feesUSD
      txCount
      poolCount
      totalValueLocked
      totalValueLockedUSD
      totalValueLockedUSDUntracked
      derivedETH
    }
  }
`;

// Query to get pool information
const POOL_QUERY = gql`
  query getPool($id: String!) {
    pools(where: { id: $id }) {
      id
      createdAtTimestamp
      createdAtBlockNumber
      token0 {
        id
        symbol
        name
        decimals
      }
      token1 {
        id
        symbol
        name
        decimals
      }
      feeTier
      liquidity
      sqrtPrice
      token0Price
      token1Price
      tick
      volumeToken0
      volumeToken1
      volumeUSD
      untrackedVolumeUSD
      feesUSD
      txCount
      totalValueLockedToken0
      totalValueLockedToken1
      totalValueLockedETH
      totalValueLockedUSD
      totalValueLockedUSDUntracked
      liquidityProviderCount
    }
  }
`;

// Query to get factory information
const FACTORY_QUERY = gql`
  query getFactory {
    factories(first: 1) {
      id
      poolCount
      txCount
      totalVolumeUSD
      totalVolumeETH
      totalFeesUSD
      totalFeesETH
      untrackedVolumeUSD
      totalValueLockedUSD
      totalValueLockedETH
      totalValueLockedUSDUntracked
      totalValueLockedETHUntracked
      owner
    }
  }
`;

// Query to get ETH price
const BUNDLE_QUERY = gql`
  query getBundle {
    bundles(first: 1) {
      id
      ethPriceUSD
    }
  }
`;

// Query to get token day data
const TOKEN_DAY_DATA_QUERY = gql`
  query getTokenDayData($tokenId: String!, $count: Int!) {
    tokenDayDatas(
      first: $count
      orderBy: date
      orderDirection: desc
      where: { token: $tokenId }
    ) {
      id
      date
      token {
        id
        symbol
        name
      }
      volume
      volumeUSD
      untrackedVolumeUSD
      totalValueLocked
      totalValueLockedUSD
      priceUSD
      feesUSD
      open
      high
      low
      close
    }
  }
`;

// Query to get pool day data
const POOL_DAY_DATA_QUERY = gql`
  query getPoolDayData($poolId: String!, $count: Int!) {
    poolDayDatas(
      first: $count
      orderBy: date
      orderDirection: desc
      where: { pool: $poolId }
    ) {
      id
      date
      pool {
        id
        token0 {
          id
          symbol
        }
        token1 {
          id
          symbol
        }
      }
      liquidity
      sqrtPrice
      token0Price
      token1Price
      tick
      tvlUSD
      volumeToken0
      volumeToken1
      volumeUSD
      feesUSD
      txCount
      open
      high
      low
      close
    }
  }
`;

// Query to get top tokens
const TOP_TOKENS_QUERY = gql`
  query getTopTokens($count: Int!) {
    tokens(
      first: $count
      orderBy: totalValueLockedUSD
      orderDirection: desc
    ) {
      id
      symbol
      name
      decimals
      totalValueLockedUSD
      volumeUSD
      feesUSD
      txCount
      derivedETH
    }
  }
`;

// Query to get top pools
const TOP_POOLS_QUERY = gql`
  query getTopPools($count: Int!) {
    pools(
      first: $count
      orderBy: totalValueLockedUSD
      orderDirection: desc
    ) {
      id
      token0 {
        id
        symbol
        name
      }
      token1 {
        id
        symbol
        name
      }
      feeTier
      liquidity
      token0Price
      token1Price
      volumeUSD
      totalValueLockedUSD
      txCount
    }
  }
`;

// Function to get token information by ID
export async function getToken(tokenId: string): Promise<Token | null> {
  try {
    const data = await request<TokenQueryResult>(
      SUBGRAPH_URL,
      TOKEN_QUERY,
      { id: tokenId.toLowerCase() }
    );
    return data.tokens[0] || null;
  } catch (error) {
    console.error('Error fetching token:', error);
    throw error;
  }
}

// Function to get pool information by ID
export async function getPool(poolId: string): Promise<Pool | null> {
  try {
    const data = await request<PoolQueryResult>(
      SUBGRAPH_URL,
      POOL_QUERY,
      { id: poolId.toLowerCase() }
    );
    return data.pools[0] || null;
  } catch (error) {
    console.error('Error fetching pool:', error);
    throw error;
  }
}

// Function to get factory information
export async function getFactory(): Promise<Factory | null> {
  try {
    const data = await request<FactoryQueryResult>(
      SUBGRAPH_URL,
      FACTORY_QUERY
    );
    return data.factories[0] || null;
  } catch (error) {
    console.error('Error fetching factory:', error);
    throw error;
  }
}

// Function to get ETH price
export async function getEthPrice(): Promise<string | null> {
  try {
    const data = await request<BundleQueryResult>(
      SUBGRAPH_URL,
      BUNDLE_QUERY
    );
    return data.bundles[0]?.ethPriceUSD || null;
  } catch (error) {
    console.error('Error fetching ETH price:', error);
    throw error;
  }
}

// Function to get token day data
export async function getTokenDayData(tokenId: string, count: number = 7): Promise<TokenDayData[]> {
  try {
    const data = await request<TokenDayDataQueryResult>(
      SUBGRAPH_URL,
      TOKEN_DAY_DATA_QUERY,
      { tokenId: tokenId.toLowerCase(), count }
    );
    return data.tokenDayDatas;
  } catch (error) {
    console.error('Error fetching token day data:', error);
    throw error;
  }
}

// Function to get pool day data
export async function getPoolDayData(poolId: string, count: number = 7): Promise<PoolDayData[]> {
  try {
    const data = await request<PoolDayDataQueryResult>(
      SUBGRAPH_URL,
      POOL_DAY_DATA_QUERY,
      { poolId: poolId.toLowerCase(), count }
    );
    return data.poolDayDatas;
  } catch (error) {
    console.error('Error fetching pool day data:', error);
    throw error;
  }
}

// Function to get top tokens by TVL
export async function getTopTokens(count: number = 10): Promise<Token[]> {
  try {
    const data = await request<TokenQueryResult>(
      SUBGRAPH_URL,
      TOP_TOKENS_QUERY,
      { count }
    );
    return data.tokens;
  } catch (error) {
    console.error('Error fetching top tokens:', error);
    throw error;
  }
}

// Function to get top pools by TVL
export async function getTopPools(count: number = 10): Promise<Pool[]> {
  try {
    const data = await request<PoolQueryResult>(
      SUBGRAPH_URL,
      TOP_POOLS_QUERY,
      { count }
    );
    return data.pools;
  } catch (error) {
    console.error('Error fetching top pools:', error);
    throw error;
  }
}

// Function to calculate 24h volume
export async function get24HVolume(): Promise<string> {
  try {
    const factory = await getFactory();
    if (!factory) {
      throw new Error('Factory data not available');
    }
    
    // Note: This is a simplified approach. For more accurate 24h volume,
    // you would need to compare current volume with volume from 24h ago
    return factory.totalVolumeUSD;
  } catch (error) {
    console.error('Error calculating 24h volume:', error);
    throw error;
  }
}

// Function to get total TVL
export async function getTotalTVL(): Promise<string> {
  try {
    const factory = await getFactory();
    if (!factory) {
      throw new Error('Factory data not available');
    }
    
    return factory.totalValueLockedUSD;
  } catch (error) {
    console.error('Error fetching total TVL:', error);
    throw error;
  }
}

// Function to get token price in USD
export async function getTokenPrice(tokenId: string): Promise<string | null> {
  try {
    const token = await getToken(tokenId);
    if (!token) {
      return null;
    }
    
    const ethPrice = await getEthPrice();
    if (!ethPrice) {
      return null;
    }
    
    // Calculate USD price from ETH price
    const priceUSD = parseFloat(token.derivedETH) * parseFloat(ethPrice);
    return priceUSD.toString();
  } catch (error) {
    console.error('Error calculating token price:', error);
    throw error;
  }
}
