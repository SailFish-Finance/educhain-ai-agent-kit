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
import * as routes from './routes.js';
import * as swap from './swap.js';
// SailFish V3 contract addresses
const CONTRACTS = {
    WETH9: '0xd02E8c38a8E3db71f8b2ae30B8186d7874934e12', // Wrapped EDU (WEDU) address - Used for swaps involving EDU
    USDC: '0x836d275563bAb5E93Fd6Ca62a95dB7065Da94342', // USDC token address
};
// Note: In the context of swaps and quotes, EDU is represented by its wrapped version (WEDU)
// When executing actual swaps, the system handles the wrapping/unwrapping automatically
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("SailFish DEX Swap Test");
            console.log("======================");
            // Test 1: Find the best route for EDU/USDC
            console.log("\n1. Finding best route for EDU/USDC...");
            console.log("Note: EDU is represented by WEDU (Wrapped EDU) in swap operations");
            const bestRoute = yield routes.getBestRoute(CONTRACTS.WETH9, CONTRACTS.USDC);
            console.log(`Route type: ${bestRoute.type}`);
            console.log(`Total fee: ${bestRoute.totalFee * 100}%`);
            console.log(`Path: ${bestRoute.path.map(p => `${p.token0.symbol}/${p.token1.symbol}`).join(' -> ')}`);
            // Test 2: Get quote for swapping 10 EDU to USDC
            console.log("\n2. Getting quote for 10 EDU to USDC...");
            console.log("Note: Token contracts are automatically fetched from the subgraph when needed");
            const quote = yield swap.getSwapQuote(CONTRACTS.WETH9, CONTRACTS.USDC, "10", 0.5);
            console.log(`Input: 10 ${quote.tokenInSymbol}`);
            console.log(`Expected output: ${quote.formattedAmountOut} ${quote.tokenOutSymbol}`);
            console.log(`Minimum output (with 0.5% slippage): ${quote.formattedMinimumAmountOut} ${quote.tokenOutSymbol}`);
            console.log(`Price impact: ${quote.priceImpact.toFixed(2)}%`);
            console.log(`Exchange rate: 1 ${quote.tokenInSymbol} = ${Number(quote.formattedAmountOut) / 10} ${quote.tokenOutSymbol}`);
            // Test 3: Simulate a swap (without executing it)
            console.log("\n3. To execute an actual swap, you would use:");
            console.log(`
    // For token to token swap:
    swap.swapExactTokensForTokens(
      "YOUR_PRIVATE_KEY",
      "${CONTRACTS.WETH9}",
      "${CONTRACTS.USDC}",
      "10",
      0.5
    );
    
    // For EDU to token swap:
    swap.swapExactEDUForTokens(
      "YOUR_PRIVATE_KEY",
      "${CONTRACTS.USDC}",
      "10",
      0.5
    );
    
    // For token to EDU swap:
    swap.swapExactTokensForEDU(
      "YOUR_PRIVATE_KEY",
      "${CONTRACTS.USDC}",
      "10",
      0.5
    );
    `);
            console.log("\nTests completed successfully!");
        }
        catch (error) {
            console.error("Error running tests:", error);
        }
    });
}
main().catch(console.error);
//# sourceMappingURL=test.js.map