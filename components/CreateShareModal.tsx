import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Colors } from '../constants/theme';
import { createEvent, createRide, createTool } from '../lib/api';

type CreateType = 'ride' | 'tool' | 'event';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated?: () => void;
  initialType?: CreateType | null;
};

const CHOICES: { type: CreateType; title: string; desc: string; icon: string }[] = [
  { type: 'ride', title: 'Create Co-Ride', desc: 'Offer seats on your route.', icon: '🚗' },
  { type: 'tool', title: 'Lend Item', desc: 'Share a tool or household item.', icon: '🔧' },
  { type: 'event', title: 'Organize Event', desc: 'Start a local activity.', icon: '🌱' },
];

function toNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function tomorrowMorning() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(8, 30, 0, 0);
  return date.toISOString().slice(0, 16);
}

export default function CreateShareModal({ visible, onClose, onCreated, initialType = null }: Props) {
  const [type, setType] = useState<CreateType | null>(initialType);
  const [saving, setSaving] = useState(false);

  const [rideDeparture, setRideDeparture] = useState('');
  const [rideArrival, setRideArrival] = useState('');
  const [rideDepartureTime, setRideDepartureTime] = useState(tomorrowMorning());
  const [rideArrivalTime, setRideArrivalTime] = useState('');
  const [rideFare, setRideFare] = useState('');
  const [rideSeats, setRideSeats] = useState('3');
  const [rideCo2, setRideCo2] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');

  const [toolName, setToolName] = useState('');
  const [toolBrand, setToolBrand] = useState('');
  const [toolCategory, setToolCategory] = useState('Power Tools');
  const [toolCondition, setToolCondition] = useState('Good');
  const [toolDescription, setToolDescription] = useState('');
  const [toolEmoji, setToolEmoji] = useState('');

  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventTime, setEventTime] = useState(tomorrowMorning());

  const selectedTitle = useMemo(() => CHOICES.find((choice) => choice.type === type)?.title, [type]);

  function resetAndClose() {
    setType(initialType);
    onClose();
  }

  async function handleSubmit() {
    if (!type) return;

    try {
      setSaving(true);

      if (type === 'ride') {
        if (!rideDeparture.trim() || !rideArrival.trim() || !rideDepartureTime.trim()) {
          Alert.alert('Missing ride details', 'Please enter departure, arrival, and departure time.');
          return;
        }

        await createRide({
          departure: rideDeparture.trim(),
          arrival: rideArrival.trim(),
          departureTime: rideDepartureTime,
          arrivalTime: rideArrivalTime.trim() || undefined,
          fare: toNumber(rideFare),
          seatsTotal: toNumber(rideSeats, 1),
          co2Saving: toNumber(rideCo2),
          vehicleName: vehicleName.trim() || undefined,
          vehicleNumber: vehicleNumber.trim() || undefined,
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

      if (type === 'event') {
        if (!eventTitle.trim()) {
          Alert.alert('Missing event title', 'Please enter a title for the event.');
          return;
        }

        await createEvent({
          title: eventTitle.trim(),
          description: eventDescription.trim() || undefined,
          location: eventLocation.trim() || undefined,
          eventTime: eventTime.trim() || undefined,
        });
      }

      Alert.alert('Saved', `${selectedTitle} has been added.`);
      onCreated?.();
      resetAndClose();
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={resetAndClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{type ? selectedTitle : 'What do you want to add?'}</Text>
              <Text style={styles.subtitle}>Create something for your neighborhood.</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={resetAndClose}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          {!type ? (
            <View style={styles.choiceList}>
              {CHOICES.map((choice) => (
                <Pressable key={choice.type} style={styles.choice} onPress={() => setType(choice.type)}>
                  <Text style={styles.choiceIcon}>{choice.icon}</Text>
                  <View style={styles.choiceText}>
                    <Text style={styles.choiceTitle}>{choice.title}</Text>
                    <Text style={styles.choiceDesc}>{choice.desc}</Text>
                  </View>
                  <Text style={styles.choiceArrow}>›</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <>
              <ScrollView
                style={styles.formScroll}
                contentContainerStyle={styles.form}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {type === 'ride' ? (
                  <>
                    <Field label="Departure" value={rideDeparture} onChangeText={setRideDeparture} placeholder="Starting point" />
                    <Field label="Arrival" value={rideArrival} onChangeText={setRideArrival} placeholder="Destination" />
                    <Field label="Departure time" value={rideDepartureTime} onChangeText={setRideDepartureTime} placeholder="2026-05-01T08:30" />
                    <Field label="Arrival time" value={rideArrivalTime} onChangeText={setRideArrivalTime} placeholder="2026-05-01T09:30" />
                    <Field label="Fare" value={rideFare} onChangeText={setRideFare} placeholder="120" keyboardType="numeric" />
                    <Field label="Seats" value={rideSeats} onChangeText={setRideSeats} placeholder="3" keyboardType="numeric" />
                    <Field label="CO2 saving kg" value={rideCo2} onChangeText={setRideCo2} placeholder="2.4" keyboardType="numeric" />
                    <Field label="Vehicle" value={vehicleName} onChangeText={setVehicleName} placeholder="Vehicle model and color" />
                    <Field label="Vehicle number" value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="Vehicle number" />
                  </>
                ) : null}

                {type === 'tool' ? (
                  <>
                    <Field label="Item name" value={toolName} onChangeText={setToolName} placeholder="Power Drill" />
                    <Field label="Brand" value={toolBrand} onChangeText={setToolBrand} placeholder="Bosch GSB 500" />
                    <Field label="Category" value={toolCategory} onChangeText={setToolCategory} placeholder="Power Tools" />
                    <Field label="Condition" value={toolCondition} onChangeText={setToolCondition} placeholder="Good" />
                    <Field label="Emoji" value={toolEmoji} onChangeText={setToolEmoji} placeholder="🔧" />
                    <Field label="Description" value={toolDescription} onChangeText={setToolDescription} placeholder="Useful for wall mounting and DIY." multiline />
                  </>
                ) : null}

                {type === 'event' ? (
                  <>
                    <Field label="Event title" value={eventTitle} onChangeText={setEventTitle} placeholder="Event title" />
                    <Field label="Location" value={eventLocation} onChangeText={setEventLocation} placeholder="Event location" />
                    <Field label="Event time" value={eventTime} onChangeText={setEventTime} placeholder="2026-05-01T08:30" />
                    <Field label="Description" value={eventDescription} onChangeText={setEventDescription} placeholder="Bring gloves and water bottles." multiline />
                  </>
                ) : null}
              </ScrollView>

              <View style={styles.footer}>
                <Pressable style={styles.secondaryBtn} onPress={() => setType(null)}>
                  <Text style={styles.secondaryText}>Back</Text>
                </Pressable>
                <Pressable style={[styles.primaryBtn, saving && { opacity: 0.65 }]} onPress={handleSubmit} disabled={saving}>
                  <Text style={styles.primaryText}>{saving ? 'Saving...' : 'Save'}</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8b9488"
        multiline={multiline}
        keyboardType={keyboardType}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.dark,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.muted,
    marginTop: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.dark,
    marginTop: -2,
  },
  choiceList: {
    gap: 12,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  choiceIcon: {
    fontSize: 28,
  },
  choiceText: {
    flex: 1,
    gap: 2,
  },
  choiceTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.dark,
  },
  choiceDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.muted,
  },
  choiceArrow: {
    fontSize: 24,
    color: Colors.primary,
    fontWeight: '700',
  },
  formScroll: {
    maxHeight: Platform.OS === 'web' ? 520 : 460,
  },
  form: {
    gap: 12,
    paddingBottom: 4,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.darkMid,
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.dark,
  },
  multiline: {
    minHeight: 96,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.white,
  },
});
