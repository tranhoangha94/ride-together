import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateRoomDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  nickname!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  participantId?: string;
}

export class JoinRoomDto {
  @ApiProperty()
  @IsString()
  code!: string;
}

export class InviteToRoomDto {
  @ApiProperty()
  @IsString()
  emailOrPhone!: string;
}
