const { assert } = require("chai")
const sigUtil = require("eth-sig-util")

require("dotenv").config()

const EIP712MetaTransaction = require("../artifacts/contracts/EIP712MetaTransaction.sol/EIP712MetaTransaction.json")
const NFT = require("../artifacts/contracts/EternalNFT.sol/EternalNFT.json")

let wallet = new ethers.Wallet.createRandom()
let publicKey = wallet.address
let privateKey = wallet._signingKey().privateKey

const domainType = [
	{ name: "name", type: "string" },
	{ name: "version", type: "string" },
	{ name: "verifyingContract", type: "address" },
	{ name: "salt", type: "bytes32" },
]

const metaTransactionType = [
	{ name: "nonce", type: "uint256" },
	{ name: "from", type: "address" },
	{ name: "functionSignature", type: "bytes" },
]

let domainData

const getTXData = async (nonce, functionSignature) => {
	let message = {
		nonce: parseInt(nonce),
		from: publicKey,
		functionSignature: functionSignature,
	}

	let dataToSign = {
		types: {
			EIP712Domain: domainType,
			MetaTransaction: metaTransactionType,
		},
		domain: domainData,
		primaryType: "MetaTransaction",
		message: message,
	}

	let signature = sigUtil.signTypedData(
		new Buffer.from(privateKey.substring(2, 66), "hex"),
		{ data: dataToSign },
		"V3"
	)

	let r = signature.slice(0, 66)
	let s = "0x".concat(signature.slice(66, 130))
	let v = "0x".concat(signature.slice(130, 132))
	v = ethers.BigNumber.from(v).toNumber()
	if (![27, 28].includes(v)) v += 27

	return {
		r,
		s,
		v,
	}
}

describe("NFT Contract", async () => {
	let nftContractFactory,
		nftContract,
		metaTransactionContractFactory,
		metaTransactionContract,
		nftContractInterface

	before("before test", async () => {
		nftContractFactory = await ethers.getContractFactory("EternalNFT")
		nftContract = await nftContractFactory.deploy()
		await nftContract.deployed()

		nftContractInterface = new ethers.utils.Interface(NFT.abi)

		metaTransactionContractFactory = await ethers.getContractFactory(
			"EIP712MetaTransaction"
		)
		metaTransactionContract = await metaTransactionContractFactory.deploy(
			"EternalNFT",
			"1"
		)
		await metaTransactionContract.deployed()

		const [owner, _] = await ethers.getSigners()

		domainData = {
			name: "EternalNFT",
			version: "1",
			verifyingContract: nftContract.address,
			salt: ethers.utils.hexZeroPad(
				ethers.BigNumber.from(1337).toHexString(),
				32
			),
		}
	})

	it("Should be able to send transaction successfully", async () => {
		let nonce = await nftContract.getNonce(publicKey)

		let functionSignature =
			nftContractInterface.encodeFunctionData("createEternalNFT")

		const { r, s, v } = await getTXData(nonce, functionSignature)

		let tx = await nftContract.executeMetaTransaction(
			publicKey,
			functionSignature,
			r,
			s,
			v
		)

		const txData = await tx.wait(1)

		console.log("Transaction hash : ", tx.hash)

		let newNonce = await nftContract.getNonce(publicKey)

		assert.isTrue(newNonce.toNumber() == nonce + 1, "Nonce not incremented")
	})
})
