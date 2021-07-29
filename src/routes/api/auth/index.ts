import { FastifyPluginAsync } from 'fastify'
import { GoogleAccessTokenBody } from '../../../types/auth/googleAccessToken/body'
import GoogleAccessTokenBodySchema from '../../../schema/auth/googleAccessToken/body.json'
import { GoogleSignupBody } from '../../../types/auth/googleSignup/body'
// import GoogleSignupBodySchema from 'schema/auth/googleSignup/body.json'
import getGoogleProfile from '../../../lib/google/getGoogleProfile'
import { getManager, getRepository } from 'typeorm'
import { SocialAccount } from '../../../entity/SocialAccount'
import { User } from '../../../entity/User'
import 'dotenv/config'

const authRoute: FastifyPluginAsync = async (fastify, opts) => {
  /**
   * POST /google/check
   * social account 정보가 저장 되어있는지 확인
   */
  fastify.post<{ Body: GoogleAccessTokenBody }>(
    '/google/check',
    {
      schema: {
        body: GoogleAccessTokenBodySchema,
      },
    },
    async (request, reply) => {
      const { access_token: accssToken } = request.body

      try {
        const profile = await getGoogleProfile(accssToken)
        const socialAccount = await getRepository(SocialAccount).findOne({
          social_id: profile.socialId,
          provider: 'google',
        })

        // socialAccount exist -> ture, not exist -> false
        reply.send({
          exists: !!socialAccount,
        })
      } catch (e) {
        reply.status(401)
        throw new Error('Failed to retrieve google profile')
        // reply.status(401)
        // reply.send({
        //   code: 401,
        //   error: 'GoogleLoginError',
        //   message: 'Failed to retrieve google profile',
        // })
      }
    }
  )

  /**
   * POST /google/signin
   * 구글 로그인 처리
   */
  fastify.post<{ Body: GoogleAccessTokenBody }>(
    '/google/signin',
    {
      schema: {
        body: GoogleAccessTokenBodySchema,
      },
    },
    async (request, reply) => {
      const { access_token: accssToken } = request.body

      try {
        const profile = await getGoogleProfile(accssToken)
        const socialAccountRepo = await getRepository(SocialAccount)

        const exists = await socialAccountRepo.findOne(
          {
            provider: 'google',
            social_id: profile.socialId,
          },
          { relations: ['user'] }
        )
        if (!exists) {
          reply.status(401)
          reply.send({
            code: 401,
            error: 'UserNotFoundError',
            message: '',
          })
          return
        }

        const user = await getRepository(User).findOne({
          id: exists.user.id,
        })
        if (!user) {
          reply.status(500)
          reply.send({
            code: 500,
            error: 'UserNotFoundError',
            message: '',
          })
          return
        }

        const accessToken = await user.generateToken()
        reply.cookie('access_token', accessToken, {
          path: '/',
          httpOnly: true,
          maxAge: 60 * 60 * 24 * 30,
        })

        reply.send({
          user: {
            ...user,
            email: user.decrypt(user.email, process.env.ENCRYPT_KEY!),
          },
          access_token: accessToken,
        })
      } catch (e) {
        reply.status(401)
        reply.send({
          code: 401,
          error: 'Google Login Error',
          message: 'Failed to retrieve google profile',
        })
      }
    }
  )

  /**
   * POST /google/signup
   * 회원가입 처리
   */
  fastify.post<{ Body: GoogleSignupBody }>(
    '/google/signup',
    {
      schema: {
        body: GoogleAccessTokenBodySchema,
      },
    },
    async (request, reply) => {
      const { access_token: accssToken, user_data: userData } = request.body

      try {
        const profile = await getGoogleProfile(accssToken)
        const manager = getManager()
        const user = new User() // user info save
        user.email = user.encrypt(profile.email, process.env.ENCRYPT_KEY!)
        user.display_name = profile.displayName
        user.photo_url = profile.photo ?? ''
        user.username = profile.username
        user.age = userData.age
        user.gender = userData.gender !== 'question' ? userData.gender : ''
        user.is_certified = true
        user.information = ''
        await manager.save(user)
        const socialAccount = new SocialAccount() // social info save
        socialAccount.social_id = profile.socialId
        socialAccount.provider = 'google'
        socialAccount.user = user
        await manager.save(socialAccount)
        const accessToken = await user.generateToken()
        reply.cookie('access_token', accessToken, {
          path: '/',
          httpOnly: true,
          maxAge: 60 * 60 * 24 * 30,
        })
        reply.send({
          user: {
            ...user,
            email: user.decrypt(user.email, process.env.ENCRYPT_KEY!),
          },
          access_token: accessToken,
        })
      } catch (e) {
        console.log(e)
        reply.status(401)
        reply.send({
          code: 401,
          error: 'GoogleSignupError',
          message: 'Failed to retrieve google profile',
        })
        // throw new Error('Google Auth Expires')
        // {
        //   "statusCode": 500,
        //   "error": "Internal Server Error",
        //   "message": "Google Auth Expires"
        // }
      }
    }
  )
}

export default authRoute
