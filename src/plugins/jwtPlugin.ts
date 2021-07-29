import { FastifyPluginCallback } from 'fastify'
import fp from 'fastify-plugin'
import { decodeToken } from '../lib/token/jwt'

const callback: FastifyPluginCallback = (fastify, opts, done) => {
  fastify.decorateRequest('user', null)
  fastify.addHook('preHandler', async (request, reply) => {
    const accessToken: string | undefined = request.cookies.access_token
    try {
      const decoded = await decodeToken<UserTokenDecoded>(accessToken)
      request.user = {
        id: decoded.user,
      }
    } catch (e) {}
  })

  done()
}

const jwtPlugin = fp(callback, {
  name: 'jwtPlugin',
})

export default jwtPlugin

type UserTokenDecoded = {
  subject: string
  user: number
  iat: number
  exp: number
}

declare module 'fastify' {
  interface FastifyRequest {
    user: null | { id: number }
  }
}
