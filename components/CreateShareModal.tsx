import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors } from '../constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { createRide, createTool, createToolRequest, getRouteDistance, calculateCarbonSaved } from '../lib/api';
import { supabase } from '../lib/supabase';
import LocationPickerModal from './LocationPickerModal';

type CreateType = 'ride' | 'tool' | 'request';
type RideStep = 'type' | 'departure' | 'arrival' | 'details';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated?: () => void;
  initialType?: CreateType | null;
};

const CHOICES: { type: CreateType; title: string; desc: string; iconName: string }[] = [
  { type: 'ride', title: 'Create Co-Ride', desc: 'Offer seats on your route.', iconName: 'directions-car' },
  { type: 'tool', title: 'Lend Nabourly', desc: 'Lend an item, helper, or share anything.', iconName: 'card-giftcard' },
  { type: 'request', title: 'Request Nabourly', desc: 'Ask to borrow an item or get support.', iconName: 'inbox' },
];

function toNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toLocalISOString(date: Date): string {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function getDefaultDepartureTime(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 30);
  return toLocalISOString(date);
}

export default function CreateShareModal({ visible, onClose, onCreated, initialType = null }: Props) {
  const [type, setType] = useState<CreateType | null>(initialType);
  const [saving, setSaving] = useState(false);
  const [rideStep, setRideStep] = useState<RideStep>('type');
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      overlayAnim.setValue(0);
    }
  }, [visible, overlayAnim]);

  const [departureLocation, setDepartureLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [arrivalLocation, setArrivalLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [departureTime, setDepartureTime] = useState(getDefaultDepartureTime());
  const [arrivalTime, setArrivalTime] = useState('');
  const [fare, setFare] = useState('');
  const [seats, setSeats] = useState('3');
  const [co2Saving, setCo2Saving] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);

  const [toolName, setToolName] = useState('');
  const [toolBrand, setToolBrand] = useState('');
  const [toolCategory, setToolCategory] = useState('');
  const [toolCondition, setToolCondition] = useState('Good');
  const [toolDescription, setToolDescription] = useState('');
  const [toolEmoji, setToolEmoji] = useState('');

  const [requestName, setRequestName] = useState('');
  const [requestCategory, setRequestCategory] = useState('');
  const [requestDescription, setRequestDescription] = useState('');
  const [requestMessage, setRequestMessage] = useState('');

  const [departurePickerVisible, setDeparturePickerVisible] = useState(false);
  const [arrivalPickerVisible, setArrivalPickerVisible] = useState(false);

  const selectedTitle = useMemo(() => CHOICES.find((choice) => choice.type === type)?.title, [type]);

  useEffect(() => {
    if (visible) {
      resetState();
    }
  }, [visible]);

  function resetState() {
    setType(initialType);
    setRideStep('type');
    setDepartureLocation(null);
    setArrivalLocation(null);
    setDepartureTime(getDefaultDepartureTime());
    setArrivalTime('');
    setFare('');
    setSeats('3');
    setCo2Saving('');
    setVehicleName('');
    setVehicleNumber('');
    setRouteDistance(null);
    setToolName('');
    setToolBrand('');
    setToolCategory('');
    setToolCondition('Good');
    setToolDescription('');
    setToolEmoji('');
    setRequestName('');
    setRequestCategory('');
    setRequestDescription('');
    setRequestMessage('');
  }

  function resetAndClose() {
    resetState();
    onClose();
  }

  useEffect(() => {
    if (departureLocation && arrivalLocation) {
      calculateRoute();
    }
  }, [departureLocation, arrivalLocation]);

  async function calculateRoute() {
    if (!departureLocation || !arrivalLocation) return;
    setCalculatingRoute(true);
    try {
      const distance = await getRouteDistance(
        { lat: departureLocation.lat, lng: departureLocation.lng },
        { lat: arrivalLocation.lat, lng: arrivalLocation.lng }
      );
      if (distance) {
        setRouteDistance(distance);
        const co2 = calculateCarbonSaved(distance);
        setCo2Saving(co2.toString());
      }
    } catch {
      // Ignore calculation errors
    } finally {
      setCalculatingRoute(false);
    }
  }

  function handleDepartureSelect(location: { lat: number; lng: number; address: string }) {
    setDepartureLocation(location);
    setDeparturePickerVisible(false);
    setRideStep('arrival');
  }

  function handleArrivalSelect(location: { lat: number; lng: number; address: string }) {
    setArrivalLocation(location);
    setArrivalPickerVisible(false);
    setRideStep('details');
  }

  async function handleSubmit() {
    if (!type) return;

    try {
      setSaving(true);

      if (type === 'ride') {
        if (!departureLocation || !arrivalLocation) {
          Alert.alert('Missing locations', 'Please select both departure and arrival locations.');
          return;
        }

        await createRide({
          departure: departureLocation.address,
          arrival: arrivalLocation.address,
          departureTime: departureTime,
          arrivalTime: arrivalTime.trim() || undefined,
          fare: toNumber(fare),
          seatsTotal: toNumber(seats, 1),
          co2Saving: toNumber(co2Saving),
          vehicleName: vehicleName.trim() || undefined,
          vehicleNumber: vehicleNumber.trim() || undefined,
          departureLat: departureLocation.lat,
          departureLng: departureLocation.lng,
          arrivalLat: arrivalLocation.lat,
          arrivalLng: arrivalLocation.lng,
        });
      }

      if (type === 'tool') {
        if (!toolName.trim() || !toolCategory.trim()) {
          Alert.alert('Missing item details', 'Please enter the item name and category.');
          return;
        }

        await createTool({
          name: toolName.trim(),
          brand: toolBrand.trim() || undefined,
          category: toolCategory.trim(),
          description: toolDescription.trim() || undefined,
          condition: toolCondition.trim() || undefined,
          emoji: toolEmoji.trim() || undefined,
        });
      }

      if (type === 'request') {
        if (!requestName.trim() || !requestCategory.trim()) {
          Alert.alert('Missing details', 'Please enter the item name and category.');
          return;
        }

        await createTool({
          name: requestName.trim(),
          category: requestCategory.trim(),
          description: requestDescription.trim() || undefined,
          emoji: '📩',
          type: 'request',
        });
      }

      Alert.alert('Saved', type === 'request' ? 'Your request has been posted. Lenders will be notified.' : `${selectedTitle} has been added.`);
      onCreated?.();
      resetAndClose();
    } catch (error) {
      Alert.alert('Could not save', JSON.stringify(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={resetAndClose}>
        <Animated.View style={[styles.backdrop, { opacity: overlayAnim }]}>
          <Pressable style={styles.backdropPress} onPress={resetAndClose} />
          <View style={styles.sheet}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>
                  {type === 'ride' && rideStep !== 'type'
                    ? getStepTitle(rideStep)
                    : type
                    ? selectedTitle
                    : 'What do you want to add?'}
                </Text>
                <Text style={styles.subtitle}>
                  {type === 'ride' && rideStep !== 'type'
                    ? getStepSubtitle(rideStep)
                    : 'Create something for your neighborhood.'}
                </Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={resetAndClose}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            {!type ? (
              <View style={styles.choiceList}>
                {CHOICES.map((choice) => (
                  <Pressable key={choice.type} style={styles.choice} onPress={() => {
                    setType(choice.type);
                    if (choice.type === 'ride') {
                      setRideStep('departure');
                      setDeparturePickerVisible(true);
                    }
                  }}>
                    <View style={styles.choiceIconWrap}>
                      <MaterialIcons name={choice.iconName as any} size={24} color={Colors.primary} />
                    </View>
                    <View style={styles.choiceText}>
                      <Text style={styles.choiceTitle}>{choice.title}</Text>
                      <Text style={styles.choiceDesc}>{choice.desc}</Text>
                    </View>
                    <Text style={styles.choiceArrow}>›</Text>
                  </Pressable>
                ))}
              </View>
            ) : type === 'ride' ? (
              <RideForm
                step={rideStep}
                departure={departureLocation}
                arrival={arrivalLocation}
                departureTime={departureTime}
                arrivalTime={arrivalTime}
                fare={fare}
                seats={seats}
                co2Saving={co2Saving}
                vehicleName={vehicleName}
                vehicleNumber={vehicleNumber}
                routeDistance={routeDistance}
                calculatingRoute={calculatingRoute}
                onDeparturePress={() => setDeparturePickerVisible(true)}
                onArrivalPress={() => setArrivalPickerVisible(true)}
                onDepartureTimeChange={setDepartureTime}
                onArrivalTimeChange={setArrivalTime}
                onFareChange={setFare}
                onSeatsChange={setSeats}
                onCo2Change={setCo2Saving}
                onVehicleNameChange={setVehicleName}
                onVehicleNumberChange={setVehicleNumber}
                onBack={() => {
                  if (rideStep === 'arrival') setRideStep('departure');
                  else if (rideStep === 'details') setRideStep('arrival');
                  else setType(null);
                }}
                onNext={() => {
                  if (rideStep === 'departure') setRideStep('arrival');
                  else if (rideStep === 'arrival') setRideStep('details');
                }}
              />
            ) : type === 'tool' ? (
              <ToolForm
                name={toolName}
                brand={toolBrand}
                category={toolCategory}
                condition={toolCondition}
                description={toolDescription}
                emoji={toolEmoji}
                onNameChange={setToolName}
                onBrandChange={setToolBrand}
                onCategoryChange={setToolCategory}
                onConditionChange={setToolCondition}
                onDescriptionChange={setToolDescription}
                onEmojiChange={setToolEmoji}
              />
            ) : (
              <ToolRequestForm
                name={requestName}
                category={requestCategory}
                description={requestDescription}
                message={requestMessage}
                onNameChange={setRequestName}
                onCategoryChange={setRequestCategory}
                onDescriptionChange={setRequestDescription}
                onMessageChange={setRequestMessage}
              />
            )}

            {(type === 'tool' || type === 'request' || (type === 'ride' && rideStep === 'details')) && (
              <View style={styles.footer}>
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => type === 'ride' ? setRideStep('arrival') : setType(null)}
                >
                  <Text style={styles.secondaryText}>Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryBtn, saving && { opacity: 0.65 }]}
                  onPress={handleSubmit}
                  disabled={saving}
                >
                  <Text style={styles.primaryText}>{saving ? 'Saving...' : type === 'request' ? 'Send Request' : 'Save'}</Text>
                </Pressable>
              </View>
            )}
          </View>
        </Animated.View>
      </Modal>

      <LocationPickerModal
        visible={departurePickerVisible}
        onClose={() => {
          setDeparturePickerVisible(false);
          if (!departureLocation) {
            setType(null);
          }
        }}
        onSelect={handleDepartureSelect}
        title="Select Start Location"
      />

      <LocationPickerModal
        visible={arrivalPickerVisible}
        onClose={() => {
          setArrivalPickerVisible(false);
          if (!arrivalLocation) {
            setRideStep('departure');
          }
        }}
        onSelect={handleArrivalSelect}
        title="Select End Location"
      />
    </>
  );
}

