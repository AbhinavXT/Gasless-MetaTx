import Head from 'next/head'

import { useState } from 'react'

import Dropdown from 'react-dropdown'
import 'react-dropdown/style.css'

import EIP712 from '../components/EIP712'
import EIP712API from '../components/EIP712API'
import EIP2771 from '../components/EIP2771'
import EIP2771API from '../components/EIP2771API'

import { WalletProviderProvider } from '../context/WalletProvider'
import Intro from '../components/Intro'

const mint = () => {
  const [val, setVal] = useState(0)

  const options = [
    {
      label: 'Ethers Custom EIP712Sign',
      value: 1,
    },
    {
      label: 'Ethers Custom EIP712Sign API',
      value: 2,
    },
    {
      label: 'Ethers EIP2771 EIP712Sign',
      value: 3,
    },
    {
      label: 'Ethers EIP2771 API',
      value: 4,
    },
  ]

  const changeApproach = (e) => {
    setVal(e.value)
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-200 pt-12 text-gray-900">
      <Head>
        <title>Gasless NFT</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <div className="mt-20">
        <Dropdown
          options={options}
          onChange={(e) => changeApproach(e)}
          placeholder="Select an Approach"
          className="w-96 shadow-lg"
        />
      </div>
      <WalletProviderProvider>
        <div>
          {val == 0 && <Intro />}
          {val == 1 && <EIP712 />}
          {val == 2 && <EIP712API />}
          {val == 3 && <EIP2771 />}
          {val == 4 && <EIP2771API />}
        </div>
      </WalletProviderProvider>
    </div>
  )
}

export default mint
