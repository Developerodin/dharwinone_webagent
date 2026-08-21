import { describe, expect, it } from "vitest";
import {
  extractSimpleMath,
  formatIntakeAsideMessage,
  formatMathAside,
  isOffTopicIntakeReply,
  latestAnswerBlob,
  looksLikeIntakeQuestion,
} from "./intakeAside.js";

describe("extractSimpleMath", () => {
  it("reads 2+3 from a typo question", () => {
    expect(extractSimpleMath("waht is 2+3")).toEqual({
      left: 2,
      right: 3,
      op: "+",
    });
  });

  it("ignores ranges that look like counts", () => {
    expect(extractSimpleMath("we have 2-3 signature dishes")).toBeNull();
  });
});

describe("formatMathAside", () => {
  it("answers 2+3", () => {
    expect(formatMathAside("what is 2+3")).toBe("2 + 3 = 5");
  });
});

describe("looksLikeIntakeQuestion", () => {
  it("treats waht as what", () => {
    expect(looksLikeIntakeQuestion("waht is 2+3")).toBe(true);
    expect(looksLikeIntakeQuestion("Mon-Sun 11am–11pm")).toBe(false);
  });
});

describe("isOffTopicIntakeReply", () => {
  const pending = [
    "What are your opening hours?",
    "What makes your restaurant different, in one line?",
    "Can you provide 2-3 signature dishes you are known for?",
  ];

  it("does not eat a math question as a brief answer", () => {
    expect(isOffTopicIntakeReply("waht is 2+3", pending)).toBe(true);
    expect(isOffTopicIntakeReply("what is 2+3", pending)).toBe(true);
    expect(isOffTopicIntakeReply("2+3", pending)).toBe(true);
  });

  it("still treats restaurant answers as on-topic", () => {
    expect(isOffTopicIntakeReply("Mon-Sun 11am-11pm", pending)).toBe(false);
    expect(
      isOffTopicIntakeReply("Kung Pao chicken, dumplings, fried rice", pending),
    ).toBe(false);
    expect(isOffTopicIntakeReply("skip for now", pending)).toBe(false);
    expect(
      isOffTopicIntakeReply("akshay96102@gmail.com", [
        "What is your contact email?",
      ]),
    ).toBe(false);
  });
});

describe("formatIntakeAsideMessage", () => {
  it("answers math then re-asks", () => {
    const message = formatIntakeAsideMessage(
      "waht is 2+3",
      ["What are your opening hours?"],
      true,
    );
    expect(message).toContain("2 + 3 = 5");
    expect(message).toContain("opening hours");
    expect(message).toContain("skip for now");
  });
});

describe("latestAnswerBlob", () => {
  it("collapses the same reply mapped onto every question", () => {
    const blob = latestAnswerBlob({
      "What are your opening hours?": "waht is 2+3",
      "What makes you different?": "waht is 2+3",
    });
    expect(blob).toEqual({
      text: "waht is 2+3",
      questions: [
        "What are your opening hours?",
        "What makes you different?",
      ],
    });
  });
});