function getStepTitle(step: RideStep): string {
  switch (step) {
    case 'departure': return 'Start Location';
    case 'arrival': return 'End Location';
    case 'details': return 'Ride Details';
    default: return 'Create Co-Ride';
  }
}

function getStepSubtitle(step: RideStep): string {
  switch (step) {
    case 'departure': return 'Tap on the map to select your starting point';
    case 'arrival': return 'Tap on the map to select your destination';
    case 'details': return 'Set departure time and other details';
    default: return '';
  }
}

interface RideFormProps {
  step: RideStep;
  departure: { lat: number; lng: number; address: string } | null;
  arrival: { lat: number; lng: number; address: string } | null;
  departureTime: string;
  arrivalTime: string;
  fare: string;
  seats: string;
  co2Saving: string;
  vehicleName: string;
  vehicleNumber: string;
  routeDistance: number | null;
  calculatingRoute: boolean;
  onDeparturePress: () => void;
  onArrivalPress: () => void;
  onDepartureTimeChange: (value: string) => void;
  onArrivalTimeChange: (value: string) => void;
  onFareChange: (value: string) => void;
  onSeatsChange: (value: string) => void;
  onCo2Change: (value: string) => void;
  onVehicleNameChange: (value: string) => void;
  onVehicleNumberChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

function RideForm({
  step,
  departure,
  arrival,
  departureTime,
  arrivalTime,
  fare,
  seats,
  co2Saving,
  vehicleName,
  vehicleNumber,
  routeDistance,
  calculatingRoute,
  onDeparturePress,
  onArrivalPress,
  onDepartureTimeChange,
  onArrivalTimeChange,
  onFareChange,
  onSeatsChange,
  onCo2Change,
  onVehicleNameChange,
  onVehicleNumberChange,
  onBack,
  onNext,
}: RideFormProps) {
  if (step === 'departure') {
    return (
      <View style={styles.formContainer}>
        {departure ? (
          <View style={styles.locationCard}>
            <View style={styles.locationDot} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Start</Text>
              <Text style={styles.locationAddress} numberOfLines={2}>{departure.address}</Text>
            </View>
            <Pressable style={styles.changeBtn} onPress={onDeparturePress}>
              <Text style={styles.changeBtnText}>Change</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.locationPickerBtn} onPress={onDeparturePress}>
            <Text style={styles.locationPickerIcon}>📍</Text>
            <Text style={styles.locationPickerText}>Tap to select start location</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (step === 'arrival') {
    return (
      <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent}>
        {departure && (
          <View style={styles.locationCard}>
            <View style={[styles.locationDot, { backgroundColor: Colors.primary }]} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>From</Text>
              <Text style={styles.locationAddress} numberOfLines={1}>{departure.address}</Text>
            </View>
          </View>
        )}

        <View style={styles.verticalConnector} />

        {arrival ? (
          <View style={styles.locationCard}>
            <View style={[styles.locationDot, { backgroundColor: Colors.blueMid }]} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>To</Text>
              <Text style={styles.locationAddress} numberOfLines={2}>{arrival.address}</Text>
            </View>
            <Pressable style={styles.changeBtn} onPress={onArrivalPress}>
              <Text style={styles.changeBtnText}>Change</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.locationPickerBtn} onPress={onArrivalPress}>
            <Text style={styles.locationPickerIcon}>📍</Text>
            <Text style={styles.locationPickerText}>Tap to select destination</Text>
          </Pressable>
        )}

        {routeDistance && (
          <View style={styles.routeInfo}>
            <Text style={styles.routeInfoText}>
              {routeDistance.toFixed(1)} km • ~{Math.round(routeDistance / 30 * 60)} min drive
            </Text>
          </View>
        )}

        {calculatingRoute && (
          <View style={styles.routeInfo}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.routeInfoText}>Calculating route...</Text>
          </View>
        )}

        <View style={styles.btnRow}>
          <Pressable style={styles.secondaryBtn} onPress={onBack}>
            <Text style={styles.secondaryText}>Back</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryBtn, !arrival && styles.primaryBtnDisabled]}
            onPress={onNext}
            disabled={!arrival}
          >
            <Text style={styles.primaryText}>Next</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // step === 'details'
  return (
    <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent}>
      {departure && (
        <View style={styles.locationSummary}>
          <View style={styles.locationSummaryItem}>
            <View style={[styles.locationDot, { backgroundColor: Colors.primary }]} />
            <Text style={styles.locationSummaryText} numberOfLines={1}>{departure.address}</Text>
          </View>
          {routeDistance && (
            <Text style={styles.locationSummaryDistance}>{routeDistance.toFixed(1)} km</Text>
          )}
          <View style={styles.locationSummaryItem}>
            <View style={[styles.locationDot, { backgroundColor: Colors.blueMid }]} />
            <Text style={styles.locationSummaryText} numberOfLines={1}>{arrival?.address}</Text>
          </View>
        </View>
      )}

      <NativeDateTimePicker
        label="Departure time"
        value={departureTime}
        onChange={onDepartureTimeChange}
      />
      <NativeDateTimePicker
        label="Arrival time (optional)"
        value={arrivalTime}
        onChange={onArrivalTimeChange}
        optional
      />

      <Field label="Fare (₹)" value={fare} onChangeText={onFareChange} placeholder="0" keyboardType="numeric" />
      <Field label="Vehicle" value={vehicleName} onChangeText={onVehicleNameChange} placeholder="Model and color" />
      <Field label="Vehicle number" value={vehicleNumber} onChangeText={onVehicleNumberChange} placeholder="KA 01 AB 1234" />
    </ScrollView>
  );
}

