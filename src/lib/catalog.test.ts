import { describe, expect, it } from "vitest";
import { inchesToCm, isDepartmentEnabled, isStoredFile, priceOrder, SIZE_GUIDE, SIZE_SCALE, visibleProducts, type Department, type Product } from "./catalog";

const departments: Department[] = [
  { id: "women", label: "Women", enabled: true },
  { id: "accessories", label: "Accessories", enabled: true },
  { id: "men", label: "Men", enabled: false },
  { id: "kids", label: "Kids", enabled: false },
];

const make = (o: Partial<Product>): Product => ({
  id: "x", name: "Item", department: "women", fabric: "Ankara", origin: "South Africa", price: 100, tag: "",
  image_url: null, image_path: null, is_new_arrival: false, is_active: true, ...o,
});

describe("departments", () => {
  it("Men and Kids stay closed until products arrive", () => {
    expect(isDepartmentEnabled("men", departments)).toBe(false);
    expect(isDepartmentEnabled("kids", departments)).toBe(false);
    expect(isDepartmentEnabled("women", departments)).toBe(true);
  });

  it("hides products from closed departments even if they exist", () => {
    const list = [make({ id: "m", department: "men" }), make({ id: "w" })];
    expect(visibleProducts(list, departments).map((p) => p.id)).toEqual(["w"]);
  });

  it("hides products the owner switched off", () => {
    const list = [make({ id: "a", is_active: false }), make({ id: "b" })];
    expect(visibleProducts(list, departments).map((p) => p.id)).toEqual(["b"]);
  });

  it("New arrivals filter only shows products marked as new", () => {
    const list = [make({ id: "a", is_new_arrival: true }), make({ id: "b" })];
    expect(visibleProducts(list, departments, "new").map((p) => p.id)).toEqual(["a"]);
  });
});

describe("orders", () => {
  const list = [make({ id: "dress", price: 899 }), make({ id: "shirt", department: "men", price: 500 })];

  it("totals use the shop's prices", () => {
    expect(priceOrder([{ productId: "dress", qty: 2 }], list, departments).total).toBe(1798);
  });

  it("refuses products from closed departments", () => {
    expect(() => priceOrder([{ productId: "shirt", qty: 1 }], list, departments)).toThrow();
  });

  it("refuses an empty bag", () => {
    expect(() => priceOrder([], list, departments)).toThrow();
  });
});

describe("sizes", () => {
  const dress = make({ id: "dress", price: 899, sizes: ["S", "M", "L"] });
  const bag = make({ id: "bag", price: 300, department: "accessories" });

  it("sized items need a size before ordering", () => {
    expect(() => priceOrder([{ productId: "dress", qty: 1 }], [dress], departments)).toThrow(/choose a size/);
  });

  it("refuses a sold-out size", () => {
    expect(() => priceOrder([{ productId: "dress", qty: 1, size: "XL" }], [dress], departments)).toThrow(/sold out/);
  });

  it("keeps the chosen size on the order line", () => {
    expect(priceOrder([{ productId: "dress", qty: 2, size: "M" }], [dress], departments).lines[0]?.size).toBe("M");
  });

  it("one-size items need no size", () => {
    expect(priceOrder([{ productId: "bag", qty: 1 }], [bag], departments).total).toBe(300);
  });

  it("size range runs XS to 3XL and the guide converts inches to cm", () => {
    expect(SIZE_SCALE).toEqual(["XS", "S", "M", "L", "XL", "1XL", "2XL", "3XL"]);
    expect(SIZE_GUIDE.M.bust).toBe(36.5);
    expect(inchesToCm(SIZE_GUIDE.M.bust)).toBe(93);
  });

  it("tells uploaded files apart from web links", () => {
    expect(isStoredFile("abc.mp4")).toBe(true);
    expect(isStoredFile("/__l5e/assets-v1/x/a.jpg")).toBe(false);
    expect(isStoredFile("https://x.co/a.jpg")).toBe(false);
  });
});
