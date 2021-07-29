import { RequestParams } from '@elastic/elasticsearch'
import krDate from 'lib/krDate'
import { ElasticSearch } from '..'

const INDEX_NAME = 'book_keep_logs-temp'

type BookType = {
  title: string
  author: string
  publisher: string
  catgeory: string
  price: number
}

export type ElasticSearchBookLogType = {
  username: string | undefined
  gender: string | undefined
  age: number | undefined
  book: BookType
}

export class ElasticSearchBookLog extends ElasticSearch<ElasticSearchBookLogType> {
  constructor() {
    super(INDEX_NAME)
  }

  public async putLog(log: ElasticSearchBookLogType): Promise<void> {
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
      console.log(error)
      console.log(
        `[ERROR]:  ElasticSearchAPILog putLog method, error-message=${error.message}`
      )
      return
    }
  }
}