interface ToolFormProps {
  name: string;
  brand: string;
  category: string;
  condition: string;
  description: string;
  emoji: string;
  onNameChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onConditionChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onEmojiChange: (value: string) => void;
}

function ToolForm({
  name,
  brand,
  category,
  condition,
  description,
  emoji,
  onNameChange,
  onBrandChange,
  onCategoryChange,
  onConditionChange,
  onDescriptionChange,
  onEmojiChange,
}: ToolFormProps) {
  const [uploadingImage, setUploadingImage] = useState(false);

  const decodeBase64 = (base64: string): ArrayBuffer => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const bufferLength = base64.length * 0.75;
    const len = base64.length;
    let p = 0;
    let j = 0;
    if (base64[len - 1] === '=') {
      p++;
      if (base64[len - 2] === '=') p++;
    }
    const arrayBuffer = new ArrayBuffer(bufferLength - p);
    const bytes = new Uint8Array(arrayBuffer);
    for (let i = 0; i < len; i += 4) {
      const encoded1 = chars.indexOf(base64[i]);
      const encoded2 = chars.indexOf(base64[i + 1]);
      const encoded3 = chars.indexOf(base64[i + 2]);
      const encoded4 = chars.indexOf(base64[i + 3]);
      const bytes1 = (encoded1 << 2) | (encoded2 >> 4);
      const bytes2 = ((encoded2 & 15) << 4) | (encoded3 >> 2);
      const bytes3 = ((encoded3 & 3) << 6) | (encoded4 & 63);
      bytes[j++] = bytes1;
      if (encoded3 !== -1 && base64[i + 2] !== '=') {
        bytes[j++] = bytes2;
      }
      if (encoded4 !== -1 && base64[i + 3] !== '=') {
        bytes[j++] = bytes3;
      }
    }
    return arrayBuffer;
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'We need permission to access your library to upload a picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;

      setUploadingImage(true);
      const uri = result.assets[0].uri;
      
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      const arrayBuffer = decodeBase64(base64);
      
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `tools/${fileName}`;

      const { data, error } = await supabase.storage
        .from('tools')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
          upsert: true
        });

      if (error) {
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from('tools')
        .getPublicUrl(filePath);

      onEmojiChange(urlData.publicUrl);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Upload failed', err.message || 'An error occurred during image upload.');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent}>
      <Field label="Item name" value={name} onChangeText={onNameChange} placeholder="Camping Tent, Wrench, Board Game..." />
      <Field label="Brand" value={brand} onChangeText={onBrandChange} placeholder="Brand/Model (optional)" />
      <Field label="Category" value={category} onChangeText={onCategoryChange} placeholder="Electronics, Garden, Kitchen, etc." />
      <Field label="Condition Description" value={condition} onChangeText={onConditionChange} placeholder="Good" />
      
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Image</Text>
        {emoji && emoji.startsWith('http') ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: emoji }} style={styles.imagePreview} contentFit="cover" />
            <View style={styles.imageActionButtons}>
              <Pressable style={styles.changeImageBtn} onPress={handlePickImage} disabled={uploadingImage}>
                {uploadingImage ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.changeImageText}>Change</Text>}
              </Pressable>
              <Pressable style={styles.deleteImageBtn} onPress={() => onEmojiChange('')}>
                <Text style={styles.deleteImageText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.uploadImageBtn} onPress={handlePickImage} disabled={uploadingImage}>
            {uploadingImage ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <MaterialIcons name="add-a-photo" size={24} color={Colors.primary} />
                <Text style={styles.uploadImageText}>Upload Image</Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      <Field label="Description" value={description} onChangeText={onDescriptionChange} placeholder="Describe the item, how to use it, etc." multiline />
    </ScrollView>
  );
}

