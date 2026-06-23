import { Platform } from 'react-native';
import { supabase } from './supabase';

const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjgyMDA2NzJkZjI5NzQ4OTM5NTg2MTU4NGU4MDg2YzRiIiwiaCI6Im11cm11cjY0In0=';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  shares_count: number | null;
  carbon_saved: number | null;
};

export type ToolItem = {
  id: string;
  ownerId: string;
  name: string;
  brand: string;
  category: string;
  ownerName: string;
  ownerAvatar: string;
  distance: string;
  distanceNum: number;
  available: boolean;
  rating: number;
  lends: number;
  emoji: string;
  color: string;
  accentColor: string;
  condition: string;
  description: string;
  coordinates: { latitude: number; longitude: number };
  type?: 'offer' | 'request';
};

export type RideItem = {
  id: string;
  driverId: string;
  driverName: string;
  driverAvatar: string;
  driverRating: string;
  driverRides: string;
  departure: string;
  arrival: string;
  departureLat: number | null;
  departureLng: number | null;
  arrivalLat: number | null;
  arrivalLng: number | null;
  distanceKm: number | null;
  departureTime: string;
  arrivalTime: string;
  co2Saving: string;
  fare: string;
  seatsLeft: string;
  vehicleName: string;
  vehicleNumber: string;
};

export type ActivityItem = {
  id: string;
  avatar: string;
  name: string;
  action: string;
  target: string;
  meta: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  type: string;
};

export type SearchItem = {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  tag: string;
  tagBg: string;
  tagColor: string;
};

const DEFAULT_AVATAR = '';

const CATEGORY_STYLE: Record<string, { emoji: string; color: string; accentColor: string }> = {
  'Power Tools': { emoji: '🔧', color: '#e8f4ff', accentColor: '#006496' },
  Garden: { emoji: '🌿', color: '#f0fdf4', accentColor: '#366000' },
  Kitchen: { emoji: '🍚', color: '#fff7ed', accentColor: '#c2410c' },
  Cleaning: { emoji: '💧', color: '#ecfdf5', accentColor: '#006156' },
  Ladders: { emoji: '🪜', color: '#fef9ec', accentColor: '#92400e' },
  Sport: { emoji: '🏸', color: '#f0f9ff', accentColor: '#0369a1' },
};

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function distanceLabel(latitude?: number | null, longitude?: number | null) {
  if (latitude == null || longitude == null) return { distance: 'Nearby', distanceNum: 0 };
  const userLat = 12.9116;
  const userLng = 77.6389;
  const km =
    Math.sqrt(Math.pow(latitude - userLat, 2) + Math.pow(longitude - userLng, 2)) * 111;
  return { distance: `${km.toFixed(1)} km`, distanceNum: km };
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data.user) {
    await ensureProfile(
      data.user.id,
      data.user.email ?? email,
      typeof data.user.user_metadata?.full_name === 'string'
        ? data.user.user_metadata.full_name
        : undefined
    );
  }
  return data;
}

export async function signUpWithEmail(fullName: string, email: string, password: string, phone?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone: phone || '' } },
  });
  if (error) throw error;
  if (data.user) await ensureProfile(data.user.id, email, fullName, phone);
  return data;
}

export async function ensureProfile(userId: string, email: string, fullName?: string, phone?: string) {
  const { data: existingProfile, error: existingError } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('id', userId)
    .maybeSingle();
  if (existingError) throw existingError;

  const fallbackName = fullName?.trim() || existingProfile?.full_name || 'Neighbor';
  const now = new Date().toISOString();

  const payload: Record<string, unknown> = {
    id: userId,
    email,
    full_name: fallbackName,
    updated_at: now,
  };

  if (phone) payload.phone = phone;

  if (!existingProfile) {
    payload.shares_count = 0;
    payload.carbon_saved = 0;
    payload.created_at = now;
  }

  const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
  if (error) throw error;

  const { data: existingImpact } = await supabase
    .from('user_impact')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!existingImpact) {
    const { error: impactError } = await supabase.from('user_impact').insert({
      user_id: userId,
      carbon_saved: 0,
      water_saved: 0,
      tools_shared: 0,
      rides_shared: 0,
      rides_taken: 0,
      events_joined: 0,
    });
    if (impactError) throw impactError;
  }
}

export async function updateCurrentProfileName(fullName: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Please sign in first.');

  const { error } = await supabase
    .from('users')
    .update({ full_name: fullName.trim() })
    .eq('id', userId);
  if (error) throw error;
}

export function profileDisplayName(profile: Profile | null) {
  const name = profile?.full_name?.trim();
  if (!name || name.includes('@')) return 'Neighbor';
  return name;
}

export async function getCurrentUserId() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const sessionUser = sessionData.session?.user;
  if (!sessionUser) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error) return sessionUser.id;
  return data.user?.id ?? sessionUser.id;
}

