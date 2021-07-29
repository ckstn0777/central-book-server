import {
  ElasticSearchAPILog,
  ElasticSearchAPILogType,
} from './elasticsearchAPILog'
import {
  ElasticSearchErrorLog,
  ElasticSearchErrorLogType,
} from './elasticsearchAPIError'

export class LogService {
  constructor(
    private elasticSearchErrorLog: ElasticSearchErrorLog,
    private elasticSearchAPILog: ElasticSearchAPILog
  ) {}

  public log(data: ElasticSearchAPILogType) {
    this.elasticSearchAPILog.putLog(data)
  }

  public error(data: ElasticSearchErrorLogType) {
    this.elasticSearchErrorLog.putLog(data)
  }
}
