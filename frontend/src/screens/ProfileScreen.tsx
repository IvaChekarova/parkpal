import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Image,
  Modal,
  Switch,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import AppHeader from "../components/AppHeader";
import ScreenWrapper from "../components/ScreenWrapper";
import theme from "../theme";
import { useAuth } from "../context/AuthContext";
import {
  SupportedCurrency,
  useCurrency,
} from "../context/CurrencyContext";
import { reservationApi } from "../services/reservationApi";
import { getAbsoluteProfileImageUrl, userApi } from "../services/userApi";

let Feather: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Feather = require("@expo/vector-icons").Feather;
} catch (e) {
  Feather = null;
}

type ModalType = "language" | "currency" | "notifications" | "support" | "privacy" | null;
type SettingsAction = {
  key: string;
  value?: string;
  modal?: Exclude<ModalType, null>;
};

const languages = ["English", "Македонски"];
const currencies: SupportedCurrency[] = ["EUR", "MKD", "USD"];

const formatRole = (role?: string) => {
  if (!role) return "Driver";
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
};

const formatMemberSince = (createdAt?: string) => {
  if (!createdAt) return "Not available";

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
};

const getInitial = (name?: string | null) => {
  return name?.trim().charAt(0).toUpperCase() || "P";
};

const getNotificationStatus = (
  reservationReminders: boolean,
  availabilityUpdates: boolean
) => {
  return reservationReminders || availabilityUpdates ? "On" : "Off";
};

