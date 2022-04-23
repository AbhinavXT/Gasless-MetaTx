import Head from 'next/head'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import axios from 'axios'
import { networks } from '../utils/networks'

import NFT from '../utils/EternalNFT.json'

import { Biconomy } from '@biconomy/mexa'

import { useWalletProvider } from '../context/WalletProvider'

const nftContractAddress = '0x954961aAa708423828db1047c320521d25EC31cC'

// this changes for all EIP712Sign variations of custom approach
const domainType = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'verifyingContract', type: 'address' },
  { name: 'salt', type: 'bytes32' },
]

const metaTransactionType = [
  { name: 'nonce', type: 'uint256' },
  { name: 'from', type: 'address' },
  { name: 'functionSignature', type: 'bytes' },
]

// replace the chainId 42 if network is not kovan
let domainData = {
  name: 'EternalNFT',
  version: '1',
  verifyingContract: nftContractAddress,
  salt: ethers.utils.hexZeroPad(ethers.BigNumber.from(42).toHexString(), 32),
}

let ethersProvider, walletProvider, walletSigner
let contract, contractInterface
let biconomy

const EIP712 = () => {
  const [currentAccount, setCurrentAccount] = useState('')
  const [selectedAddress, setSelectedAddress] = useState('')
  const [mintedNFT, setMintedNFT] = useState(null)
  const [network, setNetwork] = useState('')
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
    if (walletProvider) {
      setInitLoading(0)

      // We're creating biconomy provider linked to your network of choice where your contract is deployed
      biconomy = new Biconomy(rawEthereumProvider, {
        apiKey: 'To_rQOQlG.123aa12d-4e94-4ae3-bdcd-c6267d1b6b74',
        debug: true,
        walletProvider: rawEthereumProvider,
      })

      ethersProvider = new ethers.providers.Web3Provider(biconomy)

      /*
        This provider linked to your wallet.
        If needed, substitute your wallet solution in place of window.ethereum 
      */

      walletSigner = walletProvider.getSigner()

      let userAddress = await signer.getAddress()
      console.log('add', userAddress)
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
      console.log('Wallet not installed')
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

  // Executes a Meta Transaction with EIP-712 Type signature for minting an NFT
  const mintMeta = async () => {
    try {
      setNftLoading(0)
      setMintedNFT(null)
      const { ethereum } = window

      if (ethereum) {
        if (gasless === 1) {
          console.log(gasless)
          let userAddress = selectedAddress

          let nonce = await contract.getNonce(userAddress)

          let functionSignature =
            contractInterface.encodeFunctionData('createEternalNFT')

          let message = {}
          message.nonce = parseInt(nonce)
          message.from = userAddress
          message.functionSignature = functionSignature

          const dataToSign = JSON.stringify({
            types: {
              eipDomain: domainType,
              MetaTransaction: metaTransactionType,
            },
            domain: domainData,
            primaryType: 'MetaTransaction',
            message: message,
          })

          /*
            Its important to use eth_signTypedData_v3 and not v4 to get EIP712 signature 
            because we have used salt in domain data instead of chainId
          */
          let signature = await walletProvider.send('eth_signTypedData_v3', [
            userAddress,
            dataToSign,
          ])

          let { r, s, v } = getSignatureParameters(signature)

          sendSignedTransaction(userAddress, functionSignature, r, s, v)
        } else {
          console.log(gasless)
          const tx = await contract.createEternalNFT()
          const txn = await tx.wait()

          console.log(tx.hash)
        }
      } else {
        console.log("Ethereum object doesn't exist!")
      }
    } catch (error) {
      console.log('Error minting character', error)
    }
  }

  // Function for decoding Signature Parameters
  const getSignatureParameters = (signature) => {
    if (!ethers.utils.isHexString(signature)) {
      throw new Error(
        'Given value "'.concat(signature, '" is not a valid hex string.')
      )
    }
    var r = signature.slice(0, 66)
    var s = '0x'.concat(signature.slice(66, 130))
    var v = '0x'.concat(signature.slice(130, 132))
    v = ethers.BigNumber.from(v).toNumber()
    if (![27, 28].includes(v)) v += 27

    console.log('Signature', signature)
    console.log('r', r)
    console.log('s', s)
    console.log('v', v)

    return {
      r: r,
      s: s,
      v: v,
    }
  }

  const sendSignedTransaction = async (userAddress, functionData, r, s, v) => {
    try {
      let tx = await contract.executeMetaTransaction(
        userAddress,
        functionData,
        r,
        s,
        v,
        { gasLimit: 1000000 }
      )

      const txData = await tx.wait(1)

      console.log('Transaction hash : ', tx.hash)
      console.log(tx)
    } catch (error) {
      console.log(error)
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
        {mintedNFT ? (
          <div className="flex flex-col items-center justify-center">
            <div className="mb-4 text-center text-lg font-semibold">
              Your Eternal Domain Character
            </div>
            <img
              src={mintedNFT}
              alt=""
              className="h-60 w-60 rounded-lg shadow-lg transition duration-500 ease-in-out hover:scale-105"
            />
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

export default EIP712
