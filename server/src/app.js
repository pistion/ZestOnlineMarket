const cors = require("cors");
const express = require("express");

const { allowedOrigins, jsonLimit, paths } = require("./config/env");
const artRoutes = require("./routes/art.routes");
const authRoutes = require("./routes/auth.routes");
const buyerRoutes = require("./routes/buyer.routes");
const engagementRoutes = require("./routes/engagement.routes");
const feedRoutes = require("./routes/feed.routes");
const marketplaceRoutes = require("./routes/marketplace.routes");
const pageRoutes = require("./routes/page.routes");
const productRoutes = require("./routes/product.routes");
const sandboxRoutes = require("./routes/sandbox.routes");
const sellerRoutes = require("./routes/seller.routes");
const storeRoutes = require("./routes/store.routes");
const { attachOptionalUser } = require("./middleware/auth.middleware");
const { attachCsrfProtection } = require("./middleware/csrf.middleware");
const { errorHandler, notFoundHandler } = require("./middleware/error.middleware");
const { attachRequestContext } = require("./middleware/request-context.middleware");

function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("view engine", "ejs");
  app.set("views", paths.viewsDir);

  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        const error = new Error("Origin not allowed");
        error.status = 403;
        callback(error);
      },
    })
  );
  app.use(express.json({ limit: jsonLimit }));
  app.use(express.urlencoded({ extended: true, limit: jsonLimit }));
  app.use(attachRequestContext);

  app.use(express.static(paths.publicDir));
  app.use("/uploads", express.static(paths.uploadsDir));
  app.use(attachOptionalUser);
  app.use(attachCsrfProtection);

  app.use((req, res, next) => {
    res.locals.flash = null;
    next();
  });

  app.use("/auth", authRoutes);
  app.use("/api/art", artRoutes);
  app.use("/api/buyer", buyerRoutes);
  app.use("/api/engagement", engagementRoutes);
  app.use("/api/feed", feedRoutes);
  app.use("/api/marketplace", marketplaceRoutes);
  app.use("/api/store", storeRoutes);
  app.use("/api/seller", sellerRoutes);
  app.use("/api/products", productRoutes);
  app.use(sandboxRoutes);
  app.use(pageRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
};
