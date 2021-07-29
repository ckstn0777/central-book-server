import { FastifyPluginCallback } from 'fastify'
import fp from 'fastify-plugin'
import {
  ElasticSearchErrorLog,
  ElasticSearchErrorLogType,
} from 'lib/elasticsearch/logger/elasticsearchAPIError'
import {
  ElasticSearchAPILog,
  ElasticSearchAPILogType,
} from 'lib/elasticsearch/logger/elasticsearchAPILog'
import { LogService } from 'lib/elasticsearch/logger/logService'

const callback: FastifyPluginCallback = (fastify, opts, done) => {
  const logInstance = new LogService(
    new ElasticSearchErrorLog(),
    new ElasticSearchAPILog()
  )

  fastify.decorate(
    'logger',
    (
      type: string,
      data: ElasticSearchAPILogType & ElasticSearchErrorLogType
    ) => {
      type === 'log' ? logInstance.log(data) : logInstance.error(data)
    }
  )

  fastify.addHook('onRequest', async (request, reply, done) => {
    fastify.logger('log', {
      method: request.method,
      url: request.url,
      header: request.headers,
      apiName: `[${request.method}]-${request.url}`,
      //   header: {
      //       "ip": request.ip,
      //     "accept-language": request.headers['accept-language'],
      //     "referer": request.headers.referer,
      //     "user-agent": request.headers['user-agent']
      //   },
    })
  })

  fastify.addHook('onError', async (request, reply, error) => {
    fastify.logger('error', {
      method: request.method,
      url: request.url,
      header: request.headers,
      apiName: `[${request.method}]-${request.url}`,
      errorCode: error.statusCode,
      errorName: error.name,
      errorMessage: error.message,
    })
  })

  done()
}

const loggerPlugin = fp(callback, {
  name: 'loggerPlugin',
})

export default loggerPlugin

declare module 'fastify' {
  interface FastifyInstance {
    logger(
      type: string,
      data: ElasticSearchAPILogType | ElasticSearchErrorLogType
    ): void
  }
}
