import { generateToken } from '../lib/token/jwt'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  Unique,
  OneToOne,
} from 'typeorm'
import CryptoJS from 'crypto-js'
import { Follow } from './Follow'

@Unique(['display_name'])
@Entity({
  name: 'users',
})
export class User {
  @PrimaryGeneratedColumn()
  id!: number

  @Index()
  @Column({
    length: 255,
  })
  email!: string

  // @OneToOne(type => Follow, Follow => Follow.username)
  // @OneToOne(type => Follow, Follow => Follow.following_username)
  @Column({
    length: 48,
  })
  username!: string

  @Column({
    nullable: false,
  })
  display_name!: string

  @Column({
    nullable: true,
  })
  photo_url?: string

  @Column({
    nullable: true,
  })
  gender?: string

  @Column()
  age?: number

  @CreateDateColumn()
  create_at!: Date

  @Column({
    type: 'boolean',
  })
  is_certified!: boolean

  @Column({
    length: 255,
  })
  information?: string

  async generateToken() {
    return generateToken(
      {
        subject: 'accessToken',
        user: this.id,
      },
      {
        expiresIn: '30d',
      }
    )
  }

  encrypt(data: string, key: string) {
    return CryptoJS.AES.encrypt(data, key).toString()
  }

  decrypt(data: string, key: string) {
    return CryptoJS.AES.decrypt(data, key).toString(CryptoJS.enc.Utf8)
  }
}
