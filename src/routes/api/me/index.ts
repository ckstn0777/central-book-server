import { Book } from '../../../entity/Book'
import { BookShelf } from '../../../entity/BookShelf'
import { FavoriteBook } from '../../../entity/FavoriteBook'
import { Review } from '../../../entity/Review'
import { User } from '../../../entity/User'
import { FastifyPluginCallback } from 'fastify'
import upload from '../../../lib/aws/upload'
import path from 'path'
import sharp from 'sharp'
import { getConnection, getManager, getRepository } from 'typeorm'
import { UpdateProfileBody } from '../../../types/me/updateProfile/body'
import os from 'os'
import fs from 'fs'
import { parse } from '../book'
import CustomError from 'lib/customError'
import Joi from 'joi'
import { Follow } from 'entity/Follow'
import { Alarm } from 'entity/Alarm'

const meRoute: FastifyPluginCallback = (fastify, opts, done) => {
  // fastify.register(userPlugin)

  /**
   * GET /api/me?username=?
   * 프로필 데이터 불러오기
   */
  fastify.get<{ Querystring: { username: string } }>(
    '/',
    async (request, reply) => {
      const { username } = request.query

      try {
        const user = await getRepository(User)
          .createQueryBuilder('user')
          .select([
            'user.id',
            'user.display_name',
            'user.photo_url',
            'user.information',
          ])
          .where('user.username = :username', { username: username.slice(1) })
          .getOne()

        if (!user) {
          return
        }
        // console.log('wefwefewf', Alarm.createAlarm(user.id, 88))
        // 나를 팔로우하고 있는 아이디
        const follower = await Follow.getFollower(user.id)
        // 내가 팔로잉하고 있는 아이디
        const following = await Follow.getFollowing(user.id)

        const shelvesId = await getRepository(BookShelf)
          .createQueryBuilder('shelve')
          .select('shelve.id')
          .where('shelve.user_id = :id', { id: user.id })
          .getMany()

        const bookCnt = await getRepository(Review)
          .createQueryBuilder('review')
          .select('review.id')
          .where('review.bookshelf_id IN (:id)', {
            id: shelvesId.length !== 0 ? shelvesId.map(({ id }) => id) : -1,
          })
          .getCount()

        const favoriteBookCategory = await getRepository(Review)
          .createQueryBuilder('review')
          .where('review.bookshelf_id IN (:id)', {
            id: shelvesId.length !== 0 ? shelvesId.map(({ id }) => id) : -1,
          })
          .leftJoinAndSelect('review.bookInfo', 'book')
          .select(['book.category'])
          .addSelect('MAX(book.category)', 'max')
          .addSelect('COUNT(book.category)', 'count')
          .groupBy('book.category')
          .orderBy('count', 'DESC')
          .getRawOne()

        const favoriteBook = await getRepository(FavoriteBook)
          .createQueryBuilder('favorite_book')
          .where('favorite_book.user_id = :id', { id: user.id })
          .leftJoinAndSelect('favorite_book.book_id', 'book')
          .select(['book.title', 'book.image_url', 'favorite_book.recommend'])
          .getRawOne()

        const result = {
          book_cnt: bookCnt,
          favorite_book_category: favoriteBookCategory?.max ?? '',
          favorite_book: { ...favoriteBook } ?? '',
          profile: user,
          follower,
          following,
        }
        reply.send(result)
      } catch (e) {
        throw new Error(e)
      }
    }
  )

  /**
   * GET /api/me/alarm?username=?
   * username에 대한 알람 정보 가져오기
   */
  fastify.get<{ Querystring: { username: string } }>(
    '/alarm',
    async (request, reply) => {
      const userId = request.user?.id

      try {
        const alarmData = await Alarm.getAlarmData(userId!)
        reply.send(alarmData)
      } catch (err) {
        reply.send(err)
      }
    }
  )

  /**
   * PATCH /api/me/
   * update my profile data
   */
  fastify.patch<{ Body: UpdateProfileBody }>('/', async (request, reply) => {
    const userId = request.user?.id
    if (!userId) {
      reply.status(401)
      reply.send({
        code: 401,
        error: 'UserID Is Not Exist',
        message: 'Failed to JWT Authorization',
      })
      return
    }

    const { type } = request.body

    try {
      if (type === 'profile') {
        const { display_name, information } = request.body
        const schema = Joi.object({
          display_name: Joi.string().min(3).max(20),
        })
        const { error } = schema.validate({ display_name })
        if (error) {
          throw error
        }

        await getRepository(User)
          .update(userId, {
            display_name,
            information,
          })
          .catch(e => {
            const error = new CustomError({
              statusCode: 400,
              message: 'Duplicate Display Name',
              name: 'BadRequestError',
            })
            throw error
          })

        reply.send('ok')
      } else if (type === 'image') {
        const { photo_url: image } = request.body

        const imageName =
          new Date().valueOf() + path.extname((image as any)[0].filename)

        const sharpImage = await sharp((image as any)[0].data)
          .resize({ width: 400 })
          .toBuffer()

        const fileDir = path.resolve(os.tmpdir(), imageName)
        await fs.promises.writeFile(fileDir, sharpImage)
        await upload(fileDir, `user/${imageName}`)
        await getRepository(User).update(userId, {
          photo_url: `https://d2et5vjbr53d2l.cloudfront.net/user/${imageName}`,
        })

        reply.send(`https://d2et5vjbr53d2l.cloudfront.net/user/${imageName}`)
      } else if (type === 'recommend') {
        const favoriteBookExist = await getRepository(FavoriteBook)
          .createQueryBuilder('favorite_book')
          .where('favorite_book.user_id = :id', { id: userId })
          .getOne()

        if (!favoriteBookExist) {
          const e = new CustomError({
            statusCode: 404,
            name: 'NotFoundError',
            message: 'Favorite Book is not exist',
          })
          return e
        }

        const { recommend } = request.body
        await getRepository(FavoriteBook)
          .createQueryBuilder('favorite_book')
          .update({ recommend: recommend })
          .where('favorite_book.user_id = :id', { id: userId })
          .execute()

        reply.send('ok')
      } else if (type === 'book') {
        const { bookInfo } = request.body
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

          const result = await manager.save(book)
          bookId = result.id
        } else {
          bookId = exists.id
        }

        const favoriteBookExist = await getRepository(FavoriteBook)
          .createQueryBuilder('favorite_book')
          .where('favorite_book.user_id = :id', { id: userId })
          .getOne()

        if (favoriteBookExist) {
          await getRepository(FavoriteBook)
            .createQueryBuilder('favorite_book')
            .update({ book_id: bookId })
            .where('favorite_book.user_id = :id', { id: userId })
            .execute()
        } else {
          await getConnection()
            .createQueryBuilder()
            .insert()
            .into(FavoriteBook)
            .values({
              user_id: userId,
              book_id: bookId,
              recommend: '',
            })
            .execute()
        }

        reply.send('ok')
      } else {
        reply.send('ok')
      }
    } catch (e) {
      reply.send(e)
    }
  })

  /**
   * GET /api/me/chart?username=?
   * username에 해당하는 차트 데이터 가져오기
   */
  fastify.get<{ Querystring: { username: string } }>(
    '/chart',
    async (request, reply) => {
      const { username } = request.query

      try {
        const user = await getRepository(User)
          .createQueryBuilder('user')
          .select(['user.id'])
          .where('user.username = :username', { username: username.slice(1) })
          .getOne()

        if (!user) {
          reply.status(404)
          reply.send('Username is not exists')
          return
        }

        const shelvesId = await getRepository(BookShelf)
          .createQueryBuilder('shelve')
          .select('shelve.id')
          .where('shelve.user_id = :id', { id: user.id })
          .getMany()

        const readBooks = await getRepository(Review)
          .createQueryBuilder('review')
          .where('review.bookshelf_id IN (:id)', {
            id: shelvesId.map(({ id }) => id),
          })
          .leftJoin('review.bookInfo', 'book')

        const publisher = await readBooks
          .select('book.publisher', 'publisher')
          .addSelect('COUNT(book.publisher)', 'count')
          .groupBy('book.publisher')
          .orderBy('count', 'DESC')
          .limit(10)
          .getRawMany()

        const category = await readBooks
          .select('book.category', 'category')
          .addSelect('COUNT(book.category)', 'count')
          .groupBy('book.category')
          .getRawMany()

        const author = await readBooks
          .select('book.single_author', 'author')
          .addSelect('COUNT(book.single_author)', 'count')
          .groupBy('book.single_author')
          .orderBy('count', 'DESC')
          .limit(10)
          .getRawMany()

        reply.send({ publisher, category, author })
      } catch (e) {
        console.log(e)
        throw new Error('Failed Load Chart Data')
      }
    }
  )

  /**
   * GET /api/me/calendar?username=?month=?
   * month에 대한 저장정보 가져오기
   */
  fastify.get<{
    Querystring: { username: string; year: string; month: string }
  }>('/calendar', async (request, reply) => {
    const { username, year, month } = request.query

    try {
      const user = await getRepository(User)
        .createQueryBuilder('user')
        .select(['user.id'])
        .where('user.username = :username', { username: username.slice(1) })
        .getOne()

      if (!user) {
        reply.status(404)
        reply.send('Username is not exists')
        return
      }

      const shelvesId = await getRepository(BookShelf)
        .createQueryBuilder('shelve')
        .select('shelve.id')
        .where('shelve.user_id = :id', { id: user.id })
        .getMany()

      const readBooks = await getRepository(Review)
        .createQueryBuilder('review')
        .select(`DATE_FORMAT(review.created_at, '%y-%m-%d')`, 'date')
        .where('review.bookshelf_id IN (:id)', {
          id: shelvesId.map(({ id }) => id),
        })
        .andWhere('MONTH(review.created_at) = :month', { month: month })
        .leftJoin('review.bookInfo', 'book')
        .getRawMany()

      reply.send(readBooks.map(({ date }) => date))
    } catch (e) {
      console.log(e)
      throw new Error('Failed Load Chart Data')
    }
  })

  done()
}

export default meRoute
