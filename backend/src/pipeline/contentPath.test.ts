import { describe, expect, it } from "vitest";
import { getContentAtPath, setContentAtPath } from "./contentPath.js";

describe("contentPath", () => {
  const content = {
    headline: "Menu",
    items: [
      { name: "Margherita Pizza", price: 350, description: "Tomato and basil" },
      { name: "Farmhouse Pizza", price: 420, description: null },
    ],
  };

  it("reads nested dish names", () => {
    expect(getContentAtPath(content, "items.0.name")).toBe("Margherita Pizza");
    expect(getContentAtPath(content, "headline")).toBe("Menu");
  });

  it("sets a nested dish name without clobbering siblings", () => {
    const next = setContentAtPath(content, "items.0.name", "Margherita");
    expect(next.items[0]?.name).toBe("Margherita");
    expect(next.items[0]?.price).toBe(350);
    expect(next.items[1]?.name).toBe("Farmhouse Pizza");
    expect(content.items[0]?.name).toBe("Margherita Pizza");
  });
});