interface ToolRequestFormProps {
  name: string;
  category: string;
  description: string;
  message: string;
  onNameChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onMessageChange: (value: string) => void;
}

function ToolRequestForm({
  name,
  category,
  description,
  message,
  onNameChange,
  onCategoryChange,
  onDescriptionChange,
  onMessageChange,
}: ToolRequestFormProps) {
  return (
    <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent}>
      <View style={{ backgroundColor: Colors.accentBg, borderRadius: 12, padding: 14 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.primary }}>
          Your request will be visible to lenders who have matching items.
        </Text>
      </View>
      <Field label="What do you need?" value={name} onChangeText={onNameChange} placeholder="Camping Tent, Wrench, Board Game, etc." />
      <Field label="Category" value={category} onChangeText={onCategoryChange} placeholder="Electronics, Garden, Kitchen, etc." />
      <Field label="Description (optional)" value={description} onChangeText={onDescriptionChange} placeholder="What will you use it for?" multiline />
      <Field label="Message to lenders (optional)" value={message} onChangeText={onMessageChange} placeholder="Hi, I need this for a weekend project..." multiline />
    </ScrollView>
  );
}

function NativeDateTimePicker({
  label,
  value,
  onChange,
  optional,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  optional?: boolean;
}) {
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(() => {
    if (value) {
      const d = new Date(value);
      return isNaN(d.getTime()) ? new Date() : d;
    }
    return new Date();
  });

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setTempDate(d);
      }
    } else {
      setTempDate(new Date());
    }
  }, [value]);

  const displayValue = value
    ? new Date(value).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Tap to set';

  function handleDateChange(_: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === 'android') setShowDate(false);
    if (selectedDate) {
      const updated = new Date(tempDate);
      updated.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setTempDate(updated);
      if (Platform.OS === 'android') {
        setShowTime(true);
      } else {
        onChange(toLocalISOString(updated));
      }
    }
  }

  function handleTimeChange(_: DateTimePickerEvent, selectedTime?: Date) {
    if (Platform.OS === 'android') setShowTime(false);
    if (selectedTime) {
      const updated = new Date(tempDate);
      updated.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      setTempDate(updated);
      onChange(toLocalISOString(updated));
    }
  }

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={styles.datePickerBtn} onPress={() => setShowDate(true)}>
        <Text style={[styles.datePickerText, !value && { color: '#9ca3af' }]}>
          {displayValue}
        </Text>
        <MaterialIcons name="calendar-today" size={18} color={Colors.muted} />
      </Pressable>

      {showDate && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="calendar"
          minimumDate={new Date()}
          onChange={handleDateChange}
        />
      )}

      {showTime && (
        <DateTimePicker
          value={tempDate}
          mode="time"
          display="clock"
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, multiline }: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'numeric';
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  backdropPress: {
    flex: 1,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.muted,
    marginTop: 4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 20,
    color: Colors.dark,
    fontWeight: '300',
  },
  choiceList: {
    padding: 20,
    gap: 12,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  choiceIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceText: {
    flex: 1,
  },
  choiceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
  },
  choiceDesc: {
    fontSize: 13,
    color: Colors.muted,
    marginTop: 2,
  },
  choiceArrow: {
    fontSize: 24,
    color: Colors.muted,
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    padding: 20,
    gap: 16,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.dark,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  datePickerText: {
    fontSize: 15,
    color: Colors.dark,
  },
  datePickerIcon: {
    fontSize: 18,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    backgroundColor: Colors.surface,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.dark,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationAddress: {
    fontSize: 14,
    color: Colors.dark,
    marginTop: 2,
  },
  changeBtn: {
    backgroundColor: Colors.accentBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  locationPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    gap: 8,
  },
  locationPickerIcon: {
    fontSize: 20,
  },
  locationPickerText: {
    fontSize: 14,
    color: Colors.muted,
  },
  verticalConnector: {
    width: 2,
    height: 20,
    backgroundColor: Colors.border,
    marginLeft: 19,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentBg,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  routeInfoText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
  locationSummary: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  locationSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationSummaryText: {
    flex: 1,
    fontSize: 13,
    color: Colors.dark,
  },
  locationSummaryDistance: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.muted,
    textAlign: 'center',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'space-between',
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  imageActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  changeImageBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeImageText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteImageBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteImageText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  uploadImageBtn: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.accentBg,
  },
  uploadImageText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});
