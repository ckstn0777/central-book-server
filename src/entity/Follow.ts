import {
  Entity,
  PrimaryGeneratedColumn,
  getRepository,
  getManager,
  JoinColumn,
  ManyToOne,
} from 'typeorm'
import { User } from './User'

@Entity({
  name: 'follow',
})
export class Follow {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(type => User, User => User.id)
  @JoinColumn({ name: 'user_id' })
  user_id!: number

  @ManyToOne(type => User, User => User.id)
  @JoinColumn({ name: 'following_id' })
  following_id!: number

  // 내가 팔로잉하고 있는 아이디
  static async getFollowing(userId: number) {
    const result = await getRepository(Follow)
      .createQueryBuilder('follow')
      .select([
        'follow.following_id',
        'user.username',
        'user.photo_url',
        'user.display_name',
      ])
      .where('follow.user_id = :user_id', { user_id: userId })
      .leftJoin('follow.following_id', 'user')
      .getRawMany()

    return result
  }

  // 나를 팔로우하고 있는 아이디
  static async getFollower(userId: number) {
    const result = await getRepository(Follow)
      .createQueryBuilder('follow')
      .select([
        'follow.user_id',
        'user.username',
        'user.photo_url',
        'user.display_name',
      ])
      .where('follow.following_id = :user_id', { user_id: userId })
      .leftJoin('follow.user_id', 'user')
      .getRawMany()

    return result
  }

  // user_id가 following_id를 팔로우
  static async addFollowing(user_id: number, following_id: number) {
    const manager = getManager()
    const follow = new Follow()
    follow.user_id = user_id
    follow.following_id = following_id

    await manager.save(follow)
  }
}
