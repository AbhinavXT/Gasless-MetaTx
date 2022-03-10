const { assert } = require('chai')
const sigUtil = require('eth-sig-util')

require('dotenv').config()

const NFT = require('../artifacts/contracts/EternalNFT.sol/EternalNFT.json')
const Meta = require('../artifacts/contracts/EIP712MetaTransaction.sol/EIP712MetaTransaction.json')

const publicKey = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'
const privateKey =
	'0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

let domainData

let domainType = [
	{ name: 'name', type: 'string' },
	{ name: 'version', type: 'string' },
	{ name: 'verifyingContract', type: 'address' },
	{ name: 'salt', type: 'bytes32' },
]

let metaTransactionType = [
	{ name: 'nonce', type: 'uint256' },
	{ name: 'from', type: 'address' },
	{ name: 'functionSignature', type: 'bytes' },
]

const transactionData = async (nonce) => {
	let contractInterface = new ethers.utils.Interface(NFT.abi)

	let functionSignature =
		contractInterface.encodeFunctionData('createEternalNFT')

	let message = {}
	message.nonce = parseInt(nonce)
	message.from = publicKey
	message.functionSignature = functionSignature

	//console.log('message', message)

	const dataToSign = {
		types: {
			EIP712Domain: domainType,
			MetaTransaction: metaTransactionType,
		},
		domain: domainData,
		primaryType: 'MetaTransaction',
		message: message,
	}

	//console.log('dataToSign', dataToSign)

	const signature = sigUtil.signTypedMessage(
		new Buffer.from(privateKey.substring(2, 66), 'hex'),
		{ data: dataToSign },
		'V3'
	)

	//console.log('Signature', signature)

	let { r, s, v } = getSignatureParameters(signature)

	return {
		r,
		s,
		v,
		functionSignature,
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

	// console.log('Signature', signature)
	// console.log('r', r)
	// console.log('s', s)
	// console.log('v', v)

	return {
		r: r,
		s: s,
		v: v,
	}
}

// describe('EternalNFT Contract', async () => {
// 	let nft
// 	let nftContractAddress
// 	let tokenId

// 	// Deploys the EternalNFT contract and the EternalMarket contract before each test
// 	beforeEach('Setup Contract', async () => {
// 		const EternalNFT = await ethers.getContractFactory('EternalNFT')
// 		nft = await EternalNFT.deploy()
// 		await nft.deployed()
// 		nftContractAddress = await nft.address
// 	})

// 	// Tests address for the EternalNFT contract
// 	it('Should have an address', async () => {
// 		assert.notEqual(nftContractAddress, 0x0)
// 		assert.notEqual(nftContractAddress, '')
// 		assert.notEqual(nftContractAddress, null)
// 		assert.notEqual(nftContractAddress, undefined)
// 	})

// 	// Tests name for the token of EternalNFT contract
// 	it('Should have a name', async () => {
// 		// Returns the name of the token
// 		const name = await nft.collectionName()

// 		assert.equal(name, 'EternalNFT')
// 	})

// 	// Tests symbol for the token of EternalNFT contract
// 	it('Should have a symbol', async () => {
// 		// Returns the symbol of the token
// 		const symbol = await nft.collectionSymbol()

// 		assert.equal(symbol, 'ENFT')
// 	})

// 	// Tests for NFT minting function of EternalNFT contract using tokenID of the minted NFT
// 	it('Should be able to mint NFT', async () => {
// 		// Mints a NFT
// 		let txn = await nft.createEternalNFT()
// 		let tx = await txn.wait()

// 		//console.log(tx)

// 		// tokenID of the minted NFT
// 		let event = tx.events[0]
// 		let value = event.args[2]
// 		tokenId = value.toNumber()

// 		assert.equal(tokenId, 0)

// 		// Mints another NFT
// 		txn = await nft.createEternalNFT()
// 		tx = await txn.wait()

// 		// tokenID of the minted NFT
// 		event = tx.events[0]
// 		value = event.args[2]
// 		tokenId = value.toNumber()

// 		assert.equal(tokenId, 1)
// 	})
// })

describe('EIP712MetaTransaction Contract', async () => {
	let metaTx, nonce
	let nft, nftContractAddress, wallet

	beforeEach('Setup Contracts', async () => {
		const EIP712MetaTransactionContract = await ethers.getContractFactory(
			'EIP712MetaTransaction'
		)

		metaTx = await EIP712MetaTransactionContract.deploy('EternalNFT', '1')
		await metaTx.deployed()

		//console.log(metaTx)

		const EternalNFT = await ethers.getContractFactory('EternalNFT')
		nft = await EternalNFT.deploy()
		await nft.deployed()
		nftContractAddress = await nft.address

		domainData = {
			name: 'EternalNFT',
			version: '1',
			verifyingContract: nftContractAddress,
			chainId: ethers.utils.hexZeroPad(
				ethers.BigNumber.from(1337).toHexString(),
				32
			),
		}

		console.log('domainData', domainData)

		wallet = new ethers.Wallet(privateKey)

		nonce = await nft.getNonce(publicKey)
		//console.log('nonce', nonce.toString())
	})

	it('Should be able to send transaction successfully', async () => {
		let { r, s, v, functionSignature } = await transactionData(nonce)

		let contractInterface = new ethers.utils.Interface(NFT.abi)

		//console.log(r, s, v, functionSignature)

		// let rawTx = {
		// 	to: nftContractAddress,
		// 	data: contractInterface.encodeFunctionData(
		// 		'executeMetaTransaction',
		// 		[publicKey, functionSignature, r, s, v]
		// 	),
		// 	from: publicKey,
		// }

		// await nft.sendTransaction({
		// 	value: 0,
		// 	from: publicKey,
		// 	gas: 500000,
		// 	data: rawTx,
		// })

		let tx = await nft.executeMetaTransaction(
			publicKey,
			functionSignature,
			r,
			s,
			v,
			{ gasLimit: 1000000 }
		)

		await tx.wait(1)

		console.log(tx)
		console.log(nonce)
	})
})
