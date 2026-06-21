import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import { CameraType } from "./camera-point.entity";

const cameraTypes = ["speed_camera", "red_light", "traffic_hazard", "police_checkpoint", "other"] as const;

export class NearbyCameraQueryDto {
  @ApiProperty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(5000)
  radius?: number;
}

export class CreateCameraReportDto {
  @ApiProperty({ enum: cameraTypes })
  @IsIn(cameraTypes)
  type!: CameraType;

  @ApiProperty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
