import Head from 'next/head'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { networks } from '../utils/networks'

import NFT from '../../artifacts/contracts/EternalNFT.sol/EternalNFT.json'

// import @biconomy/mexa

let walletProvider, walletSigner
let contract, contractInterface

// decalre biconomy and ethersProvider variable

const nftContractAddress = '0xfcBC9b16EeB1060E1925CCD51E697c62E0c8Aa14'

const mint = () => {
  const [currentAccount, setCurrentAccount] = useState('')
  const [selectedAddress, setSelectedAddress] = useState('')
  const [nftTx, setNftTx] = useState(null)
  const [network, setNetwork] = useState('')

  const [nftLoading, setNftLoading] = useState(null)
  const [initLoading, setInitLoading] = useState(null)

  const init = async () => {
    if (typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask) {
      setInitLoading(0)

      // Initialize biconomy with api key from the dashboard

      // Initialize etersProvider with the biconomy object

      walletProvider = new ethers.providers.Web3Provider(window.ethereum)
      walletSigner = walletProvider.getSigner()

      let userAddress = await walletSigner.getAddress()

      setSelectedAddress(userAddress)

      // Initialize dApp inside the biconomy events
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
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2a' }],
        })
      } catch (error) {
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
      alert(
        'MetaMask is not installed. Please install it to use this app: https://metamask.io/download.html'
      )
    }
  }

  const mintNFT = async () => {
    try {
      setNftLoading(0)
      setNftTx(null)
      const { ethereum } = window

      if (ethereum) {
        // Create your target method signature.. here we are calling setQuote() method of our contract
        // add event emitter methods
      } else {
        console.log("Ethereum object doesn't exist!")
      }
    } catch (error) {
      console.log('Error minting character', error)
    }
  }

  useEffect(() => {
    checkIfWalletIsConnected()

    if (currentAccount !== '' && network === 'Kovan') {
      console.log('init')
      init()
    }
  }, [currentAccount, network])

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
      <h2 className="mt-12 text-3xl font-bold">Mint your Character!</h2>
      {currentAccount === '' ? (
        <button
          className="mb-10 mt-20 rounded-lg bg-black py-3 px-12 text-2xl font-bold shadow-lg shadow-[#6FFFE9] transition duration-500 ease-in-out hover:scale-105"
          onClick={connectWallet}
        >
          Connect Wallet
        </button>
      ) : initLoading === 0 ? (
        <div>
          <button className="mb-10 mt-20 rounded-lg bg-black py-3 px-12 text-2xl font-bold shadow-lg shadow-[#6FFFE9] transition duration-500 ease-in-out hover:scale-105">
            Initalizing....
          </button>
        </div>
      ) : (
        <button
          className="mb-10 mt-20 rounded-lg bg-black py-3 px-12 text-2xl font-bold shadow-lg shadow-[#6FFFE9] transition duration-500 ease-in-out hover:scale-105"
          onClick={mintNFT}
        >
          Mint NFT
        </button>
      )}

      <div className="mt-10">
        {nftTx ? (
          <div className="flex flex-col items-center justify-center">
            <div className="text-lg font-bold">
              You can view the transaction{' '}
              <a
                href={`https://kovan.etherscan.io/tx/${nftTx}`}
                target="_blank"
                className="text-[#6FFFE9] underline"
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

export default mint
