const { default: axios } = require("axios");
const { Interface } = require("ethers/lib/utils");
const TokenList = require('./tokens_list.json');
const swapABI = require('./abis/uniswapAbi.json');
const { getSwappedPrice, getBridgingPrice, swapAPI, bridgeAPI } = require("./helper");


const swapTxnData = async (fromCoin, toCoin, networkId, fromTokenAmount, address) => {
    try{
        const uniswapInterface = new Interface(swapABI);
        let txData = await axios.get(
            swapAPI +
            "?buyToken=" +
            toCoin?.address +
            "&sellToken=" +
            fromCoin?.address +
            "&sellAmount=" +
            ParseEthUtil(fromAmt, fromCoin?.decimals).toLocaleString("en", { useGrouping: false }) +
            "&chainId=" +
            networkId
        );
        txData = txData?.data;

        if (txData) {
            let finalTxData = uniswapInterface?.encodeFunctionData("swap", [txData.message.calldata, address]);
            let tx = {
                to: address,
                data: finalTxData,
                gasLimit: 700000,
                gasPrice: null, // to be filled by user
                value: fromCoin.address.toLowerCase() == "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ? fromTokenAmount * 10 ** 18 + "" : "0",
            };
            return tx;
        }
    }catch(err){
       throw err;
    }
};



const bridgeTxnData = async (fromNetworkId, destNetworkId, receiverAddress, fromTokenAmount) => {
    try{
      const fromusdc = TokenList?.filter((el) => el?.symbol == "USDC" && el?.chainId == fromNetworkId)[0];

      const res = await axios.get(`${bridgeAPI}?chainIdFrom=${fromNetworkId}&chainIdTo=${destNetworkId}&amountFrom=${ParseEthUtil(amount, fromusdc?.decimals).toLocaleString("en", { useGrouping: false })}&addressTo=${receiverAddress}`);
      
      const txData = res.data?.message?.rawTx?.data;
      if (txData){
        let tx = {
          to: res?.data?.message?.rawTx?.to,
          data: txData,
          gasLimit: parseInt(res?.data?.message?.rawTx?.gasLimit?.hex),
          gasPrice: null, // to be filled by the user
          value: fromusdc?.address.toLowerCase() == "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ? fromTokenAmount * 10 ** 18 + "" : "0",
        };
        return tx;
      }
    }catch(err){
      throw err;
    }
}


const autoDetectTxnData = async (fromToken, destToken, fromNetworkId, destNetworkId, fromTokenAmount, receiverAddress) => {
    if (fromNetworkId == destNetworkId && fromToken?.symbol != toToken?.symbol){
        let swapTxn = await swapTxnData(fromToken, destToken, fromNetworkId, fromTokenAmount, receiverAddress);
        let txn = {
            swap1: swapTxn,
        }
        return txn;
    }else if (fromNetworkId != destNetworkId && fromToken?.symbol == destToken?.symbol && fromToken?.symbo == "USDC"){
        let bridgeTxn = await bridgeTxnData(fromNetworkId, destNetworkId, receiverAddress, fromTokenAmount);
        let txn = {
            bridge: bridgeTxn,
        }
        return txn;
    }else if (fromNetworkId != destNetworkId && fromToken?.symbol != destToken?.symbol) {
        let fromUsdc = TokenList.filter((el) => el?.symbol == "USDC" && el?.chainId == fromNetworkId)[0];
        let toUusdc = TokenList.filter((el) => el.symbol == "USDC" && el.chainId == destNetworkId)[0];

        if (fromToken?.symbol == "USDC") {
            let bridgeTxn = await bridgeTxnData(fromNetworkId, destNetworkId, receiverAddress, fromTokenAmount);
            
            let afterBridgeAmount = await getBridgingPrice(fromUsdc, toUusdc, fromTokenAmount, fromNetworkId, destNetworkId, receiverAddress);

            let swapTxn1 = await swapTxnData(toUusdc, destToken, destNetworkId, afterBridgeAmount, receiverAddress);
            let txn = {
                bridge: bridgeTxn,
                swap1: swapTxn1,
            }
            return txn;
        }else if (destToken?.symbol == "USDC"){
            let swapTxn1 = await swapTxnData(fromToken, fromUsdc, fromNetworkId, fromTokenAmount, receiverAddress);

            let afterSwapAmount = await getSwappedPrice(fromToken, fromUsdc, fromNetworkId, fromTokenAmount);
            afterSwapAmount = afterSwapAmount * 0.98;
            if (afterSwapAmount != Math.floor(afterSwapAmount)){
                afterSwapAmount = Math.floor(afterSwapAmount);
            }

            let bridgeTxn = await bridgeTxnData(fromNetworkId, destNetworkId, receiverAddress, afterSwapAmount);
            let txn = {
                swap1: swapTxn1,
                bridge: bridgeTxn
            }
            return txn;
        }else {
            let swapTxn1 = await swapTxnData(fromToken, fromUsdc, fromNetworkId, fromTokenAmount, receiverAddress);

            let afterSwapAmount = await getSwappedPrice(fromToken, fromUsdc, fromNetworkId, fromTokenAmount);
            afterSwapAmount = afterSwapAmount * 0.98;
            if (afterSwapAmount != Math.floor(afterSwapAmount)){
                afterSwapAmount = Math.floor(afterSwapAmount);
            }

            let bridgeTxn = await bridgeTxnData(fromNetworkId, destNetworkId, receiverAddress, afterSwapAmount);
            
            let toUusdc = TokenList.filter((el) => el.symbol == "USDC" && el.chainId == destNetworkId);
            let afterBridgeAmount = await getBridgingPrice(fromUsdc, toUusdc, afterSwapAmount, fromNetworkId, destNetworkId, receiverAddress);

            let swapTxn2 = await swapTxnData(toUusdc, destToken, destNetworkId, afterBridgeAmount, receiverAddress);
            let txn = {
                swap1: swapTxn1,
                bridge: bridgeTxn,
                swap2: swapTxn2,
            }
            return txn;
        }
    }
}

module.exports = {bridgeTxnData, swapTxnData, autoDetectTxnData}