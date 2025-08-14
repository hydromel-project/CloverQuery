import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("customers", "routes/customers.tsx"),
  route("customers/print", "routes/customers.print.tsx"),
  route("admin", "routes/admin.tsx"),
  route("api/customers", "routes/api.customers.tsx"),
  route("api/sync-clover", "routes/api.sync-clover.tsx"),
  route("api/cache", "routes/api.cache.tsx"),
  route("api/cache-status", "routes/api.cache-status.tsx"),
] satisfies RouteConfig;
