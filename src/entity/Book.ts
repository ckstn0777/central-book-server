import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Index,
} from 'typeorm'
import { Review } from './Review'

@Entity({
  name: 'books',
})
export class Book {
  @PrimaryGeneratedColumn()
  id!: number

  @Index()
  @Column()
  title!: string

  @Column()
  author!: string

  @Column({
    length: 1024,
  })
  description!: string

  @Index({ unique: true })
  @Column({
    length: 13,
  })
  isbn!: string

  @Column({
    length: 24,
  })
  publisher!: string

  @Column({
    type: 'date',
  })
  pub_date!: Date

  @Column({
    length: 255,
    nullable: true,
  })
  image_url?: string

  @Column({
    nullable: true,
  })
  price?: number

  @Column({
    length: 20,
    nullable: true,
  })
  category?: string

  @Column({
    nullable: true,
  })
  link?: string

  @Column({
    length: 20,
    nullable: true,
  })
  single_author?: string

  @OneToMany(() => Review, Review => Review.bookInfo)
  reviews!: Review[]

  // @ManyToMany(type => BookShelf, BookShelf => BookShelf.book)
  // bookshlef!: BookShelf[]
}
