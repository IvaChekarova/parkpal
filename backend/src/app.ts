import cors from "cors";
import express from "express";
import path from "path";

import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(cors());
app.use(express.json());
app.use(
  "/uploads/profile-images",
  express.static(path.join(process.cwd(), "uploads", "profile-images"))
);

app.use(routes);

app.use(errorHandler);

export default app;
