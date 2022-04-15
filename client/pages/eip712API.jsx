import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { networks } from '../utils/networks'

import NFT from '../utils/EternalNFT.json'

import { Biconomy } from '@biconomy/mexa'

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

const mint = () => {
  const [currentAccount, setCurrentAccount] = useState('')
  const [selectedAddress, setSelectedAddress] = useState('')
  const [nftTx, setNftTx] = useState(null)
  const [network, setNetwork] = useState('')
  const [gasless, setGasless] = useState(0)

  const [nftLoading, setNftLoading] = useState(null)
  const [initLoading, setInitLoading] = useState(null)

  const init = async () => {
    if (typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask) {
      setInitLoading(0)

      // We're creating biconomy provider linked to your network of choice where your contract is deployed
      biconomy = new Biconomy(window.ethereum, {
        apiKey: 'To_rQOQlG.123aa12d-4e94-4ae3-bdcd-c6267d1b6b74',
        debug: true,
      })

      ethersProvider = new ethers.providers.Web3Provider(biconomy)

      /*
        This provider linked to your wallet.
        If needed, substitute your wallet solution in place of window.ethereum 
      */
      walletProvider = new ethers.providers.Web3Provider(window.ethereum)
      walletSigner = walletProvider.getSigner()

      let userAddress = await walletSigner.getAddress()
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

  // Opens up a Switch Network metamask window if the user is at any network other than Kovan on connecting wallet
  const switchNetwork = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2a' }], // Check networks.js for hexadecimal network ids
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
      // If window.ethereum is not found then MetaMask is not installed
      alert(
        'MetaMask is not installed. Please install it to use this app: https://metamask.io/download.html'
      )
    }
  }

  // Executes a Meta Transaction with EIP-712 Type signature for minting an NFT
  const mintMeta = async () => {
    try {
      setNftLoading(0)
      setNftTx(null)
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
              EIP712Domain: domainType,
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

          sendTransaction(userAddress, functionSignature, r, s, v)
        } else {
          console.log(gasless)
          const tx = await contract.createEternalNFT()
          const txn = await tx.wait()

          const tokenId = txn.events[0].args.tokenId.toString()
          console.log(tokenId)
          getMintedNFT(tokenId)
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

  const sendTransaction = async (userAddress, functionData, r, s, v) => {
    try {
      fetch('https://api.biconomy.io/api/v2/meta-tx/native', {
        method: 'POST',
        headers: {
          'x-api-key': 'To_rQOQlG.123aa12d-4e94-4ae3-bdcd-c6267d1b6b74',
          'Content-Type': 'application/json;charset=utf-8',
        },
        body: JSON.stringify({
          to: nftContractAddress,
          apiId: 'ac69688a-a21a-4130-ab18-6b2097e7f215',
          params: [userAddress, functionData, r, s, v],
          from: userAddress,
        }),
      })
        .then((response) => response.json())
        .then(async function (result) {
          let receipt = await ethersProvider.waitForTransaction(result.txHash)
          setNftTx(result.txHash)
        })
        .catch(function (error) {
          console.log(error)
        })
    } catch (error) {
      console.log(error)
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

export default mint
