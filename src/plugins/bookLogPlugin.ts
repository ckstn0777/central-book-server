import { FastifyPluginCallback } from 'fastify'
import { BookService } from 'lib/elasticsearch/book/bookService'
import {
  ElasticSearchBookLog,
  ElasticSearchBookLogType,
} from 'lib/elasticsearch/book/elasticsearchBookLog'
import fp from 'fastify-plugin'

const callback: FastifyPluginCallback = (fastify, opts, done) => {
  const logInstance = new BookService(new ElasticSearchBookLog())

  fastify.decorate('bookLog', (data: ElasticSearchBookLogType) => {
    logInstance.log(data)
  })

  done()
}

const bookLogPlugin = fp(callback, {
  name: 'bookLogPlugin',
})

export default bookLogPlugin

declare module 'fastify' {
  interface FastifyInstance {
    bookLog(data: ElasticSearchBookLogType): void
  }
}
