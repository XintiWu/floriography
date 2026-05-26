export class LlmUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmUnavailableError";
  }
}

export class LlmParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmParseError";
  }
}
