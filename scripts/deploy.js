const main = async () => {
	const nftContractFactory = await ethers.getContractFactory("EternalNFT")
	const nftContract = await nftContractFactory.deploy(
		"0xF82986F574803dfFd9609BE8b9c7B92f63a1410E"
	)
	await nftContract.deployed()
	console.log("Contract deployed to:", nftContract.address)
}

const runMain = async () => {
	try {
		await main()
		process.exit(0)
	} catch (error) {
		console.log(error)
		process.exit(1)
	}
}

runMain()
