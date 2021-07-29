import AWS from 'aws-sdk'
import 'dotenv/config'
import fs from 'fs'
import mime from 'mime-types'

const { BUCKET_NAME } = process.env

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  region: 'ap-northeast-2',
})

export default function upload(fileDir: string, targetDir: string) {
  if (!BUCKET_NAME) {
    throw new Error('BUCKET_NAME is not setting')
  }

  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(fileDir)
    fileStream.on('error', err => {
      reject(err)
    })

    s3.upload(
      {
        Bucket: BUCKET_NAME,
        Key: targetDir,
        ContentType: mime.lookup(fileDir) || undefined,
        Body: fileStream,
      },
      (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      }
    )
  })
}