export async function fetchTools(): Promise<ToolItem[]> {
  const { data: tools, error } = await supabase
    .from('tools')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!tools?.length) return [];

  const ownerIds = [...new Set(tools.map((tool) => tool.owner_id).filter(Boolean))];
  const { data: owners } = await supabase.from('users').select('*').in('id', ownerIds);
  const ownerMap = new Map((owners ?? []).map((owner) => [owner.id, owner as Profile]));

  return tools.map((tool) => {
    const owner = ownerMap.get(tool.owner_id);
    const category = tool.category || 'Power Tools';
    const style = CATEGORY_STYLE[category] ?? CATEGORY_STYLE['Power Tools'];
    const distance = distanceLabel(tool.latitude, tool.longitude);

    return {
      id: tool.id,
      ownerId: tool.owner_id,
      name: tool.name,
      brand: tool.brand ?? '',
      category,
      ownerName: owner?.full_name ?? 'Neighbor',
      ownerAvatar: owner?.avatar_url ?? DEFAULT_AVATAR,
      distance: distance.distance,
      distanceNum: distance.distanceNum,
      available: Boolean(tool.available),
      rating: asNumber(owner?.rating, 0),
      lends: asNumber(tool.lends_count, 0),
      emoji: tool.emoji || style.emoji,
      color: style.color,
      accentColor: style.accentColor,
      condition: tool.condition ?? 'Good',
      description: tool.description ?? '',
      coordinates: {
        latitude: asNumber(tool.latitude, 12.9116),
        longitude: asNumber(tool.longitude, 77.6389),
      },
      type: tool.type,
    };
  });
}

export async function fetchUserTools(): Promise<ToolItem[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data: tools, error } = await supabase
    .from('tools')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!tools?.length) return [];

  const { data: owner } = await supabase.from('users').select('*').eq('id', userId).single();

  return tools.map((tool) => {
    const category = tool.category || 'Power Tools';
    const style = CATEGORY_STYLE[category] ?? CATEGORY_STYLE['Power Tools'];
    const distance = distanceLabel(tool.latitude, tool.longitude);

    return {
      id: tool.id,
      ownerId: tool.owner_id,
      name: tool.name,
      brand: tool.brand ?? '',
      category,
      ownerName: owner?.full_name ?? 'Neighbor',
      ownerAvatar: owner?.avatar_url ?? DEFAULT_AVATAR,
      distance: distance.distance,
      distanceNum: distance.distanceNum,
      available: Boolean(tool.available),
      rating: asNumber(owner?.rating, 0),
      lends: asNumber(tool.lends_count, 0),
      emoji: tool.emoji || style.emoji,
      color: style.color,
      accentColor: style.accentColor,
      condition: tool.condition ?? 'Good',
      description: tool.description ?? '',
      coordinates: {
        latitude: asNumber(tool.latitude, 12.9116),
        longitude: asNumber(tool.longitude, 77.6389),
      },
      type: tool.type,
    };
  });
}

export async function createToolRequest(input: {
  toolId: string;
  ownerId: string;
  pickupDate: string;
  duration: string;
  message: string;
}) {
  const borrowerId = await getCurrentUserId();
  if (!borrowerId) throw new Error('Please sign in first.');

  const { error } = await supabase.from('tool_requests').insert({
    tool_id: input.toolId,
    borrower_id: borrowerId,
    owner_id: input.ownerId,
    pickup_date: input.pickupDate,
    duration: input.duration,
    message: input.message,
    status: 'pending',
  });
  if (error) throw error;
}

export async function fetchRides(): Promise<RideItem[]> {
  const { data: rides, error } = await supabase
    .from('rides')
    .select('*')
    .eq('status', 'active')
    .order('departure_time', { ascending: true });
  if (error) throw error;
  if (!rides?.length) return [];

  const driverIds = [...new Set(rides.map((ride) => ride.driver_id).filter(Boolean))];
  const { data: drivers } = await supabase.from('users').select('*').in('id', driverIds);
  const driverMap = new Map((drivers ?? []).map((driver) => [driver.id, driver as Profile]));

  return rides.map((ride) => {
    const driver = driverMap.get(ride.driver_id);
    return {
      id: ride.id,
      driverId: ride.driver_id,
      driverName: driver?.full_name ?? 'Neighbor Driver',
      driverAvatar: driver?.avatar_url ?? DEFAULT_AVATAR,
      driverRating: String(asNumber(driver?.rating, 0).toFixed(1)),
      driverRides: String(asNumber(driver?.shares_count, 0)),
      departure: ride.departure,
      arrival: ride.arrival,
      departureLat: ride.departure_lat ?? null,
      departureLng: ride.departure_lng ?? null,
      arrivalLat: ride.arrival_lat ?? null,
      arrivalLng: ride.arrival_lng ?? null,
      distanceKm: ride.distance_km ?? null,
      departureTime: formatTime(ride.departure_time),
      arrivalTime: formatTime(ride.arrival_time),
      co2Saving: String(asNumber(ride.co2_saving, 0)),
      fare: String(asNumber(ride.fare, 0)),
      seatsLeft: String(asNumber(ride.seats_left, 0)),
      vehicleName: ride.vehicle_name ?? '',
      vehicleNumber: ride.vehicle_number ?? '',
    };
  });
}

