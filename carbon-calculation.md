# Carbon Saved Calculation

## Methodology

ShareHub calculates carbon savings for every co-ride using the **passenger-based displacement model**. The core idea: when a passenger shares a ride instead of driving alone, the emissions that would have been produced by their solo trip are avoided.

## Formula

```
CO₂ saved (kg) = distance_km × CO₂_PER_KM × num_passengers
```

Where:

| Variable | Value | Source |
|----------|-------|--------|
| `CO₂_PER_KM` | **0.12 kg/km** | Average CO₂ emissions per passenger-km for a typical Indian car |
| `distance_km` | ORS route distance | Calculated via OpenRouteService driving-car API |

## Why 0.12 kg/km?

The emission factor of 0.12 kg CO₂ per passenger-km is derived from:

- **Indian average car emission**: ~0.18 kg CO₂/km for a single-occupancy vehicle (based on CSE India / IEA data for average Indian passenger vehicles)
- **Average car occupancy in India**: ~1.5 persons (MoHUB / Census data)
- **Per-passenger emission when car is shared**: 0.18 / 1.5 = **0.12 kg CO₂/passenger-km**

This is a conservative, widely-accepted estimate. It accounts for:

- Typical Indian fuel efficiency (15–18 km/l for petrol cars)
- Average grid mix for vehicle manufacturing amortisation
- Congestion and stop-go driving conditions in urban areas

## How Distance Is Calculated

1. **Primary**: ORS (OpenRouteService) driving-car routing — provides real road-network distance between two GPS coordinates
2. **Fallback**: If ORS fails, Haversine great-circle distance is used as an approximation
3. **Stored in DB**: `rides.distance_km` column stores the calculated distance

## When CO₂ Is Saved

Carbon is credited at two points:

| Event | Credit |
|-------|--------|
| **Ride created** (driver) | `distance_km × 0.12` added to driver's `carbon_saved` |
| **Ride booked** (passenger) | Fixed 3 kg per booking added to passenger's `carbon_saved` |

The driver's savings scale with actual route distance. The passenger credit is a simplified approximation for encouraging ride-sharing behaviour.

## References

- IEA (2023) — India passenger vehicle emissions data
- CSE India — Urban car emission factors
- OpenRouteService — Road-network routing API
- IPCC AR6 — Transport sector emission guidelines
