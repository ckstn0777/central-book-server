import SearchEngine from './Search'

const searchEngine = new SearchEngine()
const result = searchEngine.search('IT 엔지니어를 위한 네트워크')
console.log(result.then(console.log).catch(console.log))
