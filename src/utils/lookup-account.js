const Stripe = require('stripe')
const debug = require('debug')('util.lookup-account')

const verifyJwt = require('./verify-jwt')

let stripe = Stripe(process.env.STRIPE_KEY)


const LookupAccount = async (jwt)=>{
  debug('lookup')

  const verification = await verifyJwt(jwt)

  const findByEmail = await stripe.customers.list({ email: verification.email })
  let customerStripeId = null
  let stripeSourceId = null

  if(findByEmail.data && findByEmail.data.length > 0){

    customerStripeId = findByEmail.data[0].id
    debug('found stripe user', customerStripeId)

    //read source id

  } else {

    debug('no stripe user')

  }

  return {
    isValid: verification.isValid,
    userName: verification.userName,
    clientId: verification.clientId,
    email: verification.email,
    emailVerified: verification.emailVerified,
    customerId: customerStripeId,
    sourceId: stripeSourceId
  }
}



module.exports = LookupAccount