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
import Fortmatic from 'fortmatic'

const WalletProviderContext = createContext(null)

const customNetworkOptions = {
  rpcUrl: 'https://polygon-mumbai.g.alchemy.com/v2/P8LwlG2oErzKvA8l01o-RU8ECljSMQ3Q',
  chainId: 80001,
}

let provider

const WalletProviderProvider = (props) => {
  const [walletProvider, setWalletProvider] = useState(null)

  const [signer, setSigner] = useState(null)

  const [web3Modal, setWeb3Modal] = useState(null)

  const [rawEthereumProvider, setRawEthereumProvider] = useState(null)

  const [accounts, setAccounts] = useState(null)
  const [currentChainId, setCurrentChainId] = useState(null)
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
          fortmatic: {
            package: Fortmatic, // required
            options: {
              key: 'pk_test_8DFCB3A9CCC5F213', // required,
              network: customNetworkOptions, // if we don't pass it, it will default to localhost:8454
            },
          },
        },
      })
    )
  }, [])

  // because provider does not fire events initially, we need to fetch initial values for current chain from walletProvider
  // subsequent changes to these values however do fire events, and we can just use those event handlers
  useEffect(() => {
    if (!walletProvider) return
    ;(async () => {
      let { chainId } = await walletProvider.getNetwork()
      let accounts = await walletProvider.listAccounts()
      setAccounts(accounts.map((a) => a.toLowerCase()))
      setCurrentChainId(chainId)
    })()
  }, [walletProvider])

  const connect = useCallback(async () => {
    if (!web3Modal) {
      console.error('Web3Modal not initialized.')
      return
    }
    provider = await web3Modal.connect()
    setRawEthereumProvider(provider)
    setWalletProvider(new ethers.providers.Web3Provider(provider))
  }, [web3Modal])

  return (
    <WalletProviderContext.Provider
      value={{
        rawEthereumProvider,
        walletProvider,
        signer,
        web3Modal,
        connect,
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
