const { default: axios } = require("axios");
const bridgeAPI = "https://sw-api.terablock.com/bridge";
const swapAPI = "https://sw-api.terablock.com/quote";

const getSwappedPrice = async (fromCoin, toCoin, networkId, amountfrom) => {
    let amount = Number(amountfrom * 10 ** fromCoin?.decimals);
    const params = {
        sellToken: fromCoin?.address,
        buyToken: toCoin?.address,
        sellAmount: amount.toLocaleString("en", { useGrouping: false }),
        chainId: networkId,
    };
    try {
        const { data } = await axios.get(swapAPI, { params: params });
        return Number(data?.message?.quote / Math.pow(10, toCoin?.decimals))
    } catch (err) {
        throw err;
    }
};

const getBridgingPrice = async (fromCoin, toCoin, amountFrom, fromChainId, destChainId, address) => {
    try{
        const url = `${bridgeAPI}?chainIdFrom=${fromChainId}&chainIdTo=${destChainId}&amountFrom=${ParseEthUtil(amountFrom, fromCoin?.decimals[selectedNetwork?.id]).toLocaleString("en", { useGrouping: false })}&addressTo=${address}`;

        const {data} = await axios.get(url);

        return Number(data?.message?.quote / Math.pow(10, toCoin?.decimals));
    }catch(err){
        throw err;
    }
}

module.exports = {getSwappedPrice, getBridgingPrice, swapAPI, bridgeAPI}