const Joi = require('@hapi/joi')
const Hoek = require('@hapi/hoek')
const debug = require('debug')('create-customer')
const Stripe = require('stripe')
const moment = require('moment')

const verifyJwt = require('../utils/verify-jwt')
const LookupAccount = require('../utils/lookup-account')

let stripe = Stripe(process.env.STRIPE_KEY)

const CustomerDescription = process.env.FUND_TITLE || 'Online'

const schema = Joi.object().keys({
  jwt: Joi.string().required(),
  customer: {
    name: Joi.string().required(),      //!required
    email: Joi.string().required(),     //!required
    phone: Joi.string().allow(''),
    shipping: {
      name: Joi.string().required(),    //!required by stripe
      phone: Joi.string().allow(''),
      address: {
        line1: Joi.string().required(), //! required by stripe
        line2: Joi.string().allow(''),
        city: Joi.string().allow(''),
        state: Joi.string().allow(''),
        postal_code: Joi.string().allow(''),
        country: Joi.string().allow(''),
      }
    }
  }
});

module.exports.create_customer = async (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false; 

  debug('create_customer')

  debug(event.body)

  try{

    const valid = Joi.attempt(
      JSON.parse(event.body),
      schema
    )

    debug('input', valid)

    const verification = await verifyJwt(valid.jwt)

    debug('verified jwt', verification)
    
    const account = await LookupAccount(valid.jwt)

    debug('lookup account', account)

    if(!account.emailVerified){  
      debug('email not verified')
      throw new Error('not verified')
    }

    if(!account.customerId){
      debug('creating user', valid.customer.email)

      const customerData = await stripe.customers.create({
        ...valid.customer,
        description: CustomerDescription + ' Customer',
        address: Hoek.reach(valid.customer, 'shipping.address')
      })

      account.customerId = customerData.id

      debug('created user', valid.customer.email, account.customerId)

    } else{

      debug('found stripe user', account.customerId, account.email)

    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN, // Required for CORS support to work
        'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
      },
      body: JSON.stringify(account)
    }

  } catch (e) {
    debug('ERROR', e)
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN, // Required for CORS support to work
        'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
      },
      body: JSON.stringify({
        error: 'There was an error while creating the customer. Please check that all the fields are correct and you have. Check for verification emails.',
      }),
    }

  }
}

