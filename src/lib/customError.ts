export default class CustomError extends Error {
  statusCode: number
  name: string

  constructor({ statusCode = 500, name, message }: CustomErrorParams) {
    super(message)
    this.statusCode = statusCode
    this.name = name
  }
}

/*
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
500 Internal Server Error
*/
type ErrorName =
  | 'BadRequestError'
  | 'NotFoundError'
  | 'InternalServerError'
  | 'UnauthorizedError'
  | 'ForbiddenError'

type CustomErrorParams = {
  statusCode: number
  message: string
  name: ErrorName
}
