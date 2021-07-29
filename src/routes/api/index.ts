import { FastifyPluginCallback } from 'fastify'
import authRoute from './auth'
import bookRoute from './book'
import followRoute from './follow'
import meRoute from './me'
import shelveRoute from './shelve'

const apiRoute: FastifyPluginCallback = (fastify, opts, done) => {
  fastify.register(authRoute, { prefix: '/auth' })
  fastify.register(meRoute, { prefix: '/me' })
  fastify.register(bookRoute, { prefix: '/book' })
  fastify.register(shelveRoute, { prefix: '/shelve' })
  fastify.register(followRoute, { prefix: '/follow' })

  done()
}

export default apiRoute
