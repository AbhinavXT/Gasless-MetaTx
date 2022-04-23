import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import { ethers } from 'ethers'

import Web3Modal from 'web3modal'
import WalletConnectProvider from '@walletconnect/web3-provider'
import Portis from '@portis/web3'
import { sequence } from '0xsequence'

const WalletProviderContext = createContext(null)

const customNetworkOptions = {
  rpcUrl: 'https://kovan.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
  chainId: 6,
}

let provider

const WalletProviderProvider = (props) => {
  const [walletProvider, setWalletProvider] = useState()

  const [signer, setSigner] = useState()

  const [web3Modal, setWeb3Modal] = useState()

  const [rawEthereumProvider, setRawEthereumProvider] = useState(null)

  const [accounts, setAccounts] = useState()
  const [currentChainId, setCurrentChainId] = useState()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    if (
      rawEthereumProvider &&
      walletProvider &&
      currentChainId &&
      accounts &&
      accounts[0] &&
      accounts[0].length > 0
    ) {
      setIsLoggedIn(true)
    } else {
      setIsLoggedIn(false)
    }
  }, [rawEthereumProvider, walletProvider, currentChainId, accounts])

  useEffect(() => {
    if (!walletProvider) return
    setSigner(walletProvider.getSigner())
  }, [walletProvider])

  useEffect(() => {
    setWeb3Modal(
      new Web3Modal({
        network: 'kovan', // optional
        cacheProvider: true, // optional
        providerOptions: {
          portis: {
            package: Portis, // required
            options: {
              id: 'bc402fd6-7386-4d74-a42e-e786f8c50e0c', // required
            },
          },
          walletconnect: {
            package: WalletConnectProvider, // required
            options: {
              infuraId: 'Su3Y4WDh89-ygiQHL77KNGsywJ3y2jlR', // required
            },
          },
          sequence: {
            package: sequence, // required
            options: {
              appName: 'Gasless-NFT', // optional
            },
          },
        },
      })
    )
  }, [])

  // because provider does not fire events initially, we need to fetch initial values for current chain from walletProvider
  // subsequent changes to these values however do fire events, and we can just use those event handlers
  useEffect(() => {
    if (!walletProvider) return // console.log(walletProvider);
    ;(async () => {
      let { chainId } = await walletProvider.getNetwork()
      let accounts = await walletProvider.listAccounts()
      setAccounts(accounts.map((a) => a.toLowerCase()))
      setCurrentChainId(chainId)
    })()
  }, [walletProvider])

  const reinit = (changedProvider) => {
    setWalletProvider(new ethers.providers.Web3Provider(changedProvider))
  }

  // setup event handlers for web3 provider given by web3-modal
  // this is the provider injected by metamask/fortis/etc

  const connect = useCallback(async () => {
    if (!web3Modal) {
      console.error('Web3Modal not initialized.')
      return
    }
    provider = await web3Modal.connect()
    setRawEthereumProvider(provider)
    setWalletProvider(new ethers.providers.Web3Provider(provider))

    console.log('raw', provider)
  }, [web3Modal])

  const disconnect = useCallback(async () => {
    if (!web3Modal) {
      console.error('Web3Modal not initialized.')
      return
    }
    web3Modal.clearCachedProvider()
    setRawEthereumProvider(undefined)
    setWalletProvider(undefined)
  }, [web3Modal])

  useEffect(() => {
    if (!rawEthereumProvider) return

    function handleAccountsChanged(accounts) {
      console.log('accountsChanged!')
      setAccounts(accounts.map((a) => a.toLowerCase()))
      reinit(rawEthereumProvider)
    }

    // Wallet documentation recommends reloading page on chain change.
    // Ref: https://docs.metamask.io/guide/ethereum-provider.html#events
    function handleChainChanged(chainId) {
      console.log('chainChanged!')
      if (typeof chainId === 'string') {
        setCurrentChainId(Number.parseInt(chainId))
      } else {
        setCurrentChainId(chainId)
      }
      reinit(rawEthereumProvider)
    }

    function handleConnect(info) {
      console.log('connect!')
      setCurrentChainId(info.chainId)
      reinit(rawEthereumProvider)
    }

    function handleDisconnect(error) {
      console.log('disconnect')
      console.error(error)
    }

    // Subscribe to accounts change
    rawEthereumProvider.on('accountsChanged', handleAccountsChanged)

    // Subscribe to network change
    rawEthereumProvider.on('chainChanged', handleChainChanged)

    // Subscribe to provider connection
    rawEthereumProvider.on('connect', handleConnect)

    // Subscribe to provider disconnection
    rawEthereumProvider.on('disconnect', handleDisconnect)

    // Remove event listeners on unmount!
    return () => {
      rawEthereumProvider.removeListener(
        'accountsChanged',
        handleAccountsChanged
      )
      rawEthereumProvider.removeListener('networkChanged', handleChainChanged)
      rawEthereumProvider.removeListener('connect', handleConnect)
      rawEthereumProvider.removeListener('disconnect', handleDisconnect)
    }
  }, [rawEthereumProvider])

  return (
    <WalletProviderContext.Provider
      value={{
        rawEthereumProvider,
        walletProvider,
        signer,
        web3Modal,
        connect,
        disconnect,
        accounts,
        currentChainId,
        isLoggedIn,
      }}
      {...props}
    />
  )
}

const useWalletProvider = () => useContext(WalletProviderContext)
export { WalletProviderProvider, useWalletProvider }