export async function createRideBooking(input: {
  rideId: string;
  seatLabel: string;
  farePaid: number;
}) {
  const passengerId = await getCurrentUserId();
  if (!passengerId) throw new Error('Please sign in first.');

  const { data: existingSeat, error: existingError } = await supabase
    .from('ride_bookings')
    .select('id')
    .eq('ride_id', input.rideId)
    .eq('seat_label', input.seatLabel)
    .neq('status', 'cancelled')
    .maybeSingle();
  if (existingError) throw existingError;
  if (existingSeat) throw new Error('That seat has already been booked. Please choose another seat.');

  const { data, error } = await supabase.from('ride_bookings').insert({
    ride_id: input.rideId,
    passenger_id: passengerId,
    seat_label: input.seatLabel,
    fare_paid: input.farePaid,
    status: 'pending',
  }).select('id, created_at').single();
  if (error) throw error;

  const { data: ride } = await supabase
    .from('rides')
    .select('seats_left')
    .eq('id', input.rideId)
    .single();

  const seatsLeft = Math.max(0, asNumber(ride?.seats_left, 1) - 1);
  await supabase
    .from('rides')
    .update({ seats_left: seatsLeft })
    .eq('id', input.rideId);

  await incrementImpact(passengerId, { rides_taken: 1 });

  return data;
}

export async function fetchBookedRideSeats(rideId: string) {
  const { data, error } = await supabase
    .from('ride_bookings')
    .select('seat_label')
    .eq('ride_id', rideId)
    .neq('status', 'cancelled');
  if (error) throw error;
  return new Set((data ?? []).map((booking) => booking.seat_label as string));
}

