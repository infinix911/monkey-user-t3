/**
 * Makes server-side Error instances safe for Nuxt's SSR payload and dev-log
 * serializer. Fetch errors are class instances, while devalue only accepts
 * plain objects unless a payload reducer handles them.
 */
interface SerializedError {
  name: string;
  message: string;
  stack?: string;
}

function reduceError(value: unknown): SerializedError | undefined {
  if (!(value instanceof Error)) return undefined;

  return {
    name: value.name,
    message: value.message,
    ...(value.stack ? { stack: value.stack } : {}),
  };
}

function reviveError(value: SerializedError): Error {
  const error = new Error(value.message);
  error.name = value.name;
  if (value.stack) error.stack = value.stack;
  return error;
}

export default defineNuxtPlugin({
  name: "error-payload-serialization",
  // Payload revivers must be registered before Nuxt parses the SSR payload.
  order: -40,
  setup() {
    definePayloadReducer("Error", reduceError);
    definePayloadReviver("Error", reviveError);
  },
});
