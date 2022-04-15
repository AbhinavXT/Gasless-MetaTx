import '../styles/globals.css'

import Dropdown from 'react-dropdown'
import 'react-dropdown/style.css'

import { useRouter } from 'next/router'

function MyApp({ Component, pageProps }) {
  const options = [
    {
      label: 'Ethers Custom EIP712Sign',
      value: '/',
    },
    {
      label: 'Ethers Custom EIP712Sign API',
      value: '/eip712API',
    },
    {
      label: 'Ethers EIP2771 EIP712Sign',
      value: '/eip2771',
    },
    {
      label: 'Ethers EIP2771 API',
      value: '/eip2771API',
    },
  ]

  const router = useRouter()

  const changeRoute = (e) => {
    console.log(e.value)
    router.push(e.value)
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-200 pt-32 text-gray-900">
      <Dropdown
        options={options}
        onChange={(e) => changeRoute(e)}
        placeholder="Select an approach"
        className="w-96 shadow-lg"
      />

      <Component {...pageProps} />
    </div>
  )
}

export default MyApp
