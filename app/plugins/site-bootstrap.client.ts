import { applySiteBootstrap } from "@/lib/site-bootstrap";

export default defineNuxtPlugin({
  name: "site-bootstrap",
  dependsOn: ["pinia"],
  setup() { applySiteBootstrap(); },
});
