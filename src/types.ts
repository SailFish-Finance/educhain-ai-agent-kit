// Type definitions for SailFish subgraph data

export interface Token {
  id: string;
  symbol: string;
  name: string;
  decimals: string;
  totalSupply: string;
  volume: string;
  volumeUSD: string;
  untrackedVolumeUSD: string;
  feesUSD: string;
  txCount: string;
  poolCount: string;
  totalValueLocked: string;
  totalValueLockedUSD: string;
  totalValueLockedUSDUntracked: string;
  derivedETH: string;
}

export interface Pool {
  id: string;
  createdAtTimestamp: string;
  createdAtBlockNumber: string;
  token0: Token;
  token1: Token;
  feeTier: string;
  liquidity: string;
  sqrtPrice: string;
  feeGrowthGlobal0X128: string;
  feeGrowthGlobal1X128: string;
  token0Price: string;
  token1Price: string;
  tick: string;
  observationIndex: string;
  volumeToken0: string;
  volumeToken1: string;
  volumeUSD: string;
  untrackedVolumeUSD: string;
  feesUSD: string;
  txCount: string;
  collectedFeesToken0: string;
  collectedFeesToken1: string;
  collectedFeesUSD: string;
  totalValueLockedToken0: string;
  totalValueLockedToken1: string;
  totalValueLockedETH: string;
  totalValueLockedUSD: string;
  totalValueLockedUSDUntracked: string;
  liquidityProviderCount: string;
}

export interface Factory {
  id: string;
  poolCount: string;
  txCount: string;
  totalVolumeUSD: string;
  totalVolumeETH: string;
  totalFeesUSD: string;
  totalFeesETH: string;
  untrackedVolumeUSD: string;
  totalValueLockedUSD: string;
  totalValueLockedETH: string;
  totalValueLockedUSDUntracked: string;
  totalValueLockedETHUntracked: string;
  owner: string;
}

export interface Bundle {
  id: string;
  ethPriceUSD: string;
}

export interface TokenDayData {
  id: string;
  date: number;
  token: Token;
  volume: string;
  volumeUSD: string;
  untrackedVolumeUSD: string;
  totalValueLocked: string;
  totalValueLockedUSD: string;
  priceUSD: string;
  feesUSD: string;
  open: string;
  high: string;
  low: string;
  close: string;
}

export interface PoolDayData {
  id: string;
  date: number;
  pool: Pool;
  liquidity: string;
  sqrtPrice: string;
  token0Price: string;
  token1Price: string;
  tick: string;
  feeGrowthGlobal0X128: string;
  feeGrowthGlobal1X128: string;
  tvlUSD: string;
  volumeToken0: string;
  volumeToken1: string;
  volumeUSD: string;
  feesUSD: string;
  txCount: string;
  open: string;
  high: string;
  low: string;
  close: string;
}

export interface TokenQueryResult {
  tokens: Token[];
}

export interface PoolQueryResult {
  pools: Pool[];
}

export interface FactoryQueryResult {
  factories: Factory[];
}

export interface BundleQueryResult {
  bundles: Bundle[];
}

export interface TokenDayDataQueryResult {
  tokenDayDatas: TokenDayData[];
}

export interface PoolDayDataQueryResult {
  poolDayDatas: PoolDayData[];
}
