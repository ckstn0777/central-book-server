import {
  ElasticSearchBookLog,
  ElasticSearchBookLogType,
} from './elasticsearchBookLog'

export class BookService {
  constructor(private elasticSearchBookLog: ElasticSearchBookLog) {}

  public log(data: ElasticSearchBookLogType) {
    this.elasticSearchBookLog.putLog(data)
  }
}
