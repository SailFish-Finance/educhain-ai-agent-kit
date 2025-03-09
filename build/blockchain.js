var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
function bigIntToString(value) {
    if (typeof value === 'bigint') {
        return value.toString();
    }
    else if (typeof value === 'object' && value !== null && typeof value.toString === 'function') {
        return value.toString();
    }
    return String(value);
}
// Get provider instance
export function getProvider() {
    return new ethers.JsonRpcProvider(rpcUrl, EDUCHAIN_CHAIN_ID);
}
// Set RPC URL
export function setRpcUrl(url) {
    rpcUrl = url;
}
// Get current RPC URL
export function getRpcUrl() {
    return rpcUrl;
}
// Get wallet address from private key
export function getWalletAddressFromPrivateKey(privateKey) {
    try {
        const wallet = new ethers.Wallet(privateKey);
        return ethers.getAddress(wallet.address); // Format to checksum address
    }
    catch (error) {
        console.error('Error getting wallet address from private key:', error);
        throw error;
    }
}
// Get EDU balance
export function getEduBalance(address) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const provider = getProvider();
            const balance = yield provider.getBalance(address);
            const balanceInEdu = ethers.formatEther(balance);
            return {
                balance: bigIntToString(balance),
                balanceInEdu
            };
        }
        catch (error) {
            console.error('Error fetching EDU balance:', error);
            throw error;
        }
    });
}
// Get token balance
export function getTokenBalance(tokenAddress, walletAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const provider = getProvider();
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
            // Get token details
            const [balance, decimals, symbol, name] = yield Promise.all([
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
            let usdValue;
            try {
                const tokenPrice = yield subgraph.getTokenPrice(tokenAddress);
                if (tokenPrice) {
                    const valueInUsd = parseFloat(formattedBalance) * parseFloat(tokenPrice);
                    usdValue = valueInUsd.toString();
                }
            }
            catch (error) {
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
        }
        catch (error) {
            console.error('Error fetching token balance:', error);
            throw error;
        }
    });
}
// Get multiple token balances
export function getMultipleTokenBalances(tokenAddresses, walletAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const results = yield Promise.all(tokenAddresses.map((tokenAddress) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const tokenBalance = yield getTokenBalance(tokenAddress, walletAddress);
                    return Object.assign({ tokenAddress }, tokenBalance);
                }
                catch (error) {
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
            })));
            return results;
        }
        catch (error) {
            console.error('Error fetching multiple token balances:', error);
            throw error;
        }
    });
}
// Get ERC721 NFT balance
export function getERC721Balance(nftAddress_1, walletAddress_1) {
    return __awaiter(this, arguments, void 0, function* (nftAddress, walletAddress, fetchTokenIds = true) {
        try {
            const provider = getProvider();
            const nftContract = new ethers.Contract(nftAddress, ERC721_ABI, provider);
            // Get NFT details
            const [balance, name, symbol] = yield Promise.all([
                nftContract.balanceOf(walletAddress),
                nftContract.name(),
                nftContract.symbol()
            ]);
            const balanceNumber = Number(balance);
            // Get token IDs if requested and balance > 0
            let tokenIds;
            if (fetchTokenIds && balanceNumber > 0) {
                tokenIds = [];
                for (let i = 0; i < balanceNumber; i++) {
                    try {
                        const tokenId = yield nftContract.tokenOfOwnerByIndex(walletAddress, i);
                        tokenIds.push(bigIntToString(tokenId));
                    }
                    catch (error) {
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
        }
        catch (error) {
            console.error('Error fetching ERC721 balance:', error);
            throw error;
        }
    });
}
// Get ERC1155 NFT balance for a specific token ID
export function getERC1155Balance(nftAddress, walletAddress, tokenId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const provider = getProvider();
            const nftContract = new ethers.Contract(nftAddress, ERC1155_ABI, provider);
            // Get NFT details
            const balance = yield nftContract.balanceOf(walletAddress, tokenId);
            let uri;
            try {
                uri = yield nftContract.uri(tokenId);
            }
            catch (error) {
                console.error(`Error fetching URI for token ID ${tokenId}:`, error);
                // Continue without URI
            }
            return {
                contractAddress: nftAddress,
                tokenId,
                balance: bigIntToString(balance),
                uri
            };
        }
        catch (error) {
            console.error('Error fetching ERC1155 balance:', error);
            throw error;
        }
    });
}
// Send EDU native token to another address
export function sendEdu(privateKey, toAddress, amount) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const provider = getProvider();
            const wallet = new ethers.Wallet(privateKey, provider);
            // Convert amount to wei
            const amountWei = ethers.parseEther(amount);
            // Create and send transaction
            const tx = yield wallet.sendTransaction({
                to: toAddress,
                value: amountWei
            });
            // Wait for transaction to be mined
            const receipt = yield tx.wait();
            if (!receipt) {
                throw new Error('Transaction failed');
            }
            return {
                hash: tx.hash,
                from: wallet.address,
                to: toAddress,
                amount
            };
        }
        catch (error) {
            console.error('Error sending EDU:', error);
            throw error;
        }
    });
}
// Send ERC20 token to another address
export function sendErc20Token(privateKey, tokenAddress, toAddress, amount) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const provider = getProvider();
            const wallet = new ethers.Wallet(privateKey, provider);
            // Create contract instance
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
            // Get token decimals
            const decimals = yield tokenContract.decimals();
            // Convert amount to token units
            const amountInTokenUnits = ethers.parseUnits(amount, decimals);
            // Send tokens
            const tx = yield tokenContract.transfer(toAddress, amountInTokenUnits);
            // Wait for transaction to be mined
            const receipt = yield tx.wait();
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
        }
        catch (error) {
            console.error('Error sending ERC20 token:', error);
            throw error;
        }
    });
}
// Get wallet overview with EDU, tokens, and NFTs
export function getWalletOverview(walletAddress_1) {
    return __awaiter(this, arguments, void 0, function* (walletAddress, tokenAddresses = [], nftAddresses = []) {
        try {
            // Get EDU balance
            const eduBalance = yield getEduBalance(walletAddress);
            // Get token balances
            const tokens = yield getMultipleTokenBalances(tokenAddresses, walletAddress);
            // Get NFT balances
            const nfts = yield Promise.all(nftAddresses.map((nftAddress) => __awaiter(this, void 0, void 0, function* () {
                try {
                    return yield getERC721Balance(nftAddress, walletAddress);
                }
                catch (error) {
                    console.error(`Error fetching NFT balance for ${nftAddress}:`, error);
                    return {
                        contractAddress: nftAddress,
                        balance: '0'
                    };
                }
            })));
            return {
                address: walletAddress,
                eduBalance,
                tokens,
                nfts
            };
        }
        catch (error) {
            console.error('Error fetching wallet overview:', error);
            throw error;
        }
    });
}
//# sourceMappingURL=blockchain.js.map