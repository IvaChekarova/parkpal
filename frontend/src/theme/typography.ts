import { TextStyle } from "react-native";
import { Colors } from "./colors";

type TypographyStyles = {
  title: TextStyle;
  subtitle: TextStyle;
  body: TextStyle;
  caption: TextStyle;
};

export const Typography: TypographyStyles = {
  title: { fontSize: 24, fontWeight: "700", color: Colors.textPrimary },
  subtitle: { fontSize: 18, fontWeight: "600", color: Colors.textPrimary },
  body: { fontSize: 14, fontWeight: "400", color: Colors.textPrimary },
  caption: { fontSize: 12, fontWeight: "400", color: Colors.textSecondary },
};

export default Typography;