export async function cancelRideBooking(bookingId: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Please sign in first.');

  const { data: booking, error: fetchError } = await supabase
    .from('ride_bookings')
    .select('id, ride_id, seat_label, status, passenger_id')
    .eq('id', bookingId)
    .single();
  if (fetchError) throw fetchError;
  if (booking.passenger_id !== userId) throw new Error('You can only cancel your own bookings.');
  if (booking.status === 'cancelled') throw new Error('Booking is already cancelled.');

  const { error } = await supabase
    .from('ride_bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId);
  if (error) throw error;

  const { data: ride } = await supabase
    .from('rides')
    .select('seats_left')
    .eq('id', booking.ride_id)
    .single();
  const seatsLeft = asNumber(ride?.seats_left, 0) + 1;
  await supabase.from('rides').update({ seats_left: seatsLeft }).eq('id', booking.ride_id);
}

export async function completeRide(rideId: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Please sign in first.');

  const { data: ride, error: fetchError } = await supabase
    .from('rides')
    .select('id, driver_id, status, distance_km')
    .eq('id', rideId)
    .single();
  if (fetchError) throw fetchError;
  if (ride.driver_id !== userId) throw new Error('Only the host can complete this ride.');
  if (ride.status === 'completed') throw new Error('Ride is already completed.');

  const { error } = await supabase
    .from('rides')
    .update({ status: 'completed' })
    .eq('id', rideId);
  if (error) throw error;

  const distanceKm = Number(ride.distance_km) || 0;
  const driverCarbon = calculateCarbonSaved(distanceKm);

  await incrementImpact(ride.driver_id, { carbon_saved: driverCarbon });

  const { data: confirmedBookings } = await supabase
    .from('ride_bookings')
    .select('passenger_id')
    .eq('ride_id', rideId)
    .eq('status', 'confirmed');

  if (confirmedBookings?.length) {
    const passengerCarbon = calculateCarbonSaved(distanceKm);
    for (const booking of confirmedBookings) {
      await incrementImpact(booking.passenger_id, { carbon_saved: passengerCarbon });
    }
  }
}

export async function fetchUserBookings() {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('ride_bookings')
    .select('id, ride_id, seat_label, fare_paid, status, created_at')
    .eq('passenger_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchUserRides() {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('rides')
    .select('id, departure, arrival, departure_time, status, fare, seats_total, seats_left')
    .eq('driver_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createRide(input: {
  departure: string;
  arrival: string;
  departureTime: string;
  arrivalTime?: string;
  fare: number;
  seatsTotal: number;
  co2Saving?: number;
  vehicleName?: string;
  vehicleNumber?: string;
  departureLat?: number;
  departureLng?: number;
  arrivalLat?: number;
  arrivalLng?: number;
}) {
  const driverId = await getCurrentUserId();
  if (!driverId) throw new Error('Please sign in first.');

  let depCoords = input.departureLat != null && input.departureLng != null
    ? { lat: input.departureLat, lng: input.departureLng }
    : await geocodeLocation(input.departure).catch(() => null);
  let arrCoords = input.arrivalLat != null && input.arrivalLng != null
    ? { lat: input.arrivalLat, lng: input.arrivalLng }
    : await geocodeLocation(input.arrival).catch(() => null);

  let distanceKm: number | null = null;
  let co2Saving = input.co2Saving ?? 0;

  if (depCoords && arrCoords) {
    distanceKm = await getRouteDistance(
      { lat: depCoords.lat, lng: depCoords.lng },
      { lat: arrCoords.lat, lng: arrCoords.lng }
    ).catch(() => null);
    if (distanceKm != null && !input.co2Saving) {
      co2Saving = calculateCarbonSaved(distanceKm);
    }
  }

  const seatsTotal = Math.max(1, Math.round(input.seatsTotal));
  const rideRow: Record<string, unknown> = {
    driver_id: driverId,
    departure: input.departure,
    arrival: input.arrival,
    departure_time: new Date(input.departureTime).toISOString(),
    arrival_time: input.arrivalTime ? new Date(input.arrivalTime).toISOString() : null,
    fare: input.fare,
    seats_total: seatsTotal,
    seats_left: seatsTotal,
    co2_saving: co2Saving,
    vehicle_name: input.vehicleName ?? null,
    vehicle_number: input.vehicleNumber ?? null,
    status: 'active',
  };
  if (depCoords) {
    rideRow.departure_lat = depCoords.lat;
    rideRow.departure_lng = depCoords.lng;
  }
  if (arrCoords) {
    rideRow.arrival_lat = arrCoords.lat;
    rideRow.arrival_lng = arrCoords.lng;
  }
  if (distanceKm != null) {
    rideRow.distance_km = distanceKm;
  }
  let { error } = await supabase.from('rides').insert(rideRow);
  if (error) {
    delete rideRow.departure_lat;
    delete rideRow.departure_lng;
    delete rideRow.arrival_lat;
    delete rideRow.arrival_lng;
    delete rideRow.distance_km;
    const retry = await supabase.from('rides').insert(rideRow);
    if (retry.error) throw retry.error;
  }

  await supabase.from('activity_feed').insert({
    user_id: driverId,
    activity_type: 'ride',
    action: 'created a ride to',
    target: input.arrival,
    badge: 'Available',
  });

  await incrementImpact(driverId, { rides_shared: 1 });
}

export async function createTool(input: {
  name: string;
  brand?: string;
  category: string;
  description?: string;
  condition?: string;
  emoji?: string;
  latitude?: number;
  longitude?: number;
  type?: 'offer' | 'request';
}) {
  const ownerId = await getCurrentUserId();
  if (!ownerId) throw new Error('Please sign in first.');

  const { error } = await supabase.from('tools').insert({
    owner_id: ownerId,
    name: input.name,
    brand: input.brand ?? null,
    category: input.category,
    description: input.description ?? null,
    condition: input.condition ?? 'Good',
    emoji: input.emoji ?? null,
    available: true,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    ...(input.type ? { type: input.type } : {}),
  });
  if (error) throw error;

  await supabase.from('activity_feed').insert({
    user_id: ownerId,
    activity_type: 'tool',
    action: 'shared',
    target: input.name,
    badge: 'Available',
  });

  await incrementImpact(ownerId, { tools_shared: 1, water_saved: 5, carbon_saved: 2 });
}

export async function createEvent(input: {
  title: string;
  description?: string;
  location?: string;
  eventTime?: string;
  latitude?: number;
  longitude?: number;
}) {
  const organizerId = await getCurrentUserId();
  if (!organizerId) throw new Error('Please sign in first.');

  const { error } = await supabase.from('events').insert({
    organizer_id: organizerId,
    title: input.title,
    description: input.description ?? null,
    location: input.location ?? null,
    event_time: input.eventTime ? new Date(input.eventTime).toISOString() : null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    status: 'upcoming',
  });
  if (error) throw error;

  await supabase.from('activity_feed').insert({
    user_id: organizerId,
    activity_type: 'event',
    action: 'organized',
    target: input.title,
    badge: 'Active',
  });
}

async function incrementImpact(
  userId: string,
  values: { tools_shared?: number; rides_shared?: number; rides_taken?: number; events_joined?: number; carbon_saved?: number; water_saved?: number }
) {
  const { data: current } = await supabase
    .from('user_impact')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (!current) return;

  const updates: Record<string, unknown> = {};
  if (values.tools_shared) updates.tools_shared = (current.tools_shared ?? 0) + values.tools_shared;
  if (values.rides_shared) updates.rides_shared = (current.rides_shared ?? 0) + values.rides_shared;
  if (values.rides_taken) updates.rides_taken = (current.rides_taken ?? 0) + values.rides_taken;
  if (values.events_joined) updates.events_joined = (current.events_joined ?? 0) + values.events_joined;
  if (values.carbon_saved) updates.carbon_saved = (current.carbon_saved ?? 0) + values.carbon_saved;
  if (values.water_saved) updates.water_saved = (current.water_saved ?? 0) + values.water_saved;

  await supabase.from('user_impact').update(updates).eq('user_id', userId);
}

export async function fetchEvents() {
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('event_time', { ascending: true });
  if (error) throw error;
  return events ?? [];
}

export async function fetchEventAttendees(eventId: string) {
  const { data, error } = await supabase
    .from('event_attendees')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('status', 'confirmed');
  if (error) throw error;
  return data ?? [];
}

export async function joinEvent(eventId: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Please sign in first.');

  const { error } = await supabase.from('event_attendees').insert({
    event_id: eventId,
    user_id: userId,
    status: 'confirmed',
  });
  if (error) throw error;

  await incrementImpact(userId, { events_joined: 1, carbon_saved: 2, water_saved: 5 });

  const { data: event } = await supabase.from('events').select('title').eq('id', eventId).single();
  await supabase.from('activity_feed').insert({
    user_id: userId,
    activity_type: 'event',
    action: 'joined',
    target: event?.title ?? 'an event',
    badge: 'Attending',
  });
}

export async function leaveEvent(eventId: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Please sign in first.');

  const { error } = await supabase
    .from('event_attendees')
    .update({ status: 'cancelled' })
    .eq('event_id', eventId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function getCurrentProfile() {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
  if (error) throw error;
  const profile = data as Profile;

  if (profile.full_name?.includes('@')) {
    const { data: userData } = await supabase.auth.getUser();
    const metadataName = userData.user?.user_metadata?.full_name;
    if (typeof metadataName === 'string' && metadataName.trim()) {
      const repairedName = metadataName.trim();
      const { error: updateError } = await supabase
        .from('users')
        .update({ full_name: repairedName })
        .eq('id', userId);
      if (updateError) throw updateError;
      return { ...profile, full_name: repairedName };
    }
  }

  return profile;
}

export async function getCurrentImpact() {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('user_impact')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}



export async function fetchActivities(): Promise<ActivityItem[]> {
  const { data: activities, error } = await supabase
    .from('activity_feed')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!activities?.length) return [];

  const userIds = [...new Set(activities.map((activity) => activity.user_id).filter(Boolean))];
  const { data: users } = userIds.length
    ? await supabase.from('users').select('*').in('id', userIds)
    : { data: [] };
  const userMap = new Map((users ?? []).map((user) => [user.id, user as Profile]));

  return activities.map((activity) => {
    const user = userMap.get(activity.user_id);
    const type = activity.activity_type ?? 'event';
    const isRide = type === 'ride';
    const isTool = type === 'tool';

    return {
      id: activity.id,
      avatar: user?.avatar_url ?? DEFAULT_AVATAR,
      name: user?.full_name ?? 'Neighbor',
      action: activity.action,
      target: activity.target,
      meta: activity.distance_text ?? new Date(activity.created_at).toLocaleString(),
      badge: activity.badge ?? (isRide ? 'Available' : isTool ? 'Completed' : 'Joined'),
      badgeBg: isRide ? 'rgba(127,197,253,0.2)' : isTool ? 'rgba(73,123,9,0.2)' : 'rgba(0,97,86,0.1)',
      badgeColor: isRide ? '#006496' : isTool ? '#366000' : '#006156',
      type,
    };
  });
}

export async function fetchSearchItems(): Promise<SearchItem[]> {
  const [tools, rides, eventsResponse] = await Promise.all([
    fetchTools(),
    fetchRides(),
    supabase.from('events').select('*').order('event_time', { ascending: true }),
  ]);

  if (eventsResponse.error) throw eventsResponse.error;

  const toolItems = tools.map((tool) => ({
    id: `tool-${tool.id}`,
    category: 'Tool',
    title: `${tool.name}${tool.brand ? ` - ${tool.brand}` : ''}`,
    subtitle: `${tool.ownerName} - ${tool.available ? 'Available' : 'Borrowed'}`,
    tag: 'Tool Share',
    tagBg: 'rgba(73,123,9,0.2)',
    tagColor: '#366000',
  }));

  const rideItems = rides.map((ride) => ({
    id: `ride-${ride.id}`,
    category: 'Ride',
    title: `Co-Ride to ${ride.arrival}`,
    subtitle: `${ride.driverName} - ${ride.departureTime}`,
    tag: 'Co-Ride',
    tagBg: 'rgba(127,197,253,0.2)',
    tagColor: '#006496',
  }));

  const eventItems = (eventsResponse.data ?? []).map((event) => ({
    id: `event-${event.id}`,
    category: 'Event',
    title: event.title,
    subtitle: `${event.location ?? 'Nearby'}${event.event_time ? ` - ${formatTime(event.event_time)}` : ''}`,
    tag: 'Event',
    tagBg: 'rgba(140,245,228,0.3)',
    tagColor: '#00201c',
  }));

  return [...rideItems, ...toolItems, ...eventItems];
}

// ─── Geocoding, Routing & Carbon ──────────────────────────────────────

export async function geocodeLocation(query: string) {
  const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'User-Agent': 'ShareHub/1.0' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), displayName: data[0].display_name };
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'ShareHub/1.0' } });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.display_name ?? null;
}

