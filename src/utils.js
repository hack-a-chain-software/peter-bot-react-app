// Here we have our functions 
// They will be used at App.js - almost like an API

import { connect, keyStores, WalletConnection, utils, Contract, transactions, providers } from 'near-api-js';
window.Buffer = window.Buffer || require("buffer").Buffer;

const keyStore = new keyStores.BrowserLocalStorageKeyStore();

const nearConfig = {
  networkId: "testnet",
  keyStore,
  nodeUrl: "https://rpc.testnet.near.org",
  walletUrl: "https://wallet.testnet.near.org",
  helperUrl: "https://helper.testnet.near.org",
  explorerUrl: "https://explorer.testnet.near.org",
  contractName: "jack_daniel.testnet"
};

// Initialize contract & set global variables
export async function initNear() {
  // Initialize connection to the NEAR testnet
  const near = await connect(nearConfig);

  // Initializing Wallet based Account. It can work with NEAR testnet wallet that
  // is hosted at https://wallet.testnet.near.org
  window.walletConnection = new WalletConnection(near, "Peter the wiring bot");


  window.accountId = window.walletConnection.getAccountId()

  if (window.accountId === "" || window.accountId === undefined) {
    window.walletConnection.requestSignIn();
  }

  // Getting the Account ID. If still unauthorized, it's just empty string
  window.accountId = window.walletConnection.getAccountId()

  // Initializing our contract APIs by contract name and configuration

  window.contract = new Contract(window.walletConnection.account(), nearConfig.contractName, {
    // View methods are read only. They don't modify the state, but usually return some value.
    viewMethods: [],
    // Change methods can modify the state. But you don't receive the returned value when called.
    changeMethods: ['transfer_payment'],
  })
}

// window eh a var global do browser 
export async function sendMoneyCall(receiver, amount) {

  amount = utils.format.parseNearAmount(amount);

  //const receipt = await window.walletConnection.account().sendMoney(receiver, amount);
  const receipt = await window.contract.transfer_payment({
    args: { receiver: receiver },
    amount: amount
  });

  window.receipt = receipt;
}

export async function initializeTokenContract(address, receiver, amount) {

  const account = window.walletConnection.account()
  let transactionsArray = [];

  const provider = new providers.JsonRpcProvider("https://rpc.testnet.near.org");

  //check decimals of the contract, if ft_metadata not implemented, assume 24 (near standard)
  let decimals;
  try{
    const rawTokenSpecs = await provider.query({
      request_type: "call_function",
      account_id: address,
      method_name: "ft_metadata",
      args_base64: Buffer.from(JSON.stringify({})).toString('base64'),
      finality: "optimistic",
    });
    const tokenSpecs = JSON.parse(Buffer.from(rawTokenSpecs.result).toString());
    decimals = tokenSpecs.decimals;
  } catch (err) {
    console.log(err);
    decimals = 24;
  }
    
  //treat amount to use decimals

  const rawAccountStorage = await provider.query({
    request_type: "call_function",
    account_id: address,
    method_name: "storage_balance_of",
    args_base64: Buffer.from(JSON.stringify({account_id: account.accountId})).toString('base64'),
    finality: "optimistic",
  });

  const accountStorage = JSON.parse(Buffer.from(rawAccountStorage.result).toString());

  const rawReceiverStorage = await provider.query({
    request_type: "call_function",
    account_id: address,
    method_name: "storage_balance_of",
    args_base64: Buffer.from(JSON.stringify({ account_id: receiver })).toString('base64'),
    finality: "optimistic",
  });

  const receiverStorage = JSON.parse(Buffer.from(rawReceiverStorage.result).toString());

  const rawContractStorage = await provider.query({
    request_type: "call_function",
    account_id: address,
    method_name: "storage_balance_of",
    args_base64: Buffer.from(JSON.stringify({ account_id: window.contract.contractId })).toString('base64'),
    finality: "optimistic",
  });

  let contractStorage = JSON.parse(Buffer.from(rawContractStorage.result).toString());

  const rawBurnStorage = await provider.query({
    request_type: "call_function",
    account_id: address,
    method_name: "storage_balance_of",
    args_base64: Buffer.from(JSON.stringify({account_id: address})).toString('base64'),
    finality: "optimistic",
  });

  let burnStorage = JSON.parse(Buffer.from(rawBurnStorage.result).toString());

  if (accountStorage == null) {
    transactionsArray.push(
      transactions.functionCall(
        "storage_deposit",
        Buffer.from(JSON.stringify({
          account_id: account.accountId,
          registration_only: true
        })),
        10000000000000,
        utils.format.parseNearAmount("0.01")
      )
    );
  }
  if (receiverStorage == null) {
    transactionsArray.push(
      transactions.functionCall(
        "storage_deposit",
        Buffer.from(JSON.stringify({
          account_id: receiver,
          registration_only: true
        })),
        10000000000000,
        utils.format.parseNearAmount("0.01")
      )
    );
  }
  if (contractStorage == null) {
    transactionsArray.push(
      transactions.functionCall(
        "storage_deposit",
        Buffer.from(JSON.stringify({
          account_id: window.contract.contractId,
          registration_only: true
        })),
        10000000000000,
        utils.format.parseNearAmount("0.01")
      )
    )
  }
  if (burnStorage == null) {
    transactionsArray.push(
      transactions.functionCall(
        "storage_deposit",
        Buffer.from(JSON.stringify({
          account_id: address,
          registration_only: true
        })),
        10000000000000,
        utils.format.parseNearAmount("0.01")
      )
    )
  }
  transactionsArray.push(
    transactions.functionCall(
      "ft_transfer_call",
      Buffer.from(JSON.stringify({
        receiver_id: window.contract.contractId,
        amount: parseAmount(amount, decimals, address), //amount,
        memo: null,
        msg: receiver
      })),
      260000000000000,
      "1"
    )
  );
  await account.signAndSendTransaction({
    receiverId: address,
    actions: transactionsArray,
  });


}


function cleanupAmount(amount) {
  return amount.replace(/,/g, '').trim();
}
function trimLeadingZeroes(value) {
    value = value.replace(/^0+/, '');
    if (value === '') {
        return '0';
    }
    return value;
}
function parseAmount(amt, decimals, address) {
  if (!amt) { return 0; }
  amt = cleanupAmount(amt);
  const split = amt.split('.');
  const wholePart = split[0];
  const fracPart = split[1] || '';
  if (split.length > 2 || fracPart.length > decimals) {
      throw new Error(`Cannot parse '${amt}' as ${address} amount`);
  }
  return trimLeadingZeroes(wholePart + fracPart.padEnd(decimals, '0'));
}