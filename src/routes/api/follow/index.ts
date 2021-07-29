import { Follow } from 'entity/Follow'
import { FastifyPluginCallback } from 'fastify'
import CustomError from 'lib/customError'
import { getConnection, getRepository } from 'typeorm'

const followRoute: FastifyPluginCallback = (fastify, opts, done) => {
  /**
   * POST /api/follow/
   * 다른사람 팔로우하기
   */
  fastify.post<{ Body: { following_id: number } }>(
    '/',
    async (request, reply) => {
      const userId = request.user?.id
      const { following_id } = request.body

      if (!userId || !following_id) {
        const error = new CustomError({
          statusCode: 400,
          message: 'UserId or FollowingId is empty',
          name: 'BadRequestError',
        })
        throw error
      }

      try {
        await Follow.addFollowing(userId, following_id)
        reply.send('success')
      } catch (e) {
        throw new Error(e)
      }
    }
  )

  /**
   * DELETE /api/follow/
   * 다른사람 팔로우 취소하기
   */
  fastify.delete<{ Body: { following_id: number } }>(
    '/',
    async (request, reply) => {
      const userId = request.user?.id
      const { following_id } = request.body

      if (!userId || !following_id) {
        const error = new CustomError({
          statusCode: 400,
          message: 'UserId or FollowingId is empty',
          name: 'BadRequestError',
        })
        throw error
      }

      try {
        await getConnection()
          .createQueryBuilder()
          .delete()
          .from(Follow)
          .where('user_id = :user_id', { user_id: userId })
          .andWhere('following_id = :following_id', {
            following_id: following_id,
          })
          .execute()

        reply.send(following_id)
      } catch (e) {
        throw new Error(e)
      }
    }
  )

  /**
   * DELETE /api/follow/
   * 다른사람이 나를 팔로잉한거를 삭제하기
   */

  done()
}

export default followRoute
