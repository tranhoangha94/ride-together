# Socket Event Contract

Connect with:

```ts
io(SOCKET_URL, { auth: { token: accessToken } })
```

## Client to Server

### join_trip_room

```json
{ "tripId": "uuid" }
```

### leave_trip_room

```json
{ "tripId": "uuid" }
```

### location_update

```json
{
  "tripId": "uuid",
  "lat": 10.7769,
  "lng": 106.7009,
  "speed": 42,
  "heading": 180,
  "accuracy": 12,
  "batteryLevel": 90,
  "recordedAt": "2026-06-20T10:00:00.000Z"
}
```

### sos_trigger

```json
{
  "tripId": "uuid",
  "lat": 10.7769,
  "lng": 106.7009,
  "message": "Need help"
}
```

### checkpoint_reached

```json
{ "tripId": "uuid", "checkpointId": "uuid" }
```

## Server to Client

- `member_location_updated`
- `member_offline`
- `member_lagging`
- `sos_alert`
- `checkpoint_status_updated`
- `traffic_camera_alert`
