import axios from 'axios'
import { FastifyPluginCallback } from 'fastify'
import 'dotenv/config'
import { xml2json } from 'xml-js'
import { SearchBookResult } from '../../../types/searchBook'
import { BookSearchQuerystring } from '../../../types/book/BookSearch/querystring'
import { BookInfoQuerystring } from '../../../types/book/BookInfo/querystring'
import BookSearchQuerystringSchema from '../../../schema/book/BookSearch/querystring.json'
import BookInfoQuerystringSchema from '../../../schema/book/BookInfo/querystring.json'
import category from '../../../lib/catetoryList'
import { InterparkBook } from '../../../types/interparkBook'
import { getConnection, getManager, getRepository } from 'typeorm'
import { Book } from '../../../entity/Book'
import { BookReviewBody } from '../../../types/book/BookReview/body'
import { Review } from '../../../entity/Review'
import bookLogPlugin from 'plugins/bookLogPlugin'
import userPlugin from 'plugins/userPlugin'
import { Alarm } from 'entity/Alarm'

export function parse(str: string) {
  // if(!/^(\d){8}$/.test(str)) return "invalid date";
  const y = +str.substr(0, 4)
  const m = Number(str.substr(4, 2)) - 1
  const d = +str.substr(6, 2)
  return new Date(y, m, d)
}

