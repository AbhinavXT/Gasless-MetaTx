import { useState, useEffect } from 'react'

import { ethers } from 'ethers'

const test = () => {
  const [currentAccount, setCurrentAccount] = useState(null)

  const connect = async () => {
    const { ethereum } = window

    try {
      if (ethereum && ethereum.isMetaMask) {
        console.log('Metamask is installed', ethereum)

        const accounts = await ethereum.request({
          method: 'eth_requestAccounts',
        })
        console.log('Found account', accounts[0])
        setCurrentAccount(accounts[0])
        if (currentAccount) {
          switchNetwork()
          info()
        }
      } else {
        alert('Metamask not found')
      }
    } catch (e) {
      console.log(e)
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
                  chainName: 'Polygon Mumbai Testnet',
                  rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
                  nativeCurrency: {
                    name: 'Kovan',
                    symbol: 'ETH',
                    decimals: 18,
                  },
                  blockExplorerUrls: ['https://mumbai.polygonscan.com/'],
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

  const info = async () => {
    const { ethereum } = window
    try {
      if (ethereum && ethereum.isMetaMask) {
        const provider = new ethers.providers.Web3Provider(ethereum)

        const tCount = await provider.getTransactionCount(currentAccount)
        console.log('Transaction count', tCount)
      } else {
        console.log('Metamask not detected')
      }
    } catch (e) {
      console.log(e)
    }
  }

  useEffect(() => {
    checkIfWalletIsConnected()
  }, [])

  return (
    <div>
      <button className="m-40 h-12 w-64 bg-black text-white" onClick={connect}>
        Mint NFT
      </button>
    </div>
  )
}

export default test
