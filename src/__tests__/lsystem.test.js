// @flow
// @format
const { evalExpression } = require("../lsystem");

describe("evaluating expressions", () => {
  it("evals numbers", () => expect(evalExpression(5, {})).toBe(5));
  it("evals booleans", () => expect(evalExpression(true, {})).toBe(true));
  it("evals variables", () => expect(evalExpression("s", { s: 54 })).toBe(54));
  describe("functions", () => {
    describe("+", () => {
      it("handles 0", () => expect(evalExpression(["+"])).toBe(0));
      it("handles 1", () => expect(evalExpression(["+", 1])).toBe(1));
      it("handles 2", () => expect(evalExpression(["+", 1, 2])).toBe(3));
      it("handles 3", () => expect(evalExpression(["+", 1, 2, 3])).toBe(6));
    });
    describe("&&", () => {
      it("handles 0", () => expect(evalExpression(["&&"])).toBe(true));
      it("handles 1", () => expect(evalExpression(["&&", false])).toBe(false));
      it("handles 2", () =>
        expect(evalExpression(["&&", true, true])).toBe(true));
      it("handles 3", () =>
        expect(evalExpression(["&&", true, false, true])).toBe(false));
    });
    describe("nesting", () => {
      it("works", () =>
        expect(
          evalExpression(["&&", ["==", "t", 1], [">=", "s", 6]], {
            t: 1,
            s: 30,
          })
        ).toBe(true));
    });
  });
});