const bookRoute: FastifyPluginCallback = (fastify, opts, done) => {
  fastify.register(bookLogPlugin)
  // fastify.register(userPlugin)
  /**
   * GET api/book/?book_id=?
   * 도서 상세보기 페이지 데이터
   */
  fastify.get<{ Querystring: { book_id: number } }>(
    '/',
    async (request, reply) => {
      const { book_id } = request.query

      try {
        const bookEntity = await getRepository(Book)
          .createQueryBuilder('book')
          .where('book.id = :id', { id: book_id })
        const book = await bookEntity.getOne()

        const reviewEntity = await bookEntity
          .select('review')
          .leftJoinAndSelect('book.reviews', 'review')
        const review = await reviewEntity
          .select([
            'review.id',
            'review.review',
            'review.ratings',
            'review.created_at',
          ])
          .getRawMany()

        const user = await reviewEntity
          .select(['user.username', 'user.photo_url', 'user.display_name'])
          .leftJoin('review.bookshelf_id', 'shelve')
          .leftJoin('shelve.user', 'user')
          .getRawMany()

        reply.send({ book, review, user })
      } catch (e) {
        throw new Error(e)
      }
    }
  )

  /**
   * POST api/book/
   * 도서 + 리뷰 저장
   */
  fastify.post<{ Body: BookReviewBody }>('/', async (request, reply) => {
    const { bookShelveId, seq_num, ratings, review, bookInfo } = request.body
    const userDate = request.userData
    try {
      const exists = await getRepository(Book).findOne({
        isbn: bookInfo.isbn,
      })

      let bookId = 0
      const manager = getManager()

      if (!exists) {
        const book = new Book()

        book.title = bookInfo.title
        book.author = bookInfo.author
        book.description = bookInfo.description
        book.image_url = bookInfo.image_url
        book.price = bookInfo.price
        book.isbn = bookInfo.isbn
        book.pub_date = parse(bookInfo.pub_date)
        book.publisher = bookInfo.publisher
        book.category = bookInfo.category
        book.single_author = bookInfo.author.split('(')[0].split(',')[0]
        book.link = bookInfo.link

        const result = await manager.save(book)
        bookId = result.id
      } else {
        bookId = exists.id
      }

      const reviewEntity = new Review()
      reviewEntity.bookInfo = bookId
      reviewEntity.bookshelf_id = bookShelveId
      reviewEntity.ratings = ratings
      reviewEntity.review = review
      reviewEntity.seq_num = seq_num
      const reviewResult = await manager.save(reviewEntity)

      const result = await getRepository(Review).findOne({
        where: {
          id: reviewResult.id,
        },
        relations: ['bookInfo'],
      })

      fastify.bookLog({
        username: userDate?.username,
        gender: userDate?.gender,
        age: userDate?.age,
        book: {
          title: bookInfo.title,
          author: bookInfo.author,
          publisher: bookInfo.publisher,
          catgeory: bookInfo.category,
          price: bookInfo.price,
        },
      })
      await Alarm.createAlarm(userDate!.id, bookId)
      reply.send(result)
    } catch (e) {
      throw new Error(e)
    }
  })

  /**
   * DELETE api/book/
   * 리뷰 삭제
   */
  fastify.delete<{ Querystring: { review_id: number } }>(
    '/',
    async (request, reply) => {
      const { review_id } = request.query

      try {
        const userId = await getRepository(Review)
          .createQueryBuilder('review')
          .select('user.id')
          .where('review.id = :id', { id: review_id })
          .leftJoin('review.bookshelf_id', 'shelve')
          .leftJoin('shelve.user', 'user')
          .getRawOne()

        if (!request.user?.id || userId.user_id !== request.user.id) {
          reply.status(401)
          reply.send('Unauthorized Error')
          return
        }

        await getConnection()
          .createQueryBuilder()
          .delete()
          .from(Review)
          .where('id = :id', { id: review_id })
          .execute()

        reply.send('Delete Success')
      } catch (e) {
        throw new Error(e)
      }
    }
  )

  /**
   * GET api/book/search/?keyword=
   * (국립중앙도서관 소장자료) 도서 검색
   */
  fastify.get<{ Querystring: BookSearchQuerystring }>(
    '/search',
    {
      schema: {
        querystring: BookSearchQuerystringSchema,
      },
    },
    async (request, reply) => {
      const { keyword } = request.query

      const response = await axios.get(
        'http://nl.go.kr/NL/search/openApi/search.do',
        {
          params: {
            key: process.env.SERVICE_KEY,
            kwd: keyword,
            category: '도서',
            systemType: '오프라인자료',
            apiType: 'json',
          },
        }
      )

      if (!response.data) {
        // TODO:
        reply.send('No Search Result')
        return
      }

      const result: SearchBookResult[] = response.data.result
      const resultParse = result
        .filter(data => data.isbn.split(' ')[0] !== '')
        .map(data => ({
          id: Number(data.id),
          title: data.titleInfo
            .replace(/<span class="searching_txt">/gi, '')
            .replace(/<\/span>/gi, ''),
          author: data.authorInfo
            .replace(/<span class="searching_txt">/gi, '')
            .replace(/<\/span>/gi, ''),
          pub_date: data.pubYearInfo.slice(0, 4),
          publisher: data.pubInfo
            .replace(/<span class="searching_txt">/gi, '')
            .replace(/<\/span>/gi, ''),
          category: data.kdcName1s,
          isbn: data.isbn.split(' ')[0],
          // image_url: `https://cover.nl.go.kr/kolis/${data.pubYearInfo.slice(
          //   0,
          //   4
          // )}/${data.controlNo}.jpg`,
        }))

      reply.send(resultParse)
    }
  )

  /**
   * GET api/book/search/detail/:bookId
   * 도서 상세검색(interpark api)
   */
  fastify.get<{ Querystring: BookInfoQuerystring }>(
    '/search/detail',
    {
      schema: {
        querystring: BookInfoQuerystringSchema,
      },
    },
    async (request, reply) => {
      const { isbn, title } = request.query
      let response = await axios.get(
        'http://book.interpark.com/api/search.api',
        {
          params: {
            key: process.env.INTERPARK_API,
            query: isbn,
            queryType: 'isbn',
            output: 'json',
          },
        }
      )

      if (response.data.totalResults === 0) {
        response = await axios.get('http://book.interpark.com/api/search.api', {
          params: {
            key: process.env.INTERPARK_API,
            query: title.split(' :')[0].split('.')[0],
            output: 'json',
          },
        })

        if (response.data.totalResults === 0) {
          reply.send({ message: 'Total Result 0' })
          return
        }
      }

      const bookInfo: InterparkBook = response.data.item[0]
      const result = {
        description: bookInfo.description,
        image_url: 'https://' + bookInfo.coverLargeUrl.slice(7),
        price: bookInfo.priceStandard,
        category: category[bookInfo.categoryId],
        pub_date: bookInfo.pubDate,
        author: bookInfo.author,
        link: bookInfo.link,
      }
      reply.send(result)
    }
  )

  /**
   * GET api/book/saseo
   * 사서 추천도서
   */
  fastify.get<{ Querystring: { category: number; current_page: number } }>(
    '/saseo',
    async (request, reply) => {
      // const totalCnt = 1829
      const { category, current_page } = request.query

      const result = await axios.get<string>(
        'http://nl.go.kr/NL/search/openApi/saseoApi.do',
        {
          params: {
            key: process.env.SERVICE_KEY,
            startRowNumApi: 14 * (current_page - 1) + 1,
            endRowNumApi: 14 * current_page,
            drCode: Number(category) !== 0 ? category : '',
          },
        }
      )
      // console.log(result)

      const jsonResult = JSON.parse(
        xml2json(result.data, { compact: true, spaces: 4 })
      ).channel

      const totalCnt = jsonResult.totalCount._text

      const parseResult = jsonResult.list.map(({ item }: any) => ({
        title: item.recomtitle._text,
        author: item.recomauthor._text,
        publisher: item.recompublisher._text,
        content: item.recomcontens._text,
        recommand: item.recommokcha._text,
        image_url: 'https://' + item.recomfilepath._text.slice(7),
      }))

      return reply.send({ totalCnt, SeseoBook: parseResult })
    }
  )

  /**
   * GET /api/book/popular?page_num
   * 인기도서 불러오기
   */
  fastify.get<{ Querystring: { page_num: number } }>(
    '/popular',
    async (request, reply) => {
      const { page_num } = request.query

      try {
        const result = await getRepository(Review)
          .createQueryBuilder('review')
          .select(['book.id', 'book.title', 'book.image_url'])
          .addSelect('COUNT(review.book_id)', 'count')
          .where('DATE(review.created_at) > (NOW() - INTERVAL 14 DAY) ')
          .groupBy('review.book_id')
          .orderBy('count', 'DESC')
          .leftJoin('review.bookInfo', 'book')
          .offset(10 * (page_num - 1))
          .limit(10)
          .getRawMany()

        reply.send(result)
      } catch (e) {
        throw new Error(e)
      }
    }
  )

  /**
   * GET /api/book/recently?page_num
   * 최신 도서(리뷰) 불러오기
   */
  fastify.get<{ Querystring: { page_num: number } }>(
    '/recently',
    async (request, reply) => {
      const { page_num } = request.query

      try {
        const result = await getRepository(Review)
          .createQueryBuilder('review')
          .select([
            'book.id',
            'book.title',
            'book.image_url',
            'review.review',
            'user.username',
            'user.photo_url',
          ])
          .where('length(review.review) > 50')
          .orderBy('review.created_at', 'DESC')
          .leftJoin('review.bookInfo', 'book')
          .leftJoin('review.bookshelf_id', 'shelve')
          .leftJoin('shelve.user', 'user')
          .offset(2 * (page_num - 1))
          .limit(2)
          .getRawMany()

        reply.send(result)
      } catch (e) {
        throw new Error(e)
      }
    }
  )

  done()
}

export default bookRoute
