import axios from 'axios'
import 'dotenv/config'

const serviceKey = process.env.SERVICE_KEY

class SearchEngine {
  // baseUrl: string

  constructor() {
    // this.baseUrl = `https://www.nl.go.kr/NL/search/openApi/search.do`
    // this.baseUrl = `https://www.nl.go.kr/NL/search/openApi/search.do?key=${serviceKey}`
  }

  async search(keyword: string) {
    const response = await axios.get(
      `?key=${serviceKey}&kwd=${encodeURIComponent(keyword)}&apiType=json`,
      {
        baseURL: 'http://www.nl.go.kr/NL/search/openApi/search.do',
      }
    )

    return response.data
  }
}

export default SearchEngine
