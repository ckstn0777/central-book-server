import { Client, RequestParams } from '@elastic/elasticsearch'
import 'dotenv/config'

const client = new Client({
  cloud: {
    id: process.env.ELASTICSEARCH_ID!,
  },
  auth: {
    username: 'elastic',
    password: process.env.ELASTICSEARCH_PW!,
  },
})

// const client = new Client({
//   cloud: {

//     id: 'i-o-optimized-deployment:ZWFzdHVzMi5henVyZS5lbGFzdGljLWNsb3VkLmNvbTo5MjQzJDFlYzFlMGY5ZmMzYjQxY2JhYmQ5MTEwNDUyYzczYjM5JDg2ZWMzYTRmYjBhYzQ2N2JiNjUxMTY3YjM4ZGZjM2Uz',
//   },
//   auth: {
//     username: 'elastic',
//     password: 'b3blRHOYL80a8i69PAIVmtaZ',
//   },
// })

export abstract class ElasticSearch<T> {
  protected readonly INDEX_NAME: string

  constructor(indexName: string) {
    this.INDEX_NAME = indexName
  }

  protected async requestElasticSearch(bodyData: RequestParams.Index) {
    await client.index(bodyData)
  }

  public abstract putLog(log: T): Promise<void>
}
