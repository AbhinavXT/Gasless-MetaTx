import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { Biconomy } from '@biconomy/mexa'
import { useWalletProvider } from './WalletProvider'
import { ethers } from 'ethers'

import NFT from '../utils/EternalNFT.json'

const nftContractAddress = '0x954961aAa708423828db1047c320521d25EC31cC'

const NETWORK_AGNOSTIC = true

const BiconomyContext = createContext(null)

const BiconomyProvider = (props) => {
  const { rawEthereumProvider, walletProvider } = useWalletProvider()
  // const { fromChainRpcUrlProvider, fromChain, areChainsReady } = useChains();

  const [isBiconomyReady, setIsBiconomyReady] = useState(false)

  // const isBiconomyAllowed = useMemo(
  //   () =>
  //     !!(!!fromChain?.networkAgnosticTransfer && !!fromChain.biconomy.enable),
  //   [fromChain]
  // );

  // const [isBiconomyToggledOn, setIsBiconomyToggledOn] = useState(false);

  // const isBiconomyEnabled = useMemo(
  //   () =>
  //     !!(
  //       !!fromChain?.networkAgnosticTransfer &&
  //       !!fromChain.biconomy.enable &&
  //       isBiconomyToggledOn
  //     ),
  //   [fromChain, isBiconomyToggledOn]
  // );

  // useEffect(() => {
  //   console.log({ isBiconomyEnabled });
  // }, [isBiconomyEnabled]);

  // reinitialize biconomy everytime from chain is changed
  const biconomy = useMemo(() => {
    // if biconomy is disabled for from chain, then don't initialise
    // or if from chain is not selected yet, then don't initialise
    // if (!fromChain || !fromChain.biconomy.enable || !areChainsReady) {
    //   return;
    // }

    let newBiconomy

    // console.log({ fromChain, fromChainRpcUrlProvider });
    // if network agnostic transfers are enabled for current from chain
    // TODO: Because of bug in Biconomy SDK, fallback provider is not picked up automatically
    // So we need to redeclare Biconomy without network agnostic features to make it work properlys

    if (!rawEthereumProvider) return
    if (NETWORK_AGNOSTIC) {
      // if (!fromChainRpcUrlProvider) return;

      newBiconomy = new Biconomy(
        /*new ethers.providers.JsonRpcProvider(
            "https://polygon-mumbai.g.alchemy.com/v2/7JwWhWSG1vtw6ggm_o_GcYnyNw02oM8b"
          ),*/
        rawEthereumProvider,
        {
          apiKey: 'To_rQOQlG.123aa12d-4e94-4ae3-bdcd-c6267d1b6b74',
          debug: true,
          walletProvider: rawEthereumProvider,
        }
      )
      return newBiconomy
    } // else setup without network agnostic features
    else {
      newBiconomy = new Biconomy(rawEthereumProvider, {
        apiKey: 'To_rQOQlG.123aa12d-4e94-4ae3-bdcd-c6267d1b6b74',
        debug: true,
      })
    }

    return newBiconomy
  }, [rawEthereumProvider])

  useEffect(() => {
    if (!biconomy) return

    let onReadyListener = () => {
      // Initialize your dapp here like getting user accounts etc
      setIsBiconomyReady(true)
      console.log('BICONOMY READY')
    }

    let onErrorListener = (error, message) => {
      // Handle error while initializing mexa
      setIsBiconomyReady(false)
    }

    biconomy
      .onEvent(biconomy.READY, onReadyListener)
      .onEvent(biconomy.ERROR, onErrorListener)

    // TODO:
    // once the Biconomy SDK has been updated to include support for removing event listeners,
    // make sure to remove both these event listeners in the cleanup function to allow for GC of old instances.
    // so uncomment the below returned function
    // return () => {
    //   biconomy.removeEventListener(biconomy.READY, onReadyListener);
    //   biconomy.removeEventListener(biconomy.ERROR, onErrorListener);
    // };
  }, [biconomy])

  return (
    <BiconomyContext.Provider
      value={{
        isBiconomyReady,
        // isBiconomyEnabled,
        // isBiconomyAllowed,
        biconomy,
        // isBiconomyToggledOn,
        // setIsBiconomyToggledOn,
      }}
      {...props}
    />
  )
}

const useBiconomy = () => useContext(BiconomyContext)
export { BiconomyProvider, useBiconomy }
