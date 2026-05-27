import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import theme from "../theme";

let Feather: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Feather = require("@expo/vector-icons").Feather;
} catch (e) {
  Feather = null;
}

type Props = {
  locationLabel?: string;
  onNotificationPress?: () => void;
};

export default function AppHeader({
  locationLabel = "Skopje",
  onNotificationPress,
}: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={styles.brandIcon}>
          {Feather ? (
            <Feather name="map-pin" size={19} color="#fff" />
          ) : (
            <Text style={styles.brandFallback}>⌖</Text>
          )}
        </View>
        <Text style={styles.brandText}>ParkPal</Text>
      </View>

      <View style={styles.actions}>
        <View style={styles.locationPill}>
          <View style={styles.locationDot} />
          <Text style={styles.locationText} numberOfLines={1}>
            {locationLabel}
          </Text>
        </View>
        <Pressable
          onPress={onNotificationPress}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && onNotificationPress ? { opacity: 0.82 } : null,
          ]}
        >
          {Feather ? (
            <Feather name="bell" size={17} color="#c7d7ee" />
          ) : (
            <Text style={styles.iconButtonText}>!</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 68,
    paddingHorizontal: theme.Spacing.md,
    paddingTop: theme.Spacing.sm,
    paddingBottom: theme.Spacing.sm,
    backgroundColor: "#071426",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    marginRight: theme.Spacing.sm,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  brandFallback: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },
  brandText: {
    color: "#f8fbff",
    fontSize: 24,
    fontWeight: "800",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: theme.Spacing.sm,
  },
  locationPill: {
    minHeight: 40,
    maxWidth: 150,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.24)",
    backgroundColor: "rgba(18,38,69,0.88)",
    paddingHorizontal: theme.Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#20d7a6",
    marginRight: theme.Spacing.xs,
  },
  locationText: {
    color: "#c7d7ee",
    fontWeight: "800",
    fontSize: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: theme.Spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(148,171,207,0.18)",
    backgroundColor: "rgba(18,38,69,0.88)",
  },
  iconButtonText: {
    color: "#c7d7ee",
    fontWeight: "800",
  },
});
