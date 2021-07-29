import category from 'lib/catetoryList'

export type InterparkBook = {
  description: string
  coverLargeUrl: string
  priceStandard: number
  categoryId: keyof typeof category
  pubDate: string
  author: string
  link: string
}
