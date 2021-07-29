import { FastifyPluginAsync } from 'fastify'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { getConnection, getManager, getRepository } from 'typeorm'
import { BookShelf } from '../../../entity/BookShelf'
import AddBookShelveBodySchema from '../../../schema/shelve/AddBookShelve/body.json'
import { AddBookShelve } from 'types/shelve/AddBookShelve/body'
import { User } from '../../../entity/User'
import sharp from 'sharp'
import upload from '../../../lib/aws/upload'
import { Review } from '../../../entity/Review'
import CustomError from 'lib/customError'

const shelveRoute: FastifyPluginAsync = async (fastify, opts) => {
  /**
   * POST /api/shelve
   * 책장 추가
   */
  fastify.post<{ Body: AddBookShelve }>(
    '/',
    { schema: { body: AddBookShelveBodySchema } },
    async (request, reply) => {
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

      try {
        const { image, name, style, color } = request.body
        let imageName = null

        if (image !== 'undefined') {
          imageName =
            new Date().valueOf() + path.extname((image as any)[0].filename)

          const sharpImage = await sharp((image as any)[0].data)
            .resize({ width: 400 })
            .toBuffer()

          // console.log(os.tmpdir())
          const fileDir = path.resolve(os.tmpdir(), imageName)
          await fs.promises.writeFile(fileDir, sharpImage)

          await upload(fileDir, `shelve/${imageName}`)
        }

        const user = await getRepository(User).findOne({
          id: userId,
        })

        const manager = getManager()
        const bookShelf = new BookShelf()
        bookShelf.name = name
        bookShelf.color = color
        bookShelf.style = style
        bookShelf.priority = 0
        bookShelf.image_url = imageName ? `shelve/${imageName}` : ''
        bookShelf.user = user!

        const result = await manager.save(bookShelf)

        reply.send({
          id: result.id,
          name: result.name,
          color: result.color,
          style: result.style,
          image_url: result.image_url,
        })
      } catch (e) {
        console.log(e)
      }
    }
  )

  /**
   * DELETE /api/shelve?shelve_id=?
   * 내 책장 제거하기
   */
  fastify.delete<{ Querystring: { shelve_id: number } }>(
    '/',
    async (request, reply) => {
      const { shelve_id } = request.query
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

      try {
        const exists = await getRepository(BookShelf)
          .createQueryBuilder('shelve')
          .where('shelve.id = :id', { id: shelve_id })
          .where('shelve.user_id = :id', { id: userId })
          .getOne()

        if (!exists) {
          reply.status(401)
          reply.send({
            code: 401,
            error: 'Unauthorized',
            message: 'Unauthorized',
          })
          return
        }

        await getConnection()
          .createQueryBuilder()
          .delete()
          .from(BookShelf)
          .where('id = :id', { id: shelve_id })
          .execute()

        reply.send('ok')
      } catch (e) {
        console.log(e)
        throw new Error('Failed Remove Shelve')
      }
    }
  )

  /**
   * GET /api/shelve/
   * 책장 정보 전체 불러오기
   */
  fastify.get<{ Querystring: { username: string } }>(
    '/',
    async (request, reply) => {
      const { username } = request.query

      try {
        const user = await getRepository(User).findOne({
          username: username.slice(1),
        })
        if (!user) {
          return
        }
        const shelve = await getRepository(BookShelf).find({
          user: user.id,
        })

        reply.send(shelve)
      } catch (e) {
        console.log(e)
      }
    }
  )

  /**
   * GET /api/shelve/:shelveId
   * 책장 안에 도서 불러오기
   */

  fastify.get<{ Params: { shelveId: number } }>(
    '/:shelveId',
    async (request, reply) => {
      const { shelveId } = request.params
      const userId = request.user?.id

      const bookInShelve: any[] = await getRepository(Review).find({
        where: {
          bookshelf_id: shelveId,
        },
        relations: ['bookInfo'],
      })

      const bookId = bookInShelve.map(review => review.bookInfo.id)
      if (bookId.length > 0) {
        const bookInUser = await getRepository(Review)
          .createQueryBuilder('review')
          .select('DISTINCT review.book_id, user.username, user.photo_url')
          .where('review.book_id IN (:id)', {
            id: bookInShelve.map(review => review.bookInfo.id),
          })
          .leftJoin('review.bookshelf_id', 'bookShelve')
          .leftJoin('bookShelve.user', 'user')
          .andWhere(`user.id != ${userId}`)
          // .groupBy('user.username')
          .getRawMany()

        // console.log(bookInUser)
        bookInUser.forEach(user => {
          const book = bookInShelve.find(
            review => review.bookInfo.id === user.book_id
          )
          if (book.user) {
            book.user.push(user)
          } else {
            book.user = [user]
          }
        })

        // console.log(bookInShelve)
      }

      reply.send(bookInShelve)
    }
  )
}

export default shelveRoute
