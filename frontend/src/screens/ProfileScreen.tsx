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
import ScreenWrapper from "../components/ScreenWrapper";
import theme from "../theme";
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";
import SectionTitle from "../components/SectionTitle";
import Card from "../components/Card";
import {
  SupportedCurrency,
  useCurrency,
} from "../context/CurrencyContext";
import { getAbsoluteProfileImageUrl, userApi } from "../services/userApi";

type ModalType = "language" | "currency" | "notifications" | "support" | "privacy" | null;

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

export default function ProfileScreen() {
  const { logout, token, updateUser, user } = useAuth();
  const { selectedCurrency, setSelectedCurrency } = useCurrency();
  const [language, setLanguage] = React.useState("English");
  const [activeModal, setActiveModal] = React.useState<ModalType>(null);
  const [reservationReminders, setReservationReminders] = React.useState(true);
  const [availabilityUpdates, setAvailabilityUpdates] = React.useState(false);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = React.useState(false);
  const profileImageUri = getAbsoluteProfileImageUrl(user?.profileImageUrl);

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => logout() },
    ]);
  };

  const accountInfo = [
    { key: "Role", value: formatRole(user?.role) },
    { key: "Member since", value: formatMemberSince(user?.createdAt) },
  ];

  const actions = [
    { key: "Language", value: language, modal: "language" as const },
    { key: "Currency", value: selectedCurrency, modal: "currency" as const },
    { key: "Notifications", modal: "notifications" as const },
    { key: "Support", modal: "support" as const },
    { key: "Privacy & Terms", modal: "privacy" as const },
  ];

  const handleActionPress = (action: (typeof actions)[number]) => {
    setActiveModal(action.modal);
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
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topSection}>
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
          </Pressable>
          <Text style={styles.photoHint}>
            {isUpdatingPhoto ? "Updating photo..." : "Tap to change photo"}
          </Text>
          <Text
            style={[theme.Typography.title, { marginTop: theme.Spacing.sm }]}
          >
            {user?.fullName ?? "ParkPal user"}
          </Text>
          <Text style={styles.emailText}>{user?.email ?? "Signed in"}</Text>
        </View>

        <View style={{ height: theme.Spacing.md }} />

        <SectionTitle>Account info</SectionTitle>
        <Card style={styles.infoCard}>
          {accountInfo.map((row, index) => (
            <View
              key={row.key}
              style={[
                styles.infoRow,
                index === accountInfo.length - 1 && styles.lastRow,
              ]}
            >
              <Text style={theme.Typography.caption}>{row.key}</Text>
              <Text style={theme.Typography.body}>{row.value}</Text>
            </View>
          ))}
        </Card>

        <View style={{ height: theme.Spacing.md }} />

        <SectionTitle>Actions</SectionTitle>
        <Card style={styles.actionsCard}>
          {actions.map((action) => (
            <Pressable
              key={action.key}
              onPress={() => handleActionPress(action)}
              style={({ pressed }) => [
                styles.actionRow,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={theme.Typography.body}>{action.key}</Text>
              <View style={styles.actionRight}>
                {action.value ? (
                  <Text style={styles.actionValue}>{action.value}</Text>
                ) : null}
                <Text style={styles.chev}>›</Text>
              </View>
            </Pressable>
          ))}
        </Card>

        <View style={{ height: theme.Spacing.lg }} />

        <Button title="Log out" variant="outline" onPress={handleLogout} />

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
      <Text style={theme.Typography.body}>{label}</Text>
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
      <Text style={theme.Typography.body}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: theme.Colors.border,
          true: "rgba(89,165,117,0.35)",
        }}
        thumbColor={value ? theme.Colors.secondaryGreen : "#f4f4f5"}
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
  container: { paddingBottom: theme.Spacing.xl },
  topSection: { alignItems: "center", paddingVertical: theme.Spacing.sm },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "700",
  },
  photoHint: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    marginTop: theme.Spacing.xs,
  },
  emailText: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    marginTop: theme.Spacing.xs,
  },
  infoCard: { marginTop: theme.Spacing.sm },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: theme.Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.Colors.border,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  actionsCard: { marginTop: theme.Spacing.sm },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.Spacing.sm,
  },
  actionRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionValue: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    marginRight: theme.Spacing.xs,
  },
  chev: { color: theme.Colors.textSecondary, fontSize: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.34)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.Spacing.lg,
  },
  modalCard: {
    backgroundColor: theme.Colors.surface,
    borderRadius: theme.Radius.lg,
    padding: theme.Spacing.md,
    width: "100%",
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  modalTitle: {
    ...theme.Typography.subtitle,
    textAlign: "center",
  },
  modalBody: {
    ...theme.Typography.body,
    color: theme.Colors.textSecondary,
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
    borderRadius: theme.Radius.md,
  },
  selectionRowSelected: {
    backgroundColor: "rgba(20,43,108,0.06)",
  },
  selectedMark: {
    color: theme.Colors.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.Spacing.sm,
  },
  supportEmailBox: {
    backgroundColor: theme.Colors.background,
    borderRadius: theme.Radius.md,
    padding: theme.Spacing.md,
    alignItems: "center",
  },
  supportEmail: {
    ...theme.Typography.body,
    color: theme.Colors.primary,
    fontWeight: "700",
  },
  policySection: {
    paddingVertical: theme.Spacing.sm,
  },
  policyTitle: {
    ...theme.Typography.body,
    fontWeight: "700",
  },
  policyText: {
    ...theme.Typography.caption,
    color: theme.Colors.textSecondary,
    marginTop: 3,
  },
  modalDivider: {
    height: 1,
    backgroundColor: theme.Colors.border,
    marginTop: theme.Spacing.sm,
    marginBottom: theme.Spacing.xs,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: theme.Spacing.sm,
    borderRadius: theme.Radius.md,
  },
  cancelText: {
    color: theme.Colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
});
