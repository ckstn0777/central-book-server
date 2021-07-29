import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm'
import { Book } from './Book'
import { BookShelf } from './BookShelf'

@Entity({
  name: 'reviews',
})
export class Review {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => Book, book => book.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'book_id' })
  bookInfo!: Book | number

  @ManyToOne(() => BookShelf, bookShelf => bookShelf.reviews, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bookshelf_id' })
  bookshelf_id!: BookShelf | number

  @Column()
  ratings!: number

  @Column({ type: 'text' })
  review!: string

  @Column()
  seq_num!: number

  @CreateDateColumn({
    type: 'timestamp',
  })
  created_at!: Date
}
