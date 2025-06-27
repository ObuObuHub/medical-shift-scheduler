import '../styles/globals.css'
import '../styles/mobile.css'
import Head from 'next/head'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>DeGarda - Programare Gărzi Medicale</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}