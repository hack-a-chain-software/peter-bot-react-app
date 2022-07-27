
import { useEffect } from "react";

import './App.css';

import { initNear, sendMoneyCall, initializeTokenContract } from './utils';

//url format:     
// http://localhost:3000/.com/url?token=hack_token.testnet&amount=55&receiver=peter_pan.testnet
// http://localhost:3000/.com/url?token=$NEAR&amount=0.001&receiver=10tri.near

function App() {

  const queryParams = new URLSearchParams(window.location.search);

  const token = queryParams.get('token');
  const amount = queryParams.get('amount');
  const receiver = queryParams.get('receiver');
  const transactionHashes = queryParams.get('transactionHashes');
  const burner = queryParams.get('burner');

  useEffect(() => {
    const closure = async () => {
      await initNear();

      if (transactionHashes === null) {
        if (token === "$NEAR") {
          await sendMoneyCall(receiver, amount);
        } else {
          initializeTokenContract(token, receiver, amount, burner);
        }
      }
    }
    closure();
  })

  let text = transactionHashes === null ? "Loading your transaction" : `Transaction succesful, you can close this window. \n Transaction hash: ${transactionHashes}`
  return (
    <div className="App">
      {text}
    </div>
  );
}

export default App;


// token=hack_token.testnet&receiver=teste22gfd.testnet&amount=10

//near view guest-book.testnet getMessages '{}'
// contractName method_name { args }
//near view ft storage_balance_bounds
// near view jack_daniel.testnet storage_balance_of '{"account_id": "destri.testnet"}'
// near call hack_token.testnet storage_deposit '{"account_id": "jack_daniel.testnet"}' --accountId destri.testnet --amount 0.00235