import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

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
