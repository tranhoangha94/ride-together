import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { getRequiredEnv } from "./config/env";

async function bootstrap() {
  for (const name of ["DATABASE_URL", "REDIS_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"]) {
    getRequiredEnv(name);
  }

  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Ride Together API")
    .setDescription("Realtime trip map, team location, SOS, checkpoints, and safety alerts.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, "0.0.0.0");
  console.log(`Ride Together API listening on 0.0.0.0:${port}`);
}

bootstrap().catch((error) => {
  console.error("Failed to start Ride Together API:", error);
  process.exit(1);
});
