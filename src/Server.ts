import fastify, { FastifyInstance } from 'fastify'
import cookie from 'fastify-cookie'
import multipart from 'fastify-multipart'
import 'dotenv/config'
import apiRoute from './routes/api'
import jwtPlugin from './plugins/jwtPlugin'
import fastifyStatic from 'fastify-static'
import path from 'path'
import fs from 'fs'
import compress from 'fastify-compress'
import corsPlugin from 'fastify-cors'
import pino from 'pino'
import loggerPlugin from './plugins/loggerPlugin'

const PORT = process.env.PORT
// const logger = pino({ level: 'info' }, pino.destination('./logs/info.log'))

class Server {
  app: FastifyInstance = fastify({ logger: true })

  constructor() {
    this.app.register(corsPlugin, {
      origin: (origin, callback) => {
        if (!origin) {
          return callback(null, true)
        }
        const host = origin.split('://')[1]
        const allowedHost = [
          'central-book.ckstn0777.com',
          'central-book.ckstn0777.com',
          'project-intern03.wjthinkbig.com',
          'localhost:3000',
        ]
        const allowed = allowedHost.includes(host)
        callback(null, allowed)
      },
      credentials: true,
    })
    this.app.register(multipart, { addToBody: true })
    this.app.register(cookie)
    this.app.register(jwtPlugin)
    this.app.register(compress)
    this.app.register(fastifyStatic, {
      root: path.join(__dirname, './build'),
      prefix: '/',
    })

    this.app.get('/', (request, reply) => {
      const stream = fs.createReadStream(
        path.join(__dirname, './build/index.html')
      )
      reply.type('text/html').send(stream)
    })

    this.app.register(apiRoute, { prefix: '/api' })

    this.app.setNotFoundHandler((request, reply) => {
      const stream = fs.createReadStream(
        path.join(__dirname, './build/index.html')
      )
      reply.type('text/html').send(stream)
    })
  }

  async start() {
    try {
      await this.app.listen(PORT || 8200)
    } catch (err) {
      this.app.log.error(err)
      process.exit(1)
    }
  }
}

export default Server
