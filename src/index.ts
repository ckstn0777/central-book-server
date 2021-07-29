import 'reflect-metadata'
import Server from './Server'
import { createConnection } from 'typeorm'

createConnection()
  .then(async connection => {
    const server = new Server()
    await server.start()
  })
  .catch(error => console.log(error))
