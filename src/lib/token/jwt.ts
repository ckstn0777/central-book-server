import jwt from 'jsonwebtoken'

const { JWT_SECRET } = process.env

export async function generateToken(
  payload: string | object | Buffer,
  options: jwt.SignOptions = {}
) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not exist')
  }

  const promise = new Promise<string>((resolve, reject) => {
    jwt.sign(payload, JWT_SECRET, options, (err, token) => {
      if (err) {
        reject(err)
        return
      }
      if (!token) {
        reject(new Error('JWT is empty'))
        return
      }
      resolve(token)
    })
  })

  return promise
}

export async function decodeToken<T>(token: string) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not exist')
  }

  const promise = new Promise<T>((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        reject(err)
        return
      }
      if (!decoded) {
        reject(new Error('Token is empty'))
        return
      }
      resolve(decoded as any)
    })
  })

  return promise
}
