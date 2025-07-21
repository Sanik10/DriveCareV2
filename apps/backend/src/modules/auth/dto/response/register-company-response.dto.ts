import { ApiProperty } from '@nestjs/swagger';

export class CompanyInfo {
  @ApiProperty({ example: 'uuid', description: 'ID компании' })
  id: string;

  @ApiProperty({ example: 'АвтоСервис "Профи"', description: 'Название компании' })
  name: string;

  @ApiProperty({ example: 'info@autoservice.com', description: 'Email компании' })
  email: string;
}

export class OwnerInfo {
  @ApiProperty({ example: 'uuid', description: 'ID владельца' })
  id: string;

  @ApiProperty({ example: 'owner@autoservice.com', description: 'Email владельца' })
  email: string;

  @ApiProperty({ example: 'Иван', description: 'Имя владельца' })
  firstName: string;

  @ApiProperty({ example: 'Петров', description: 'Фамилия владельца' })
  lastName: string;
}

export class RegisterCompanyResponseDto {
  @ApiProperty({ type: CompanyInfo, description: 'Информация о созданной компании' })
  company: CompanyInfo;

  @ApiProperty({ type: OwnerInfo, description: 'Информация о владельце' })
  owner: OwnerInfo;

  @ApiProperty({ example: 'Компания и владелец успешно созданы', description: 'Сообщение' })
  message: string;
}