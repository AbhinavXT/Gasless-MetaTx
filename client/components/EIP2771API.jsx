import Head from 'next/head'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { networks } from '../utils/networks'

import NFT from '../utils/EternalNFT2771.json'

import { Biconomy } from '@biconomy/mexa'
import { useWalletProvider } from '../context/WalletProvider'

const nftContractAddress = '0x558b075114dB791a326A52E6E87A0A60c2Af15d9'

import {
  helperAttributes,
  getDomainSeperator,
  getDataToSignForPersonalSign,
  getDataToSignForEIP712,
  buildForwardTxRequest,
  getBiconomyForwarderConfig,
} from '../api-helper/forwarderHelper'

let contract, contractInterface
let biconomy

const EIP2771API = () => {
  const [selectedAddress, setSelectedAddress] = useState('')
  const [nftTx, setNftTx] = useState(null)
  const [gasless, setGasless] = useState(0)

  const [nftLoading, setNftLoading] = useState(null)
  const [initLoading, setInitLoading] = useState(null)

  const {
    rawEthereumProvider,
    walletProvider,
    signer,
    connect,
    web3Modal,
    isLoggedIn,
  } = useWalletProvider()

  const init = async () => {
    if (typeof window.ethereum !== 'undefined') {
      setInitLoading(0)

      // We're creating biconomy provider linked to your network of choice where your contract is deployed
      biconomy = new Biconomy(rawEthereumProvider, {
        apiKey: 'IVJtAaJ66.e7b33af9-0c7c-4223-a5b4-07469e8653f4',
        debug: true,
      })

      let userAddress = await signer.getAddress()
      setSelectedAddress(userAddress)

      biconomy
        .onEvent(biconomy.READY, async () => {
          // Initialize your dapp here like getting user accounts etc
          contract = new ethers.Contract(
            nftContractAddress,
            NFT.abi,
            biconomy.getSignerByAddress(userAddress)
          )

          // Handle error while initializing mexa
          contractInterface = new ethers.utils.Interface(NFT.abi)
          setInitLoading(1)
        })
        .onEvent(biconomy.ERROR, (error, message) => {
          console.log(message)
          console.log(error)
        })
    } else {
      console.log('Wallet not found')
    }
  }

  // Calls Metamask to connect wallet on clicking Connect Wallet button
  const connectWallet = async () => {
    try {
      await web3Modal.clearCachedProvider()
      connect()
    } catch (error) {
      console.log('Error connecting to wallet', error)
    }
  }

  const mintMeta = async () => {
    try {
      setNftLoading(0)
      setNftTx(null)
      const { ethereum } = window

      if (ethereum) {
        if (gasless === 1) {
          let userAddress = selectedAddress

          let { data } = await contract.populateTransaction.createEternalNFT()

          let provider = biconomy.getEthersProvider()

          let gasLimit = await provider.estimateGas({
            to: nftContractAddress,
            from: userAddress,
            data: data,
          })

          let forwarder = await getBiconomyForwarderConfig(80001)
          let forwarderContract = new ethers.Contract(
            forwarder.address,
            forwarder.abi,
            biconomy.getSignerByAddress(userAddress)
          )

          const batchNonce = await forwarderContract.getNonce(userAddress, 0)
          //const batchId = await forwarderContract.getBatch(userAddress);

          console.log(batchNonce)
          const to = nftContractAddress
          const gasLimitNum = Number(gasLimit.toNumber().toString())
          console.log(gasLimitNum)
          const batchId = 0
          const req = await buildForwardTxRequest({
            account: userAddress,
            to,
            gasLimitNum,
            batchId,
            batchNonce,
            data,
          })
          //console.log(req)

          const domainSeparator = await getDomainSeperator(80001)
          //console.log(domainSeparator)

          const dataToSign = await getDataToSignForEIP712(req, 80001)
          walletProvider
            .send('eth_signTypedData_v3', [userAddress, dataToSign])
            .then((sig) => {
              sendTransaction({
                userAddress,
                request: req,
                domainSeparator,
                sig,
                signatureType: 'EIP712_SIGN',
              })
            })
            .catch((error) => {
              console.log(error)
            })
        } else {
          console.log(gasless)
          const tx = await contract.createEternalNFT()
          const txn = await tx.wait()
        }
      } else {
        console.log("Ethereum object doesn't exist!")
      }
    } catch (error) {
      console.log('Error minting character', error)
    }
  }

  const sendTransaction = async ({
    userAddress,
    request,
    sig,
    domainSeparator,
    signatureType,
  }) => {
    if (rawEthereumProvider && contract) {
      let params
      if (domainSeparator) {
        params = [request, domainSeparator, sig]
      } else {
        params = [request, sig]
      }
      try {
        fetch(`https://api.biconomy.io/api/v2/meta-tx/native`, {
          method: 'POST',
          headers: {
            'x-api-key': 'IVJtAaJ66.e7b33af9-0c7c-4223-a5b4-07469e8653f4',
            'Content-Type': 'application/json;charset=utf-8',
          },
          body: JSON.stringify({
            to: nftContractAddress,
            apiId: '7bc13499-7ab1-430f-b670-1863172110ba	',
            params: params,
            from: userAddress,
            signatureType: signatureType,
          }),
        })
          .then((response) => response.json())
          .then(function (result) {
            console.log(result)

            setNftTx(result.txHash)
          })
          .catch(function (error) {
            console.log(error)
          })
      } catch (error) {
        console.log(error)
      }
    }
  }

  const toggleGasless = () => {
    gasless === 0 ? setGasless(1) : setGasless(0)
    console.log(gasless)
  }

  useEffect(() => {
    if (isLoggedIn) {
      init()
    }
  }, [isLoggedIn])

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-200 pt-12 text-gray-900">
      <Head>
        <title>Gasless NFT</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>

      <h2 className="mt-12 text-3xl font-bold">Mint your Character!</h2>

      {isLoggedIn === false ? (
        <button
          className="mb-10 mt-20 rounded-lg bg-black py-3 px-12 text-2xl font-bold text-gray-300 shadow-lg transition duration-500 ease-in-out hover:scale-105"
          onClick={connectWallet}
        >
          Connect Wallet
        </button>
      ) : initLoading === 0 ? (
        <div>
          <button className="mb-10 mt-20 rounded-lg bg-black py-3 px-12 text-2xl font-bold text-gray-300 shadow-lg transition duration-500 ease-in-out hover:scale-105">
            Initalizing....
          </button>
        </div>
      ) : (
        <div className="mt-8 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center gap-x-4">
            <input
              type="checkbox"
              className="h-4 w-4 shadow-sm shadow-gray-800"
              onChange={toggleGasless}
            />
            <label className="text-xl font-bold">Turn On Gasless</label>
          </div>
          <button
            className="mb-10 mt-12 rounded-lg bg-black py-3 px-12 text-2xl font-bold text-gray-300 shadow-lg transition duration-500 ease-in-out hover:scale-105"
            onClick={mintMeta}
          >
            Mint NFT
          </button>
        </div>
      )}

      <div className="mt-10">
        {nftTx ? (
          <div className="flex flex-col items-center justify-center">
            <div className="text-lg font-bold">
              You can view the transaction{' '}
              <a
                href={`https://mumbai.polygonscan.com/tx/${nftTx}`}
                target="_blank"
                className="text-blue-500 underline"
              >
                here
              </a>
            </div>
          </div>
        ) : nftLoading === 0 ? (
          <div className="text-lg font-bold">
            Processing Your Transaction...
          </div>
        ) : (
          <div></div>
        )}
      </div>
    </div>
  )
}

export default EIP2771API
