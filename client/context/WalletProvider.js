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

const WalletProviderContext = createContext(null)

const WalletProviderProvider = (props) => {
  const [walletProvider, setWalletProvider] = useState()

  const [signer, setSigner] = useState()

  const [web3Modal, setWeb3Modal] = useState()

  const [rawEthereumProvider, setRawEthereumProvider] = useState()

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
        network: 'Kovan', // optional
        cacheProvider: true, // optional
        providerOptions: {
          walletconnect: {
            package: WalletConnectProvider, // required
            options: {
              infuraId:
                'https://kovan.infura.io/v3/c9c349cef85a436eaad2f5ef6c067f3a', // required
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
  useEffect(() => {
    if (!rawEthereumProvider) return

    // Subscribe to accounts change
    rawEthereumProvider.on('accountsChanged', (accounts) => {
      // console.log(accounts);
      setAccounts(accounts.map((a) => a.toLowerCase()))
      reinit(rawEthereumProvider)
    })

    // Subscribe to chainId change
    rawEthereumProvider.on('chainChanged', (chainId) => {
      // console.log(chainId);
      setCurrentChainId(chainId)
      reinit(rawEthereumProvider)
    })

    // Subscribe to provider connection
    rawEthereumProvider.on('connect', (info) => {
      // console.log(info);
      setCurrentChainId(info.chainId)
      reinit(rawEthereumProvider)
    })

    // Subscribe to provider disconnection
    rawEthereumProvider.on('disconnect', (error) => {
      console.error(error)
    })
  }, [rawEthereumProvider])

  const connect = useCallback(async () => {
    if (!web3Modal) {
      console.error('Web3Modal not initialized.')
      return
    }
    let provider = await web3Modal.connect()
    setRawEthereumProvider(provider)
    setWalletProvider(new ethers.providers.Web3Provider(provider))
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
