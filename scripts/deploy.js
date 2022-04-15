const main = async () => {
	const nftContractFactory = await ethers.getContractFactory("EternalNFT")
	const nftContract = await nftContractFactory.deploy()
	await nftContract.deployed()
	console.log("Custom approach Contract deployed to:", nftContract.address)

	const nftContractFactory2771 = await ethers.getContractFactory(
		"EternalNFT2771"
	)
	const nftContract2771 = await nftContractFactory2771.deploy(
		"0xF82986F574803dfFd9609BE8b9c7B92f63a1410E"
	)
	await nftContract2771.deployed()
	console.log(
		"EIP2771 approach Contract deployed to:",
		nftContract2771.address
	)
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
