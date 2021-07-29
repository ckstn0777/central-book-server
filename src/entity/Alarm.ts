import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  getRepository,
  getConnection,
  CreateDateColumn,
} from 'typeorm'
import { Book } from './Book'
import { Follow } from './Follow'
import { User } from './User'

@Entity({
  name: 'alarm',
})
export class Alarm {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(type => User, User => User.id)
  @JoinColumn({ name: 'user_id' })
  user_id!: number // 내 아이디

  @ManyToOne(type => User, User => User.id)
  @JoinColumn({ name: 'follow_id' })
  follow_id!: number // 나를 팔로우한 아이디

  @ManyToOne(type => Book, Book => Book.id)
  @JoinColumn({ name: 'book_id' })
  book_id!: number

  @CreateDateColumn()
  create_at!: Date

  // 책 저장 시 나를 팔로우한 사용자에 대한 알림 저장?
  static async createAlarm(userId: number, bookId: number) {
    // 나를 팔로우한 사용자 찾기
    const following_ids = await getRepository(Follow)
      .createQueryBuilder('follow')
      .select('follow.user_id')
      .where('follow.following_id = :user_id', { user_id: userId })
      .getRawMany()

    const saveData = following_ids.map(following_id => ({
      user_id: userId,
      follow_id: following_id.user_id,
      book_id: bookId,
    }))

    // 그 사용자에 대한 알림 테이블에 데이터 저장
    await getConnection()
      .createQueryBuilder()
      .insert()
      .into(Alarm)
      .values(saveData)
      .execute()
  }

  // 알림 불러오기
  static async getAlarmData(userId: number) {
    const alarms = await getRepository(Alarm)
      .createQueryBuilder('alarm')
      .select([
        'alarm.user_id',
        'alarm.book_id',
        'alarm.create_at',
        'book.title',
        'book.image_url',
        'user.username',
        'user.photo_url',
        'user.display_name',
      ])
      .where('alarm.follow_id = :user_id', { user_id: userId })
      .leftJoin('alarm.user_id', 'user')
      .leftJoin('alarm.book_id', 'book')
      .limit(10)
      .orderBy('alarm.create_at', 'DESC')
      .getRawMany()

    return alarms
    // 유저데이터 + 도서 데이터
    // const user = await getRepository(User)
    //   .createQueryBuilder('user')
    //   .select(['user.username, user.display_name, user.photo_url'])
    //   .where('user.id = :user_id', { user_id: userId })
    //   .getOne()
  }
}
