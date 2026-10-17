import renderer from "./.output/server/index.mjs";
import { createUserpageWorker } from "./worker/userpage.ts";

const worker = createUserpageWorker(renderer);
export const Shell = worker.Shell;
export default { fetch: worker.fetch };
