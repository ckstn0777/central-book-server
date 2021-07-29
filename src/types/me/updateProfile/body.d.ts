export type UpdateProfileBody = {
  type: string
  display_name: string
  information: string
} & {
  type: string
  photo_url: string
} & {
  type: string
  recommend: string
} & {
  type: string
  bookInfo: {
    title: string
    author: string
    description: string
    image_url: string
    price: number
    category: string
    publisher: string
    pub_date: string
    isbn: string
    [k: string]: unknown
  }
}