export default function ProfileScreen() {
  const { logout, token, updateUser, user } = useAuth();
  const { selectedCurrency, setSelectedCurrency } = useCurrency();
  const [language, setLanguage] = React.useState("English");
  const [activeModal, setActiveModal] = React.useState<ModalType>(null);
  const [reservationReminders, setReservationReminders] = React.useState(true);
  const [availabilityUpdates, setAvailabilityUpdates] = React.useState(false);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = React.useState(false);
  const [reservationCount, setReservationCount] = React.useState<number | null>(
    null
  );
  const profileImageUri = getAbsoluteProfileImageUrl(user?.profileImageUrl);

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;

      const loadReservationCount = async () => {
        if (!token) {
          setReservationCount(null);
          return;
        }

        try {
          const reservations = await reservationApi.getMyReservations(token);
          if (isMounted) {
            setReservationCount(reservations.length);
          }
        } catch (_err) {
          if (isMounted) {
            setReservationCount(null);
          }
        }
      };

      void loadReservationCount();

      return () => {
        isMounted = false;
      };
    }, [token])
  );

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => logout() },
    ]);
  };

  const actions: SettingsAction[] = [
    {
      key: "Notifications",
      value: getNotificationStatus(reservationReminders, availabilityUpdates),
      modal: "notifications" as const,
    },
    { key: "Currency", value: selectedCurrency, modal: "currency" as const },
    { key: "Language", value: language, modal: "language" as const },
    { key: "Privacy & Security", modal: "privacy" as const },
    { key: "Support", modal: "support" as const },
    { key: "Payment methods", value: "Coming soon" },
  ];

  const handleActionPress = (action: SettingsAction) => {
    if (action.modal) {
      setActiveModal(action.modal);
    }
  };

  const uploadProfileImage = async () => {
    if (!token || isUpdatingPhoto) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Please allow photo library access to change your profile photo."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    setIsUpdatingPhoto(true);

    try {
      const updatedUser = await userApi.uploadProfileImage(
        token,
        result.assets[0].uri
      );
      updateUser(updatedUser);
    } catch (err) {
      Alert.alert(
        "Upload failed",
        err instanceof Error ? err.message : "Unable to update profile photo."
      );
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

  const removeProfileImage = async () => {
    if (!token || isUpdatingPhoto) return;

    setIsUpdatingPhoto(true);

    try {
      const updatedUser = await userApi.removeProfileImage(token);
      updateUser(updatedUser);
    } catch (err) {
      Alert.alert(
        "Remove failed",
        err instanceof Error ? err.message : "Unable to remove profile photo."
      );
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

  const openAvatarOptions = () => {
    const options = [
      { text: "Change photo", onPress: () => void uploadProfileImage() },
      ...(profileImageUri
        ? [
            {
              text: "Remove photo",
              style: "destructive" as const,
              onPress: () => void removeProfileImage(),
            },
          ]
        : []),
      { text: "Cancel", style: "cancel" as const },
    ];

    Alert.alert("Profile photo", undefined, options);
  };

  return (
    <ScreenWrapper style={styles.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.profileCard}>
          <Pressable
            onPress={openAvatarOptions}
            disabled={isUpdatingPhoto}
            style={({ pressed }) => [
              styles.avatar,
              pressed && { opacity: 0.82 },
              isUpdatingPhoto && { opacity: 0.58 },
            ]}
          >
            {profileImageUri ? (
              <Image source={{ uri: profileImageUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{getInitial(user?.fullName)}</Text>
            )}
            <View style={styles.editBadge}>
              {Feather ? (
                <Feather name="camera" size={14} color="#fff" />
              ) : (
                <Text style={styles.editBadgeText}>+</Text>
              )}
            </View>
          </Pressable>
          <Text style={styles.profileName}>
            {user?.fullName ?? "ParkPal user"}
          </Text>
          <Text style={styles.emailText}>{user?.email ?? "Signed in"}</Text>
        </View>

        <View style={styles.statsCard}>
          <StatItem
            label="Reservations"
            value={reservationCount === null ? "—" : String(reservationCount)}
          />
          <View style={styles.statDivider} />
          <StatItem label="Rating" value="New" />
          <View style={styles.statDivider} />
          <StatItem label="Role" value={formatRole(user?.role)} />
        </View>

        <Text style={styles.sectionLabel}>Settings</Text>
        <View style={styles.actionsCard}>
          {actions.map((action) => (
            <Pressable
              key={action.key}
              onPress={() => {
                handleActionPress(action);
              }}
              style={({ pressed }) => [
                styles.actionRow,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.actionText}>{action.key}</Text>
              <View style={styles.actionRight}>
                {action.value ? (
                  <Text style={styles.actionValue}>{action.value}</Text>
                ) : null}
                {action.modal ? <Text style={styles.chev}>›</Text> : null}
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>

        <View style={{ height: theme.Spacing.xl }} />
      </ScrollView>

      <CenteredModal
        visible={activeModal === "language"}
        onClose={() => setActiveModal(null)}
      >
        <Text style={styles.modalTitle}>Select language</Text>
        <View style={{ height: theme.Spacing.md }} />
        {languages.map((item) => (
          <SelectionRow
            key={item}
            label={item}
            selected={language === item}
            onPress={() => {
              setLanguage(item);
              setActiveModal(null);
            }}
          />
        ))}
        <ModalCloseButton onPress={() => setActiveModal(null)} />
      </CenteredModal>

      <CenteredModal
        visible={activeModal === "currency"}
        onClose={() => setActiveModal(null)}
      >
        <Text style={styles.modalTitle}>Select currency</Text>
        <Text style={styles.modalBody}>
          Prices update across ParkPal for display only. Reservations remain
          stored in EUR.
        </Text>
        {currencies.map((item) => (
          <SelectionRow
            key={item}
            label={item}
            selected={selectedCurrency === item}
            onPress={() => {
              void setSelectedCurrency(item);
              setActiveModal(null);
            }}
          />
        ))}
        <ModalCloseButton onPress={() => setActiveModal(null)} />
      </CenteredModal>

      <CenteredModal
        visible={activeModal === "notifications"}
        onClose={() => setActiveModal(null)}
      >
        <Text style={styles.modalTitle}>Notifications</Text>
        <Text style={styles.modalBody}>
          Manage local notification preferences for ParkPal updates.
        </Text>
        <ToggleRow
          label="Reservation reminders"
          value={reservationReminders}
          onValueChange={setReservationReminders}
        />
        <ToggleRow
          label="Parking availability updates"
          value={availabilityUpdates}
          onValueChange={setAvailabilityUpdates}
        />
        <ModalCloseButton onPress={() => setActiveModal(null)} />
      </CenteredModal>

      <CenteredModal
        visible={activeModal === "support"}
        onClose={() => setActiveModal(null)}
      >
        <Text style={styles.modalTitle}>How can we help?</Text>
        <Text style={styles.modalBody}>
          Contact ParkPal support for reservation, payment, or parking issues.
        </Text>
        <View style={styles.supportEmailBox}>
          <Text style={styles.supportEmail}>support@parkpal.app</Text>
        </View>
        <ModalCloseButton label="Close" onPress={() => setActiveModal(null)} />
      </CenteredModal>

      <CenteredModal
        visible={activeModal === "privacy"}
        onClose={() => setActiveModal(null)}
      >
        <Text style={styles.modalTitle}>Privacy & Terms</Text>
        <PolicySection
          title="Privacy"
          text="We use your account details to manage reservations and app access."
        />
        <PolicySection
          title="Terms"
          text="Reservations must follow parking rules, timing limits, and local regulations."
        />
        <PolicySection
          title="Payments"
          text="Payments are simulated in this MVP. No card data is stored."
        />
        <PolicySection
          title="Location data"
          text="Location is used only to help you find nearby parking."
        />
        <ModalCloseButton label="Close" onPress={() => setActiveModal(null)} />
      </CenteredModal>
    </ScreenWrapper>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function CenteredModal({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard}>{children}</Pressable>
      </Pressable>
    </Modal>
  );
}

function SelectionRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.selectionRow,
        selected && styles.selectionRowSelected,
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text style={styles.selectionLabel}>{label}</Text>
      {selected ? <Text style={styles.selectedMark}>✓</Text> : null}
    </Pressable>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.selectionLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: "rgba(148,171,207,0.22)",
          true: "rgba(8,214,163,0.35)",
        }}
        thumbColor={value ? "#08d6a3" : "#c7d7ee"}
      />
    </View>
  );
}

function PolicySection({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.policySection}>
      <Text style={styles.policyTitle}>{title}</Text>
      <Text style={styles.policyText}>{text}</Text>
    </View>
  );
}

function ModalCloseButton({
  label = "Cancel",
  onPress,
}: {
  label?: string;
  onPress: () => void;
}) {
  return (
    <>
      <View style={styles.modalDivider} />
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.cancelButton,
          pressed && { opacity: 0.75 },
        ]}
      >
        <Text style={styles.cancelText}>{label}</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#071426",
    padding: 0,
  },
  container: {
    paddingHorizontal: theme.Spacing.md,
    paddingTop: theme.Spacing.md,
    paddingBottom: theme.Spacing.xl,
    backgroundColor: "#071426",
  },
  profileCard: {
    alignItems: "center",
    paddingVertical: theme.Spacing.lg,
    paddingHorizontal: theme.Spacing.md,
    borderRadius: 28,
    backgroundColor: "#10223f",
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.14)",
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(56,189,248,0.22)",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 48,
  },
  avatarText: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "900",
  },
  editBadge: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    borderWidth: 2,
    borderColor: "#10223f",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  editBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  profileName: {
    color: "#f8fbff",
    fontSize: 24,
    fontWeight: "900",
    marginTop: theme.Spacing.md,
  },
  emailText: {
    color: "#8ca6c8",
    fontSize: 13,
    fontWeight: "700",
    marginTop: theme.Spacing.xs,
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.Spacing.md,
    borderRadius: 24,
    backgroundColor: "#10223f",
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.14)",
    paddingVertical: theme.Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    color: "#f8fbff",
    fontSize: 16,
    fontWeight: "900",
  },
  statLabel: {
    color: "#8ca6c8",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(148,171,207,0.16)",
  },
  sectionLabel: {
    color: "#b8cbea",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    marginTop: theme.Spacing.lg,
    marginBottom: theme.Spacing.sm,
  },
  actionsCard: {
    borderRadius: 24,
    backgroundColor: "#10223f",
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.14)",
    overflow: "hidden",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 54,
    paddingHorizontal: theme.Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,171,207,0.09)",
  },
  actionText: {
    color: "#f8fbff",
    fontSize: 15,
    fontWeight: "800",
  },
  actionRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionValue: {
    color: "#8ca6c8",
    fontSize: 12,
    fontWeight: "800",
    marginRight: theme.Spacing.xs,
  },
  chev: { color: "#8ca6c8", fontSize: 20, fontWeight: "700" },
  logoutButton: {
    minHeight: 52,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.22)",
    backgroundColor: "rgba(239,68,68,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.Spacing.lg,
  },
  logoutText: {
    color: "#f87171",
    fontSize: 15,
    fontWeight: "900",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.Spacing.lg,
  },
  modalCard: {
    backgroundColor: "#10223f",
    borderRadius: 24,
    padding: theme.Spacing.md,
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.16)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 8,
  },
  modalTitle: {
    color: "#f8fbff",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  modalBody: {
    color: "#8ca6c8",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    textAlign: "center",
    marginTop: theme.Spacing.sm,
    marginBottom: theme.Spacing.md,
  },
  selectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.Spacing.sm,
    paddingHorizontal: theme.Spacing.sm,
    borderRadius: 16,
  },
  selectionRowSelected: {
    backgroundColor: "rgba(56,189,248,0.12)",
  },
  selectionLabel: {
    color: "#f8fbff",
    fontSize: 15,
    fontWeight: "800",
  },
  selectedMark: {
    color: "#38bdf8",
    fontSize: 16,
    fontWeight: "900",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.Spacing.sm,
  },
  supportEmailBox: {
    backgroundColor: "rgba(7,20,38,0.78)",
    borderRadius: 18,
    padding: theme.Spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.14)",
  },
  supportEmail: {
    color: "#38bdf8",
    fontSize: 15,
    fontWeight: "900",
  },
  policySection: {
    paddingVertical: theme.Spacing.sm,
  },
  policyTitle: {
    color: "#f8fbff",
    fontSize: 14,
    fontWeight: "900",
  },
  policyText: {
    color: "#8ca6c8",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 3,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "rgba(148,171,207,0.14)",
    marginTop: theme.Spacing.sm,
    marginBottom: theme.Spacing.xs,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: theme.Spacing.sm,
    borderRadius: theme.Radius.md,
  },
  cancelText: {
    color: "#38bdf8",
    fontSize: 16,
    fontWeight: "900",
  },
});
