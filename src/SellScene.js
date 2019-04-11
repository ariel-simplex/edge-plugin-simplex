import * as API from './api'

import React, { Component } from 'react'
import { convertToMillionsUnits, formatAmount, retrieveAddress } from './utils'

import BuySellForm from './BuySellForm'
import PropTypes from 'prop-types'

const formatResponse = async (response, wallet, valueType, value, cryptoCode, fiatCode) => {
  const {res, err} = response
  if (err) {
    throw new Error(err)
  }
  if (!res.quote_id) {
    throw new Error('Invalid response')
  }
  const address = await retrieveAddress(wallet.id, wallet.currencyCode)
  let [fiatAmount, cryptoAmount] = [0, 0]
  if (valueType === 'fiat') {
    fiatAmount = value
    cryptoAmount = value / res.rate
  } else {
    cryptoAmount = value
    fiatAmount = value * res.rate
  }
  const rate = res.rate
  const quote = {
    quote_id: res.quote_id,
    rate: res.rate,
    fiat_amount: fiatAmount,
    fiat_currency: fiatCode,
    crypto_currency: cryptoCode,
    crypto_amount: cryptoAmount,
    refund_address: address
  }
  console.log(quote)
  return {quote, rate}
}

class SellScene extends Component {
  constructor (props) {
    super(props)

    this.wallets = []
  }

  requestFiatQuote = async (value, cryptoCode, fiatCode, selectedWallet) => {
    console.log(value + ' ' + cryptoCode + ' ' + fiatCode)
    const data = await API.requestSellQuote({
      base_currency: cryptoCode, base_amount: convertToMillionsUnits(value), quote_currency: fiatCode
    })
    const r = await data.json()
    return formatResponse(r, selectedWallet, 'crypto', value, cryptoCode, fiatCode)
  }

  requestCryptoQuote = async (value, cryptoCode, fiatCode, selectedWallet) => {
    const data = await API.requestSellQuote({
      base_currency: cryptoCode, quote_amount: convertToMillionsUnits(value), quote_currency: fiatCode
    })
    const r = await data.json()
    return formatResponse(r, selectedWallet, 'fiat', value, cryptoCode, fiatCode)
  }

  handleAccept = async (uaid, quote) => {
    const data = await API.initiateSell(quote, quote.refund_address)
    const transaction = await data.json()
    if (transaction.err) {
      throw new Error(transaction.err)
    }
    window.location.href = transaction.res.txn_url
  }

  render () {
    return (
      <BuySellForm
        history={this.props.history}
        supported_fiat_currencies={API.SUPPORTED_SELL_FIAT_CURRENCIES}
        supported_digital_currencies={API.SUPPORTED_SELL_DIGITAL_CURRENCIES}
        wallets={this.wallets}
        requestFiatQuote={this.requestFiatQuote}
        requestCryptoQuote={this.requestCryptoQuote}
        handleAccept={this.handleAccept}
        dialogMessage={(quote) => {
          return `Are you sure you want to sell ${formatAmount(quote.crypto_amount, quote.crypto_currency)}?`
        }}
      />
    )
  }
}

SellScene.propTypes = {
  history: PropTypes.object
}

export default SellScene
