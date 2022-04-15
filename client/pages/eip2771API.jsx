import Head from 'next/head'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { networks } from '../utils/networks'

import NFT from '../utils/EternalNFT2771.json'

import { Biconomy } from '@biconomy/mexa'

const nftContractAddress = '0xf9fB1C88Fb9f89E1BAbb1d3C8Ed50b35785FcE31'

import {
  helperAttributes,
  getDomainSeperator,
  getDataToSignForPersonalSign,
  getDataToSignForEIP712,
  buildForwardTxRequest,
  getBiconomyForwarderConfig,
} from '../api-helper/forwarderHelper'

let ethersProvider, walletProvider, walletSigner
let contract, contractInterface
let biconomy

const eip2771 = () => {
  const [currentAccount, setCurrentAccount] = useState('')
  const [selectedAddress, setSelectedAddress] = useState('')
  const [nftTx, setNftTx] = useState(null)
  const [network, setNetwork] = useState('')

  const [nftLoading, setNftLoading] = useState(null)
  const [initLoading, setInitLoading] = useState(null)
  const [gasless, setGasless] = useState(0)

  const init = async () => {
    if (typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask) {
      setInitLoading(0)

      biconomy = new Biconomy(window.ethereum, {
        apiKey: 'To_rQOQlG.123aa12d-4e94-4ae3-bdcd-c6267d1b6b74',
        debug: true,
      })

      // two providers one with biconomy andd other for the wallet signing the transaction
      ethersProvider = new ethers.providers.Web3Provider(biconomy)

      walletProvider = new ethers.providers.Web3Provider(window.ethereum)
      walletSigner = walletProvider.getSigner()

      let userAddress = await walletSigner.getAddress()
      setSelectedAddress(userAddress)

      // init dApp stuff like contracts and interface
      biconomy
        .onEvent(biconomy.READY, async () => {
          contract = new ethers.Contract(
            nftContractAddress,
            NFT.abi,
            biconomy.getSignerByAddress(userAddress)
          )

          contractInterface = new ethers.utils.Interface(NFT.abi)
          setInitLoading(1)
        })
        .onEvent(biconomy.ERROR, (error, message) => {
          console.log(message)
          console.log(error)
        })
    } else {
      console.log('Metamask not installed')
    }
  }

  // Checks if wallet is connected to the correct network
  const checkIfWalletIsConnected = async () => {
    const { ethereum } = window

    if (!ethereum) {
      console.log('Make sure you have metamask!')
      return
    } else {
      console.log('We have the ethereum object', ethereum)
    }

    const accounts = await ethereum.request({ method: 'eth_accounts' })

    if (accounts.length !== 0) {
      const account = accounts[0]
      console.log('Found an authorized account:', account)
      setCurrentAccount(account)
    } else {
      console.log('No authorized account found')
    }

    // This is the new part, we check the user's network chain ID
    const chainId = await ethereum.request({ method: 'eth_chainId' })
    setNetwork(networks[chainId])

    ethereum.on('chainChanged', handleChainChanged)

    // Reload the page when they change networks
    function handleChainChanged(_chainId) {
      window.location.reload()
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

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' })

      console.log('Found account', accounts[0])
      setCurrentAccount(accounts[0])
      switchNetwork()
    } catch (error) {
      console.log('Error connecting to metamask', error)
    }
  }

  const switchNetwork = async () => {
    if (window.ethereum) {
      try {
        // Try to switch to the Mumbai testnet
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2a' }], // Check networks.js for hexadecimal network ids
        })
      } catch (error) {
        // This error code means that the chain we want has not been added to MetaMask
        // In this case we ask the user to add it to their MetaMask
        if (error.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x2a',
                  chainName: 'Kovan',
                  rpcUrls: [
                    'https://kovan.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
                  ],
                  nativeCurrency: {
                    name: 'Ethereum',
                    symbol: 'ETH',
                    decimals: 18,
                  },
                  blockExplorerUrls: ['https://kovan.etherscan.io/'],
                },
              ],
            })
          } catch (error) {
            console.log(error)
          }
        }
        console.log(error)
      }
    } else {
      // If window.ethereum is not found then MetaMask is not installed
      alert(
        'MetaMask is not installed. Please install it to use this app: https://metamask.io/download.html'
      )
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

          let forwarder = await getBiconomyForwarderConfig(42)
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
          console.log(req)

          const domainSeparator = await getDomainSeperator(42)
          console.log(domainSeparator)

          const dataToSign = await getDataToSignForEIP712(req, 42)
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
    if (ethersProvider && contract) {
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
            'x-api-key': 'To_rQOQlG.123aa12d-4e94-4ae3-bdcd-c6267d1b6b74',
            'Content-Type': 'application/json;charset=utf-8',
          },
          body: JSON.stringify({
            to: nftContractAddress,
            apiId: '9283930d-a360-462e-ad8e-6fe4f3b4c463',
            params: params,
            from: userAddress,
            signatureType: signatureType,
          }),
        })
          .then((response) => response.json())
          .then(function (result) {
            console.log(result)

            return result.txHash
          })
          .then(function (hash) {
            ethersProvider.once(hash, (transaction) => {
              console.log(transaction)
              setNftTx(hash)
            })
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
    checkIfWalletIsConnected()

    if (currentAccount !== '') {
      if (network === 'Kovan') {
        init()
      } else {
        switchNetwork()
      }
    }
  }, [currentAccount, network])

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-200 pt-12 text-gray-900">
      <Head>
        <title>Gasless NFT</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>

      <h2 className="mt-12 text-3xl font-bold">Mint your Character!</h2>

      {currentAccount === '' ? (
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
                href={`https://kovan.etherscan.io/tx/${nftTx}`}
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

export default eip2771
