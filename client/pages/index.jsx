import Head from 'next/head'

import { useState, useEffect } from 'react'
import { nftContractAddress } from '../config.js'
import { ethers } from 'ethers'
import axios from 'axios'

import Loader from 'react-loader-spinner'

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
	const [mintedNFT, setMintedNFT] = useState(null)
	const [miningStatus, setMiningStatus] = useState(null)
	const [loadingState, setLoadingState] = useState(0)
	const [txError, setTxError] = useState(null)
	const [currentAccount, setCurrentAccount] = useState('')
	const [correctNetwork, setCorrectNetwork] = useState(false)
	const [selectedAddress, setSelectedAddress] = useState('')

	useEffect(() => {
		const init = async () => {
			if (
				typeof window.ethereum !== 'undefined' &&
				window.ethereum.isMetaMask
			) {
				checkIfWalletIsConnected()
				checkCorrectNetwork()

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

						console.log(contract)

						contractInterface = new ethers.utils.Interface(NFT.abi)
					})
					.onEvent(biconomy.ERROR, (error, message) => {
						console.log(message)
						console.log(error)
					})
			} else {
				showErrorMessage('Metamask not installed')
			}
		}
		init()
	}, [])

	const mintMeta = async () => {
		try {
			const { ethereum } = window

			if (ethereum) {
				//const signer = ethersProvider.getSigner()

				let userAddress = selectedAddress

				let nonce = await contract.getNonce(userAddress)

				let functionSignature =
					contractInterface.encodeFunctionData('createEternalNFT')

				console.log('Function Signature Done')

				let message = {}
				message.nonce = parseInt(nonce)
				message.from = userAddress
				message.functionSignature = functionSignature

				console.log('Message Done')

				const dataToSign = JSON.stringify({
					types: {
						EIP712Domain: domainType,
						MetaTransaction: metaTransactionType,
					},
					domain: domainData,
					primaryType: 'MetaTransaction',
					message: message,
				})

				console.log('Data to sign Done')

				let signature = await walletProvider.send('eth_signTypedData_v3', [
					userAddress,
					dataToSign,
				])
				let { r, s, v } = getSignatureParameters(signature)

				console.log('Signature Done')

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

	// Checks if wallet is connected
	const checkIfWalletIsConnected = async () => {
		const { ethereum } = window
		if (ethereum) {
			console.log('Got the ethereum obejct: ', ethereum)
		} else {
			console.log('No Wallet found. Connect Wallet')
		}

		const accounts = await ethereum.request({ method: 'eth_accounts' })

		if (accounts.length !== 0) {
			console.log('Found authorized Account: ', accounts[0])
			setCurrentAccount(accounts[0])
		} else {
			console.log('No authorized account found')
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

	// Checks if wallet is connected to the correct network
	const checkCorrectNetwork = async () => {
		const { ethereum } = window
		let chainId = await ethereum.request({ method: 'eth_chainId' })
		console.log('Connected to chain:' + chainId)

		const kovanChainId = '0x2a'

		const devChainId = 1337
		const localhostChainId = `0x${Number(devChainId).toString(16)}`

		if (chainId !== kovanChainId && chainId !== localhostChainId) {
			setCorrectNetwork(false)
		} else {
			setCorrectNetwork(true)
		}
	}

	// Creates transaction to mint NFT on clicking Mint Character button
	const mintCharacter = async () => {
		try {
			const { ethereum } = window

			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum)
				const signer = provider.getSigner()
				const nftContract = new ethers.Contract(
					nftContractAddress,
					NFT.abi,
					signer
				)

				let nftTx = await nftContract.createEternalNFT()
				console.log('Mining....', nftTx.hash)
				setMiningStatus(0)

				let tx = await nftTx.wait()
				setLoadingState(1)
				console.log('Mined!', tx)
				let event = tx.events[0]
				let value = event.args[2]
				let tokenId = value.toNumber()

				console.log(
					`Mined, see transaction: https://rinkeby.etherscan.io/tx/${nftTx.hash}`
				)

				getMintedNFT(tokenId)
			} else {
				console.log("Ethereum object doesn't exist!")
			}
		} catch (error) {
			console.log('Error minting character', error)
			setTxError(error.message)
		}
	}

	// Gets the minted NFT data
	const getMintedNFT = async (tokenId) => {
		try {
			const { ethereum } = window

			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum)
				const signer = provider.getSigner()
				const nftContract = new ethers.Contract(
					nftContractAddress,
					NFT.abi,
					signer
				)

				let tokenUri = await nftContract.tokenURI(tokenId)
				let data = await axios.get(tokenUri)
				let meta = data.data

				setMiningStatus(1)
				setMintedNFT(meta.image)
			} else {
				console.log("Ethereum object doesn't exist!")
			}
		} catch (error) {
			console.log(error)
			setTxError(error.message)
		}
	}

	return (
		<div className='flex flex-col items-center pt-32 bg-[#0B132B] text-[#d3d3d3] min-h-screen'>
			<Head>
				<title>Eternal NFT</title>
				<meta name='viewport' content='initial-scale=1.0, width=device-width' />
			</Head>
			<div className='trasition hover:rotate-180 hover:scale-105 transition duration-500 ease-in-out'>
				<svg
					xmlns='http://www.w3.org/2000/svg'
					width='60'
					height='60'
					fill='currentColor'
					viewBox='0 0 16 16'
				>
					<path d='M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5 8 5.961 14.154 3.5 8.186 1.113zM15 4.239l-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923l6.5 2.6zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464L7.443.184z' />
				</svg>
			</div>
			<h2 className='text-3xl font-bold mb-20 mt-12'>
				Mint your Eternal Domain NFT!
			</h2>
			{currentAccount === '' ? (
				<button
					className='text-2xl font-bold py-3 px-12 bg-black shadow-lg shadow-[#6FFFE9] rounded-lg mb-10 hover:scale-105 transition duration-500 ease-in-out'
					onClick={connectWallet}
				>
					Connect Wallet
				</button>
			) : correctNetwork ? (
				<button
					className='text-2xl font-bold py-3 px-12 bg-black shadow-lg shadow-[#6FFFE9] rounded-lg mb-10 hover:scale-105 transition duration-500 ease-in-out'
					onClick={mintMeta}
				>
					Mint NFT
				</button>
			) : (
				<div className='flex flex-col justify-center items-center mb-20 font-bold text-2xl gap-y-3'>
					<div>----------------------------------------</div>
					<div>Please connect to the Rinkeby Testnet</div>
					<div>and reload the page</div>
					<div>----------------------------------------</div>
				</div>
			)}

			<div className='text-xl font-semibold mb-20 mt-4'>
				<a
					href={`https://rinkeby.rarible.com/collection/${nftContractAddress}`}
					target='_blank'
				>
					<span className='hover:underline hover:underline-offset-8 '>
						View Collection on Rarible
					</span>
				</a>
			</div>
			{loadingState === 0 ? (
				miningStatus === 0 ? (
					txError === null ? (
						<div className='flex flex-col justify-center items-center'>
							<div className='text-lg font-bold'>
								Processing your transaction
							</div>
							<Loader
								className='flex justify-center items-center pt-12'
								type='TailSpin'
								color='#d3d3d3'
								height={40}
								width={40}
							/>
						</div>
					) : (
						<div className='text-lg text-red-600 font-semibold'>{txError}</div>
					)
				) : (
					<div></div>
				)
			) : (
				<div className='flex flex-col justify-center items-center'>
					<div className='font-semibold text-lg text-center mb-4'>
						Your Eternal Domain Character
					</div>
					<img
						src={mintedNFT}
						alt=''
						className='h-60 w-60 rounded-lg shadow-2xl shadow-[#6FFFE9] hover:scale-105 transition duration-500 ease-in-out'
					/>
				</div>
			)}
		</div>
	)
}

export default mint
