import { HttpException, HttpStatus } from '@nestjs/common';

export class EntityNotFoundException extends HttpException {
  constructor(entity: string, id?: string) {
    super(`${entity}${id ? ` with ID ${id}` : ''} not found`, HttpStatus.NOT_FOUND);
  }
}

export class InvalidCredentialsException extends HttpException {
  constructor() {
    super('Invalid credentials', HttpStatus.UNAUTHORIZED);
  }
}

export class InactiveUserException extends HttpException {
  constructor() {
    super('User inactive', HttpStatus.FORBIDDEN);
  }
}

export class TooManyAttemptsException extends HttpException {
  constructor() {
    super('Too many failed attempts', HttpStatus.TOO_MANY_REQUESTS);
  }
}

export class UserExistsException extends HttpException {
  constructor() {
    super('User already exists', HttpStatus.CONFLICT);
  }
}

export class InvalidTokenException extends HttpException {
  constructor() {
    super('Invalid token', HttpStatus.UNAUTHORIZED);
  }
}