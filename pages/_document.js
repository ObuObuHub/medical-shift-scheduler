import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="ro">
      <Head>
        <meta name="description" content="DeGarda - Aplicație pentru Programarea Gărzilor Medicale" />
        <meta name="keywords" content="gărzi medicale, programare, spital, medici, DeGarda" />
        <meta name="author" content="DeGarda Team" />
        <meta name="theme-color" content="#2563eb" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}