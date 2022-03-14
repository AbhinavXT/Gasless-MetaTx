const { assert } = require("chai")
const { ethers } = require("ethers")
const sigUtil = require("@metamask/eth-sig-util")

require("dotenv").config()

const EIP712MetaTransactionABI =
	require("../artifacts/contracts/EIP712MetaTransaction.sol/EIP712MetaTransaction.json").abi
const NFTabi =
	require("../artifacts/contracts/EternalNFT.sol/EternalNFT.json").abi

const nftContractAddress = "0x372d3e535fb9FCABF44df1fEBeb7d8749e189512"

const wallet = new ethers.Wallet.createRandom()

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

const privateKey = wallet._signingKey().privateKey
const publicKey = wallet.address

const nftContract = new ethers.Contract(nftContractAddress, NFTabi, wallet)
nftContract.connect(process.env.ALCHEMY_KOVAN_URL)

const contractInterface = new ethers.utils.Interface(NFTabi)

const privateKeyTransaction = async () => {
	const nonce = await nftContract.getNonce(publicKey)
}

privateKeyTransaction()
