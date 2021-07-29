import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
} from 'typeorm'
import { Review } from './Review'
import { User } from './User'

@Entity({
  name: 'shelves',
})
export class BookShelf {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({
    length: 16,
  })
  name!: string

  @Column()
  priority!: number

  @Column({
    length: 10,
    nullable: true,
  })
  style?: string

  @Column({
    length: 10,
    nullable: true,
  })
  color?: string

  @Column({
    nullable: true,
  })
  image_url?: string

  @CreateDateColumn({
    type: 'timestamp',
  })
  create_at!: Date

  @ManyToOne(type => User, User => User.id, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
  })
  user!: User | number

  @OneToMany(() => Review, Review => Review.bookshelf_id)
  reviews!: Review[]

  // 하다가 포기
  // @ManyToMany(type => Book, Book => Book.bookshlef)
  // @JoinTable({
  //   name: 'book_and_shelf',
  //   joinColumn: {
  //     name: 'bookshelf_id',
  //     referencedColumnName: 'id',
  //   },
  //   inverseJoinColumn: {
  //     name: 'book_id',
  //     referencedColumnName: 'id',
  //   },
  // })
  // book!: Book[]
}
