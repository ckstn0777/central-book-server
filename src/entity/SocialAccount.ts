import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  OneToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './User'

@Entity({
  name: 'social_accounts',
})
@Index(['provider', 'social_id'])
export class SocialAccount {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ length: 12 })
  provider!: string

  @Column()
  social_id!: string

  @OneToOne(type => User, User => User.id)
  @JoinColumn({ name: 'user_id' })
  user!: User
}
