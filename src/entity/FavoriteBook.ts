import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Book } from './Book'
import { User } from './User'

// @PrimaryColumn(['user_id', 'book_id'])
@Entity({
  name: 'favorite_book',
})
export class FavoriteBook {
  @PrimaryGeneratedColumn()
  id!: number

  @OneToOne(() => User, user => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user_id!: number

  @OneToOne(() => Book, book => book.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'book_id' })
  book_id!: number

  @Column()
  recommend!: string
}
