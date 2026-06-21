export const appConfig = () => ({
  port: Number(process.env.PORT ?? 3000),
  locationTtlSeconds: Number(process.env.LOCATION_UPDATE_TTL_SECONDS ?? 120),
  locationRateLimitTtlSeconds: Number(process.env.LOCATION_RATE_LIMIT_TTL_SECONDS ?? 3),
  defaultLaggingThresholdM: Number(process.env.DEFAULT_LAGGING_THRESHOLD_M ?? 2000)
});
