import { ethers } from 'ethers';
import * as subgraph from './subgraph.js';

// Default RPC URL and chain ID
let rpcUrl = 'https://rpc.edu-chain.raas.gelato.cloud';
const EDUCHAIN_CHAIN_ID = 41923;

// ERC20 ABI for token balance and metadata queries
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function transfer(address to, uint256 value) returns (bool)'
];

// ERC721 ABI for NFT balance queries
const ERC721_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function name() view returns (string)',
  'function symbol() view returns (string)'
];

// ERC1155 ABI for NFT balance queries
const ERC1155_ABI = [
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])',
  'function uri(uint256 id) view returns (string)'
];

// Helper function to safely convert BigInt to string
function bigIntToString(value: any): string {
  if (typeof value === 'bigint') {
    return value.toString();
  } else if (typeof value === 'object' && value !== null && typeof value.toString === 'function') {
    return value.toString();
  }
  return String(value);
}

// Get provider instance
export function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(rpcUrl, EDUCHAIN_CHAIN_ID);
}

// Set RPC URL
export function setRpcUrl(url: string): void {
  rpcUrl = url;
}

// Get current RPC URL
export function getRpcUrl(): string {
  return rpcUrl;
}

// Get wallet address from private key
export function getWalletAddressFromPrivateKey(privateKey: string): string {
  try {
    const wallet = new ethers.Wallet(privateKey);
    return ethers.getAddress(wallet.address); // Format to checksum address
  } catch (error) {
    console.error('Error getting wallet address from private key:', error);
    throw error;
  }
}

// Get EDU balance
export async function getEduBalance(address: string): Promise<{ balance: string, balanceInEdu: string }> {
  try {
    const provider = getProvider();
    const balance = await provider.getBalance(address);
    const balanceInEdu = ethers.formatEther(balance);
    
    return {
      balance: bigIntToString(balance),
      balanceInEdu
    };
  } catch (error) {
    console.error('Error fetching EDU balance:', error);
    throw error;
  }
}

// Get token balance
export async function getTokenBalance(
  tokenAddress: string, 
  walletAddress: string
): Promise<{ 
  balance: string, 
  decimals: number, 
  symbol: string, 
  name: string, 
  formattedBalance: string,
  usdValue?: string
}> {
  try {
    const provider = getProvider();
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    
    // Get token details
    const [balance, decimals, symbol, name] = await Promise.all([
      tokenContract.balanceOf(walletAddress),
      tokenContract.decimals(),
      tokenContract.symbol(),
      tokenContract.name()
    ]);
    
    // Convert BigInt to string and number
    const balanceStr = bigIntToString(balance);
    const decimalsNum = Number(decimals);
    
    const formattedBalance = ethers.formatUnits(balance, decimalsNum);
    
    // Try to get USD value from SailFish
    let usdValue: string | undefined;
    try {
      const tokenPrice = await subgraph.getTokenPrice(tokenAddress);
      if (tokenPrice) {
        const valueInUsd = parseFloat(formattedBalance) * parseFloat(tokenPrice);
        usdValue = valueInUsd.toString();
      }
    } catch (error) {
      console.error('Error fetching token price:', error);
      // Continue without USD value
    }
    
    return {
      balance: balanceStr,
      decimals: decimalsNum,
      symbol: String(symbol),
      name: String(name),
      formattedBalance,
      usdValue
    };
  } catch (error) {
    console.error('Error fetching token balance:', error);
    throw error;
  }
}

// Get multiple token balances
export async function getMultipleTokenBalances(
  tokenAddresses: string[], 
  walletAddress: string
): Promise<Array<{ 
  tokenAddress: string,
  balance: string, 
  decimals: number, 
  symbol: string, 
  name: string, 
  formattedBalance: string,
  usdValue?: string
}>> {
  try {
    const results = await Promise.all(
      tokenAddresses.map(async (tokenAddress) => {
        try {
          const tokenBalance = await getTokenBalance(tokenAddress, walletAddress);
          return {
            tokenAddress,
            ...tokenBalance
          };
        } catch (error) {
          console.error(`Error fetching balance for token ${tokenAddress}:`, error);
          return {
            tokenAddress,
            balance: '0',
            decimals: 18,
            symbol: 'UNKNOWN',
            name: 'Unknown Token',
            formattedBalance: '0'
          };
        }
      })
    );
    
    return results;
  } catch (error) {
    console.error('Error fetching multiple token balances:', error);
    throw error;
  }
}

