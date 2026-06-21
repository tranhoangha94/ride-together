import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class CreateTripDto {
  @ApiProperty()
  @IsUUID()
  teamId!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(100)
  laggingThresholdM?: number;
}

export class JoinTripDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inviteCode?: string;
}

export class SetShareLocationDto {
  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;
}
