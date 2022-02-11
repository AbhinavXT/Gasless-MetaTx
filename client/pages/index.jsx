import Head from 'next/head'

import { useState, useEffect } from 'react'
import { nftContractAddress } from '../config.js'
import { ethers } from 'ethers'

import NFT from '../utils/EternalNFT.json'

import { Biconomy } from '@biconomy/mexa'

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

let domainData = {
  name: 'EternalNFT',
  version: '1',
  verifyingContract: nftContractAddress,
  salt: ethers.utils.hexZeroPad(ethers.BigNumber.from(42).toHexString(), 32),
}

let ethersProvider, walletProvider, walletSigner
let contract, contractInterface
let biconomy

const mint = () => {
  const [currentAccount, setCurrentAccount] = useState('')
  const [selectedAddress, setSelectedAddress] = useState('')

  const init = async () => {
    if (typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask) {
      const provider = window['ethereum']
      await provider.enable()

      biconomy = new Biconomy(window.ethereum, {
        apiKey: 'To_rQOQlG.123aa12d-4e94-4ae3-bdcd-c6267d1b6b74',
        debug: true,
      })

      ethersProvider = new ethers.providers.Web3Provider(biconomy)

      walletProvider = new ethers.providers.Web3Provider(window.ethereum)
      walletSigner = walletProvider.getSigner()

      let userAddress = await walletSigner.getAddress()
      setSelectedAddress(userAddress)

      //console.log('userAddress', selectedAddress)

      biconomy
        .onEvent(biconomy.READY, async () => {
          contract = new ethers.Contract(
            nftContractAddress,
            NFT.abi,
            biconomy.getSignerByAddress(userAddress)
          )

          contractInterface = new ethers.utils.Interface(NFT.abi)
        })
        .onEvent(biconomy.ERROR, (error, message) => {
          console.log(message)
          console.log(error)
        })
    } else {
      console.log('Metamask not installed')
    }
  }

  const mintMeta = async () => {
    try {
      const { ethereum } = window

      if (ethereum) {
        //const signer = ethersProvider.getSigner()

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
            EIP712Domain: domainType,
            MetaTransaction: metaTransactionType,
          },
          domain: domainData,
          primaryType: 'MetaTransaction',
          message: message,
        })

        let signature = await walletProvider.send('eth_signTypedData_v3', [
          userAddress,
          dataToSign,
        ])

        let { r, s, v } = getSignatureParameters(signature)

        sendSignedTransaction(userAddress, functionSignature, r, s, v)
      } else {
        console.log("Ethereum object doesn't exist!")
      }
    } catch (error) {
      console.log('Error minting character', error)
    }
  }

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

      await tx.wait(1)
      console.log('Transaction hash : ', tx.hash)
      //let confirmation = await tx.wait()
      console.log(tx)
    } catch (error) {
      console.log(error)
    }
  }

  // Calls Metamask to connect wallet on clicking Connect Wallet button
  const connectWallet = async () => {
    try {
      const { ethereum } = window

      if (!ethereum) {
        console.log('Metamask not detected')
        return
      }
      let chainId = await ethereum.request({ method: 'eth_chainId' })
      console.log('Connected to chain:' + chainId)

      const kovanChainId = '0x2a'

      const devChainId = 1337
      const localhostChainId = `0x${Number(devChainId).toString(16)}`

      if (chainId !== kovanChainId && chainId !== localhostChainId) {
        alert('You are not connected to the kovan Testnet!')
        return
      }

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' })

      console.log('Found account', accounts[0])
      setCurrentAccount(accounts[0])
    } catch (error) {
      console.log('Error connecting to metamask', error)
    }
  }

  useEffect(() => {
    init()
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#0B132B] pt-32 text-[#d3d3d3]">
      <Head>
        <title>Gasless NFT</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <div className="trasition transition duration-500 ease-in-out hover:rotate-180 hover:scale-105">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="60"
          height="60"
          fill="currentColor"
          viewBox="0 0 16 16"
        >
          <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5 8 5.961 14.154 3.5 8.186 1.113zM15 4.239l-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923l6.5 2.6zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464L7.443.184z" />
        </svg>
      </div>
      <h2 className="mt-12 text-3xl font-bold">Mint your NFT!</h2>
      <h2 className="mb-20 mt-12 text-xl">Please connect to the kovan chain</h2>
      {currentAccount === '' ? (
        <button
          className="mb-10 rounded-lg bg-black py-3 px-12 text-2xl font-bold shadow-lg shadow-[#6FFFE9] transition duration-500 ease-in-out hover:scale-105"
          onClick={connectWallet}
        >
          Initialize DApp
        </button>
      ) : (
        <button
          className="mb-10 rounded-lg bg-black py-3 px-12 text-2xl font-bold shadow-lg shadow-[#6FFFE9] transition duration-500 ease-in-out hover:scale-105"
          onClick={mintMeta}
        >
          Mint NFT
        </button>
      )}
    </div>
  )
}

export default mint