export async function getRouteDistance(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number }
) {
  if (!ORS_API_KEY) {
    const R = 6371;
    const dLat = ((dest.lat - origin.lat) * Math.PI) / 180;
    const dLng = ((dest.lng - origin.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((origin.lat * Math.PI) / 180) *
        Math.cos((dest.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const body = {
    coordinates: [[origin.lng, origin.lat], [dest.lng, dest.lat]],
    units: 'km',
  };
  const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: ORS_API_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.routes?.[0]?.summary?.distance ?? null;
}

export async function getRoutePath(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number }
): Promise<{ latitude: number; longitude: number }[] | null> {
  if (!ORS_API_KEY) return null;
  const body = {
    coordinates: [[origin.lng, origin.lat], [dest.lng, dest.lat]],
    units: 'km',
  };
  const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: ORS_API_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const coords = data?.features?.[0]?.geometry?.coordinates;
  if (!coords?.length) return null;
  return coords.map((c: number[]) => ({ latitude: c[1], longitude: c[0] }));
}

const CO2_PER_KM = 0.12; // kg CO₂ saved per km per passenger vs driving alone

export function calculateCarbonSaved(distanceKm: number) {
  return Math.round(distanceKm * CO2_PER_KM * 100) / 100;
}

// ─── Location Sharing ──────────────────────────────────────────────────

export async function updateRideLocation(
  rideId: string,
  latitude: number,
  longitude: number,
  extras?: { heading?: number; speed?: number; accuracy?: number }
) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Please sign in first.');

  const { error } = await supabase.from('ride_locations').upsert(
    {
      ride_id: rideId,
      user_id: userId,
      latitude,
      longitude,
      heading: extras?.heading ?? null,
      speed: extras?.speed ?? null,
      accuracy: extras?.accuracy ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'ride_id,user_id' }
  );
  if (error) throw error;
}

export async function getRideLocation(rideId: string) {
  const { data, error } = await supabase
    .from('ride_locations')
    .select('*')
    .eq('ride_id', rideId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function subscribeRideLocation(
  rideId: string,
  onUpdate: (location: { latitude: number; longitude: number }) => void
) {
  return supabase
    .channel(`ride-location-${rideId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'ride_locations',
        filter: `ride_id=eq.${rideId}`,
      },
      (payload) => {
        if (payload.new) {
          const row = payload.new as any;
          onUpdate({ latitude: row.latitude, longitude: row.longitude });
        }
      }
    )
    .subscribe();
}

// ─── Phone / Contact Info ───────────────────────────────────────────────

export async function updatePhone(phone: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Please sign in first.');

  const { error } = await supabase.from('users').update({ phone }).eq('id', userId);
  if (error) throw error;
}

export async function getRideContactInfo(rideId: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Please sign in first.');

  const { data: booking } = await supabase
    .from('ride_bookings')
    .select('passenger_id')
    .eq('ride_id', rideId)
    .eq('passenger_id', userId)
    .eq('status', 'confirmed')
    .maybeSingle();
  if (!booking) throw new Error('You must be a confirmed passenger to view contact info.');

  const { data: ride } = await supabase
    .from('rides')
    .select('driver_id')
    .eq('id', rideId)
    .single();
  if (!ride) throw new Error('Ride not found.');

  const otherUserId = ride.driver_id;
  const { data: contact } = await supabase
    .from('users')
    .select('full_name, phone')
    .eq('id', otherUserId)
    .single();
  return contact;
}

// ─── Notifications ─────────────────────────────────────────────────────

export type HostedRide = {
  id: string;
  departure: string;
  arrival: string;
  departureTime: string;
  bookings: { id: string; passengerId: string; passengerName: string; passengerAvatar: string; seatLabel: string; status: string }[];
};

export type PassengerRide = {
  bookingId: string;
  rideId: string;
  departure: string;
  arrival: string;
  departureTime: string;
  seatLabel: string;
  hostName: string;
  hostAvatar: string;
  status: string;
};

export async function fetchMyHostedRides(): Promise<HostedRide[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data: rides } = await supabase
    .from('rides')
    .select('*')
    .eq('driver_id', userId)
    .eq('status', 'active');
  if (!rides?.length) return [];

  const rideIds = rides.map((r) => r.id);
  const { data: bookings } = await supabase
    .from('ride_bookings')
    .select('*')
    .in('ride_id', rideIds)
    .neq('status', 'cancelled');
  const bookingMap = new Map<string, any[]>((bookings ?? []).reduce((acc, b) => {
    const list = acc.get(b.ride_id) || [];
    list.push(b);
    acc.set(b.ride_id, list);
    return acc;
  }, new Map()));

  const passengerIds = [...new Set((bookings ?? []).map((b) => b.passenger_id).filter(Boolean))];
  const { data: passengers } = passengerIds.length
    ? await supabase.from('users').select('id, full_name, avatar_url').in('id', passengerIds)
    : { data: [] };
  const passengerMap = new Map((passengers ?? []).map((p) => [p.id, p]));

  return rides.map((ride) => ({
    id: ride.id,
    departure: ride.departure,
    arrival: ride.arrival,
    departureTime: formatTime(ride.departure_time),
    bookings: (bookingMap.get(ride.id) || []).map((b) => ({
      id: b.id,
      passengerId: b.passenger_id,
      passengerName: passengerMap.get(b.passenger_id)?.full_name ?? 'Neighbor',
      passengerAvatar: passengerMap.get(b.passenger_id)?.avatar_url ?? DEFAULT_AVATAR,
      seatLabel: b.seat_label ?? '',
      status: b.status,
    })),
  }));
}

export async function fetchMyPassengerRides(): Promise<PassengerRide[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data: bookings } = await supabase
    .from('ride_bookings')
    .select('*')
    .eq('passenger_id', userId)
    .neq('status', 'cancelled');
  if (!bookings?.length) return [];

  const rideIds = [...new Set(bookings.map((b) => b.ride_id))];
  const { data: rides } = await supabase.from('rides').select('*').in('id', rideIds);
  const rideMap = new Map((rides ?? []).map((r) => [r.id, r]));

  const hostIds = [...new Set((rides ?? []).map((r) => r.driver_id).filter(Boolean))];
  const { data: hosts } = hostIds.length
    ? await supabase.from('users').select('id, full_name, avatar_url').in('id', hostIds)
    : { data: [] };
  const hostMap = new Map((hosts ?? []).map((h) => [h.id, h]));

  return bookings.map((b) => {
    const ride = rideMap.get(b.ride_id);
    const host = ride ? hostMap.get(ride.driver_id) : null;
    return {
      bookingId: b.id,
      rideId: b.ride_id,
      departure: ride?.departure ?? '',
      arrival: ride?.arrival ?? '',
      departureTime: ride ? formatTime(ride.departure_time) : '',
      seatLabel: b.seat_label ?? '',
      hostName: host?.full_name ?? 'Host',
      hostAvatar: host?.avatar_url ?? DEFAULT_AVATAR,
      status: b.status,
    };
  });
}

export async function fetchIncomingToolRequests() {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data: requests } = await supabase
    .from('tool_requests')
    .select('*')
    .eq('owner_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (!requests?.length) return [];

  const toolIds = [...new Set(requests.map((r) => r.tool_id))];
  const { data: tools } = await supabase.from('tools').select('id, name').in('id', toolIds);
  const toolMap = new Map((tools ?? []).map((t) => [t.id, t]));

  const borrowerIds = [...new Set(requests.map((r) => r.borrower_id).filter(Boolean))];
  const { data: borrowers } = borrowerIds.length
    ? await supabase.from('users').select('id, full_name, avatar_url').in('id', borrowerIds)
    : { data: [] };
  const borrowerMap = new Map((borrowers ?? []).map((b) => [b.id, b]));

  return requests.map((r) => ({
    id: r.id,
    toolId: r.tool_id,
    toolName: toolMap.get(r.tool_id)?.name ?? 'Unknown Tool',
    borrowerId: r.borrower_id,
    borrowerName: borrowerMap.get(r.borrower_id)?.full_name ?? 'Neighbor',
    borrowerAvatar: borrowerMap.get(r.borrower_id)?.avatar_url ?? DEFAULT_AVATAR,
    pickupDate: r.pickup_date,
    duration: r.duration,
    message: r.message,
    status: r.status,
  }));
}

export async function approveRidePassenger(bookingId: string) {
  const { error } = await supabase.from('ride_bookings').update({ status: 'confirmed' }).eq('id', bookingId);
  if (error) throw error;
}

export async function denyRidePassenger(bookingId: string) {
  const { error } = await supabase.from('ride_bookings').update({ status: 'cancelled' }).eq('id', bookingId);
  if (error) throw error;
}

export async function withdrawPassenger(bookingId: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Please sign in first.');

  const { data: booking } = await supabase.from('ride_bookings').select('ride_id, seat_label').eq('id', bookingId).single();
  if (!booking) throw new Error('Booking not found.');

  const { error } = await supabase.from('ride_bookings').update({ status: 'cancelled' }).eq('id', bookingId);
  if (error) throw error;

  const { data: ride } = await supabase.from('rides').select('seats_left').eq('id', booking.ride_id).single();
  if (ride) {
    await supabase.from('rides').update({ seats_left: (ride.seats_left ?? 0) + 1 }).eq('id', booking.ride_id);
  }
}

export async function approveToolRequest(requestId: string) {
  const { error } = await supabase.from('tool_requests').update({ status: 'approved' }).eq('id', requestId);
  if (error) throw error;
}

export async function rejectToolRequest(requestId: string) {
  const { error } = await supabase.from('tool_requests').update({ status: 'rejected' }).eq('id', requestId);
  if (error) throw error;
}

export async function cancelToolRequest(requestId: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Please sign in first.');

  const { data: request, error: fetchError } = await supabase
    .from('tool_requests')
    .select('id, borrower_id')
    .eq('id', requestId)
    .single();
  if (fetchError) throw fetchError;
  if (request.borrower_id !== userId) throw new Error('You can only cancel your own requests.');

  const { error } = await supabase
    .from('tool_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId);
  if (error) throw error;
}

export async function completeToolRequest(requestId: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Please sign in first.');

  const { data: request, error: fetchError } = await supabase
    .from('tool_requests')
    .select('id, owner_id, borrower_id')
    .eq('id', requestId)
    .single();
  if (fetchError) throw fetchError;

  const { error } = await supabase
    .from('tool_requests')
    .update({ status: 'returned' })
    .eq('id', requestId);
  if (error) throw error;
}

export async function fetchUserToolRequests() {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data: requests, error } = await supabase
    .from('tool_requests')
    .select('*')
    .or(`borrower_id.eq.${userId},owner_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!requests?.length) return [];

  const toolIds = [...new Set(requests.map((r: any) => r.tool_id).filter(Boolean))];
  const { data: tools } = toolIds.length
    ? await supabase.from('tools').select('id, name, category, emoji').in('id', toolIds)
    : { data: [] };
  const toolMap = new Map((tools ?? []).map((t: any) => [t.id, t]));

  const userIds = [
    ...new Set([
      ...requests.map((r: any) => r.borrower_id).filter(Boolean),
      ...requests.map((r: any) => r.owner_id).filter(Boolean),
    ]),
  ];
  const { data: users } = userIds.length
    ? await supabase.from('users').select('id, full_name, phone, avatar_url').in('id', userIds)
    : { data: [] };
  const userMap = new Map((users ?? []).map((u: any) => [u.id, u]));

  return requests.map((r: any) => {
    const tool = toolMap.get(r.tool_id);
    const borrower = userMap.get(r.borrower_id);
    const owner = userMap.get(r.owner_id);
    return {
      id: r.id,
      toolId: r.tool_id,
      toolName: tool?.name ?? 'Unknown Tool',
      toolCategory: tool?.category ?? 'Tools',
      toolEmoji: tool?.emoji ?? '🔧',
      borrowerId: r.borrower_id,
      borrowerName: borrower?.full_name ?? 'Neighbor',
      borrowerPhone: borrower?.phone ?? null,
      borrowerAvatar: borrower?.avatar_url ?? DEFAULT_AVATAR,
      ownerId: r.owner_id,
      ownerName: owner?.full_name ?? 'Owner',
      ownerPhone: owner?.phone ?? null,
      ownerAvatar: owner?.avatar_url ?? DEFAULT_AVATAR,
      pickupDate: r.pickup_date,
      duration: r.duration,
      message: r.message,
      status: r.status,
    };
  });
}

export async function getRideDetails(rideId: string) {
  const { data: ride, error } = await supabase
    .from('rides')
    .select('*')
    .eq('id', rideId)
    .single();
  if (error) throw error;

  const { data: driver } = await supabase
    .from('users')
    .select('id, full_name, phone, avatar_url')
    .eq('id', ride.driver_id)
    .single();

  const { data: bookings } = await supabase
    .from('ride_bookings')
    .select('*')
    .eq('ride_id', rideId)
    .neq('status', 'cancelled');

  const passengerIds = [...new Set((bookings ?? []).map((b: any) => b.passenger_id).filter(Boolean))];
  const { data: passengers } = passengerIds.length
    ? await supabase.from('users').select('id, full_name, phone, avatar_url').in('id', passengerIds)
    : { data: [] };
  const passengerMap = new Map((passengers ?? []).map((p: any) => [p.id, p]));

  return {
    id: ride.id,
    driverId: ride.driver_id,
    driverName: driver?.full_name ?? 'Host',
    driverPhone: driver?.phone ?? null,
    driverAvatar: driver?.avatar_url ?? DEFAULT_AVATAR,
    departure: ride.departure,
    arrival: ride.arrival,
    departureTime: formatTime(ride.departure_time),
    arrivalTime: formatTime(ride.arrival_time),
    fare: asNumber(ride.fare, 0),
    seatsTotal: asNumber(ride.seats_total, 0),
    seatsLeft: asNumber(ride.seats_left, 0),
    vehicleName: ride.vehicle_name ?? '',
    vehicleNumber: ride.vehicle_number ?? '',
    distanceKm: ride.distance_km ?? null,
    departureLat: ride.departure_lat ?? null,
    departureLng: ride.departure_lng ?? null,
    arrivalLat: ride.arrival_lat ?? null,
    arrivalLng: ride.arrival_lng ?? null,
    status: ride.status,
    bookings: (bookings ?? []).map((b: any) => {
      const passenger = passengerMap.get(b.passenger_id);
      return {
        id: b.id,
        passengerId: b.passenger_id,
        passengerName: passenger?.full_name ?? 'Neighbor',
        passengerPhone: passenger?.phone ?? null,
        passengerAvatar: passenger?.avatar_url ?? DEFAULT_AVATAR,
        seatLabel: b.seat_label ?? '',
        farePaid: asNumber(b.fare_paid, 0),
        status: b.status,
      };
    }),
  };
}

// ─── Map Redirect ───────────────────────────────────────────────────────

export function mapRedirectUrl(lat: number, lng: number, label?: string) {
  const encoded = encodeURIComponent(label ?? 'Destination');
  return Platform.select({
    ios: `maps://?daddr=${lat},${lng}&q=${encoded}`,
    default: `https://maps.google.com/maps?daddr=${lat},${lng}&q=${encoded}`,
  }) as string;
}
