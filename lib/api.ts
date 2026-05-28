import { supabase } from './supabase';

export type Profile = {
  id: string;
  full_name: string;
  email: string;
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

export async function signUpWithEmail(fullName: string, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  if (data.user) await ensureProfile(data.user.id, email, fullName);
  return data;
}

export async function ensureProfile(userId: string, email: string, fullName?: string) {
  const { data: existingProfile, error: existingError } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('id', userId)
    .maybeSingle();
  if (existingError) throw existingError;

  const fallbackName = fullName?.trim() || existingProfile?.full_name || 'Neighbor';
  const profilePayload =
    fullName?.trim() || !existingProfile
      ? { id: userId, email, full_name: fallbackName }
      : { id: userId, email };

  const { error } = await supabase.from('users').upsert(
    profilePayload,
    { onConflict: 'id' }
  );
  if (error) throw error;

  if (!existingProfile && !fullName?.trim()) {
    const { error: nameError } = await supabase.from('users').update({ full_name: fallbackName }).eq('id', userId);
    if (nameError) throw nameError;
  }

  await supabase
    .from('user_impact')
    .upsert({ user_id: userId }, { onConflict: 'user_id' });
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
    .eq('status', 'available')
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
    status: 'confirmed',
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
    .update({
      seats_left: seatsLeft,
      status: seatsLeft === 0 ? 'full' : 'available',
    })
    .eq('id', input.rideId);

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
}) {
  const driverId = await getCurrentUserId();
  if (!driverId) throw new Error('Please sign in first.');

  const seatsTotal = Math.max(1, Math.round(input.seatsTotal));
  const { error } = await supabase.from('rides').insert({
    driver_id: driverId,
    departure: input.departure,
    arrival: input.arrival,
    departure_time: new Date(input.departureTime).toISOString(),
    arrival_time: input.arrivalTime ? new Date(input.arrivalTime).toISOString() : null,
    fare: input.fare,
    seats_total: seatsTotal,
    seats_left: seatsTotal,
    co2_saving: input.co2Saving ?? 0,
    vehicle_name: input.vehicleName ?? null,
    vehicle_number: input.vehicleNumber ?? null,
    status: 'available',
  });
  if (error) throw error;

  await supabase.from('activity_feed').insert({
    user_id: driverId,
    activity_type: 'ride',
    action: 'created a ride to',
    target: input.arrival,
    badge: 'Available',
  });
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
  });
  if (error) throw error;

  await supabase.from('activity_feed').insert({
    user_id: ownerId,
    activity_type: 'tool',
    action: 'shared',
    target: input.name,
    badge: 'Available',
  });
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
    status: 'active',
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
