import { RequestParams } from '@elastic/elasticsearch'
import { ElasticSearch } from '..'

const INDEX_NAME = 'server_api_logs'

export type ElasticSearchAPILogType = {
  apiName: string
  method: string
  url: string
  header: Object
}

export class ElasticSearchAPILog extends ElasticSearch<ElasticSearchAPILogType> {
  constructor() {
    super(INDEX_NAME)
  }

  public async putLog(log: ElasticSearchAPILogType): Promise<void> {
    try {
      const bodyData: RequestParams.Index = {
        index: this.INDEX_NAME,
        body: {
          ...log,
          timestamp: new Date(),
        },
      }

      await this.requestElasticSearch(bodyData)
      console.log('[SUCCESS]: ElasticSearchAPILog putLog method')
    } catch (error) {
      console.log(
        `[ERROR]:  ElasticSearchAPILog putLog method, error-message=${error.message}`
      )
      return
    }
  }
}