// Get ERC721 NFT balance
export async function getERC721Balance(
  nftAddress: string, 
  walletAddress: string,
  fetchTokenIds: boolean = true
): Promise<{
  contractAddress: string,
  name: string,
  symbol: string,
  balance: string,
  tokenIds?: string[]
}> {
  try {
    const provider = getProvider();
    const nftContract = new ethers.Contract(nftAddress, ERC721_ABI, provider);
    
    // Get NFT details
    const [balance, name, symbol] = await Promise.all([
      nftContract.balanceOf(walletAddress),
      nftContract.name(),
      nftContract.symbol()
    ]);
    
    const balanceNumber = Number(balance);
    
    // Get token IDs if requested and balance > 0
    let tokenIds: string[] | undefined;
    if (fetchTokenIds && balanceNumber > 0) {
      tokenIds = [];
      for (let i = 0; i < balanceNumber; i++) {
        try {
          const tokenId = await nftContract.tokenOfOwnerByIndex(walletAddress, i);
          tokenIds.push(bigIntToString(tokenId));
        } catch (error) {
          console.error(`Error fetching token ID at index ${i}:`, error);
          // Continue with next token ID
        }
      }
    }
    
    return {
      contractAddress: nftAddress,
      name: String(name),
      symbol: String(symbol),
      balance: bigIntToString(balance),
      tokenIds
    };
  } catch (error) {
    console.error('Error fetching ERC721 balance:', error);
    throw error;
  }
}

// Get ERC1155 NFT balance for a specific token ID
export async function getERC1155Balance(
  nftAddress: string, 
  walletAddress: string,
  tokenId: string
): Promise<{
  contractAddress: string,
  tokenId: string,
  balance: string,
  uri?: string
}> {
  try {
    const provider = getProvider();
    const nftContract = new ethers.Contract(nftAddress, ERC1155_ABI, provider);
    
    // Get NFT details
    const balance = await nftContract.balanceOf(walletAddress, tokenId);
    
    let uri: string | undefined;
    try {
      uri = await nftContract.uri(tokenId);
    } catch (error) {
      console.error(`Error fetching URI for token ID ${tokenId}:`, error);
      // Continue without URI
    }
    
    return {
      contractAddress: nftAddress,
      tokenId,
      balance: bigIntToString(balance),
      uri
    };
  } catch (error) {
    console.error('Error fetching ERC1155 balance:', error);
    throw error;
  }
}

// Send EDU native token to another address
export async function sendEdu(
  privateKey: string,
  toAddress: string,
  amount: string
): Promise<{
  hash: string,
  from: string,
  to: string,
  amount: string
}> {
  try {
    const provider = getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Convert amount to wei
    const amountWei = ethers.parseEther(amount);
    
    // Create and send transaction
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: amountWei
    });
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    if (!receipt) {
      throw new Error('Transaction failed');
    }
    
    return {
      hash: tx.hash,
      from: wallet.address,
      to: toAddress,
      amount
    };
  } catch (error) {
    console.error('Error sending EDU:', error);
    throw error;
  }
}

// Send ERC20 token to another address
export async function sendErc20Token(
  privateKey: string,
  tokenAddress: string,
  toAddress: string,
  amount: string
): Promise<{
  hash: string,
  from: string,
  to: string,
  tokenAddress: string,
  amount: string
}> {
  try {
    const provider = getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Create contract instance
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    
    // Get token decimals
    const decimals = await tokenContract.decimals();
    
    // Convert amount to token units
    const amountInTokenUnits = ethers.parseUnits(amount, decimals);
    
    // Send tokens
    const tx = await tokenContract.transfer(toAddress, amountInTokenUnits);
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    if (!receipt) {
      throw new Error('Transaction failed');
    }
    
    return {
      hash: tx.hash,
      from: wallet.address,
      to: toAddress,
      tokenAddress,
      amount
    };
  } catch (error) {
    console.error('Error sending ERC20 token:', error);
    throw error;
  }
}

// Get wallet overview with EDU, tokens, and NFTs
export async function getWalletOverview(
  walletAddress: string,
  tokenAddresses: string[] = [],
  nftAddresses: string[] = []
): Promise<{
  address: string,
  eduBalance: { balance: string, balanceInEdu: string },
  tokens: Array<{ 
    tokenAddress: string,
    balance: string, 
    decimals: number, 
    symbol: string, 
    name: string, 
    formattedBalance: string,
    usdValue?: string
  }>,
  nfts: Array<{
    contractAddress: string,
    name?: string,
    symbol?: string,
    balance: string,
    tokenIds?: string[]
  }>
}> {
  try {
    // Get EDU balance
    const eduBalance = await getEduBalance(walletAddress);
    
    // Get token balances
    const tokens = await getMultipleTokenBalances(tokenAddresses, walletAddress);
    
    // Get NFT balances
    const nfts = await Promise.all(
      nftAddresses.map(async (nftAddress) => {
        try {
          return await getERC721Balance(nftAddress, walletAddress);
        } catch (error) {
          console.error(`Error fetching NFT balance for ${nftAddress}:`, error);
          return {
            contractAddress: nftAddress,
            balance: '0'
          };
        }
      })
    );
    
    return {
      address: walletAddress,
      eduBalance,
      tokens,
      nfts
    };
  } catch (error) {
    console.error('Error fetching wallet overview:', error);
    throw error;
  }
}
