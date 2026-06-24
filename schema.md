# DB SCHEMA REFERENCE

## TABLES

### users
| col | type | note |
|-----|------|------|
| id | uuid | PK, ref: auth.users.id |
| full_name | text | |
| email | text | |
| phone | text | nullable, shared with ride/event members |
| avatar_url | text | nullable |
| bio | text | nullable |
| location | text | nullable |
| latitude | float8 | nullable |
| longitude | float8 | nullable |
| rating | numeric | nullable |
| shares_count | int4 | |
| carbon_saved | numeric | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### user_impact
| col | type | note |
|-----|------|------|
| id | uuid | PK |
| user_id | uuid | FK -> users.id |
| carbon_saved | numeric | |
| tools_shared | int4 | |
| rides_shared | int4 | |
| rides_taken | int4 | |
| events_joined | int4 | |
| current_streak | int4 | consecutive days active, default 0 |
| last_streak_date | date | last active date for streak calc |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### tools
| col | type | note |
|-----|------|------|
| id | uuid | PK |
| owner_id | uuid | FK -> users.id |
| name | text | |
| brand | text | nullable |
| category | text | |
| description | text | nullable |
| condition | text | |
| emoji | text | nullable |
| available | bool | default true |
| lends_count | int4 | default 0 |
| latitude | float8 | nullable |
| longitude | float8 | nullable |
| type | text | nullable, 'offer' or 'request' |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### tool_requests
| col | type | note |
|-----|------|------|
| id | uuid | PK |
| tool_id | uuid | FK -> tools.id |
| borrower_id | uuid | FK -> users.id |
| owner_id | uuid | FK -> users.id |
| pickup_date | text | |
| duration | text | |
| message | text | nullable |
| status | text | pending/approved/rejected/returned |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### rides
| col | type | note |
|-----|------|------|
| id | uuid | PK |
| driver_id | uuid | FK -> users.id |
| departure | text | |
| arrival | text | |
| departure_lat | float8 | nullable, from geocoding |
| departure_lng | float8 | nullable, from geocoding |
| arrival_lat | float8 | nullable, from geocoding |
| arrival_lng | float8 | nullable, from geocoding |
| distance_km | numeric | nullable, from ORS routing |
| departure_time | timestamptz | |
| arrival_time | timestamptz | |
| fare | numeric | |
| seats_total | int4 | |
| seats_left | int4 | |
| co2_saving | numeric | nullable |
| vehicle_name | text | nullable |
| vehicle_number | text | nullable |
| status | text | active/completed/cancelled |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### ride_bookings
| col | type | note |
|-----|------|------|
| id | uuid | PK |
| ride_id | uuid | FK -> rides.id |
| passenger_id | uuid | FK -> users.id |
| seat_label | text | nullable |
| fare_paid | numeric | |
| status | text | confirmed/cancelled |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### ride_locations
| col | type | note |
|-----|------|------|
| id | uuid | PK |
| ride_id | uuid | FK -> rides.id ON DELETE CASCADE |
| user_id | uuid | FK -> users.id ON DELETE CASCADE |
| latitude | float8 | |
| longitude | float8 | |
| heading | float8 | nullable, degrees from north |
| speed | float8 | nullable, m/s |
| accuracy | float8 | nullable, meters |
| updated_at | timestamptz | |
| UNIQUE | (ride_id, user_id) | one row per rider per ride |

### events
| col | type | note |
|-----|------|------|
| id | uuid | PK |
| organizer_id | uuid | FK -> users.id |
| title | text | |
| description | text | nullable |
| location | text | nullable |
| event_time | timestamptz | |
| latitude | float8 | nullable |
| longitude | float8 | nullable |
| status | text | upcoming/ongoing/ended |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### event_attendees
| col | type | note |
|-----|------|------|
| id | uuid | PK |
| event_id | uuid | FK -> events.id ON DELETE CASCADE |
| user_id | uuid | FK -> users.id ON DELETE CASCADE |
| status | text | confirmed/cancelled |
| created_at | timestamptz | |
| UNIQUE | (event_id, user_id) | |

### activity_feed
| col | type | note |
|-----|------|------|
| id | uuid | PK |
| user_id | uuid | FK -> users.id |
| activity_type | text | |
| action | text | |
| target | text | nullable |
| badge | text | nullable |
| distance_text | text | nullable |
| created_at | timestamptz | |

---

## RELATIONSHIPS

```
auth.users.id
    └── users.id (1:1)
            ├── user_impact.user_id (1:1)
            ├── tools.owner_id (1:many)
            │       └── tool_requests.tool_id (1:many)
            ├── tool_requests.borrower_id (many:1)
            ├── tool_requests.owner_id (many:1)
            ├── rides.driver_id (1:many)
            │       └── ride_bookings.ride_id (1:many)
             ├── ride_bookings.passenger_id (many:1)
             ├── ride_locations.ride_id (1:many, live tracking)
             │       └── ride_locations.user_id (many:1)
             ├── events.organizer_id (1:many)
             │       └── event_attendees.event_id (1:many)
             ├── event_attendees.user_id (many:1)
             └── activity_feed.user_id (1:many)
```

---

## FK SUMMARY

| table           | col          | ->       |
| --------------- | ------------ | -------- |
| user_impact     | user_id      | users.id |
| tools           | owner_id     | users.id |
| tool_requests   | tool_id      | tools.id |
| tool_requests   | borrower_id  | users.id |
| tool_requests   | owner_id     | users.id |
| rides           | driver_id    | users.id |
| ride_bookings   | ride_id      | rides.id |
| ride_bookings   | passenger_id | users.id |
| ride_locations  | ride_id      | rides.id |
| ride_locations  | user_id      | users.id |
| events          | organizer_id | users.id |
| event_attendees | event_id     | events.id|
| event_attendees | user_id      | users.id |
| activity_feed   | user_id      | users.id |

---

## MODULES

- **Tool Sharing**: tools + tool_requests
- **Carpooling**: rides + ride_bookings + ride_locations (live tracking)
- **Community**: events + activity_feed
- **Gamification**: user_impact (tracks carbon_saved, tools_shared, rides_shared, rides_taken, events_joined)
