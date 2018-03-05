// @flow
// @format
const {
  evalExpression,
  tryApplyRule,
  generateRightContexts,
} = require("../lsystem");
const expect = require("expect");
declare var describe: (string, () => void) => void;
declare var it: (string, () => void) => void;

describe("evaluating expressions", () => {
  it("evals numbers", () => expect(evalExpression(5, {})).toBe(5));
  it("evals booleans", () => expect(evalExpression(true, {})).toBe(true));
  it("evals variables", () => expect(evalExpression("s", { s: 54 })).toBe(54));
  describe("functions", () => {
    describe("+", () => {
      it("handles 0", () => expect(evalExpression(["+"], {})).toBe(0));
      it("handles 1", () => expect(evalExpression(["+", 1], {})).toBe(1));
      it("handles 2", () => expect(evalExpression(["+", 1, 2], {})).toBe(3));
      it("handles 3", () => expect(evalExpression(["+", 1, 2, 3], {})).toBe(6));
    });
    describe("&&", () => {
      it("handles 0", () => expect(evalExpression(["&&"], {})).toBe(true));
      it("handles 1", () =>
        expect(evalExpression(["&&", false], {})).toBe(false));
      it("handles 2", () =>
        expect(evalExpression(["&&", true, true], {})).toBe(true));
      it("handles 3", () =>
        expect(evalExpression(["&&", true, false, true], {})).toBe(false));
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

describe("tryApplyRule", () => {
  describe("without context", () => {
    const rule = {
      variables: ["s", "t", "c"],
      predicate: ["&&", ["==", "t", 1], [">=", "s", 6]],
      next: [
        ["F", [["*", 2, ["/", "s", 3]], 2, "c"]],
        ["f", [1]],
        ["F", [["/", "s", 3], 1, "c"]],
      ],
    };

    function apply(name, parameters, result) {
      it(name, () =>
        expect(tryApplyRule(rule, parameters, [], [])).toEqual(result)
      );
    }

    apply(
      "can succeed",
      [6, 1, 35],
      [["F", [4, 2, 35]], ["f", [1]], ["F", [2, 1, 35]]]
    );
    apply("fails with too few", [1, 2], null);
    apply("fails with too many", [1, 2, 3, 4], null);
    apply("fails predicates", [1, 3], null);
  });

  describe("with left context", () => {
    describe("with context but without variables", () => {
      const rule = {
        variables: [],
        left: [["b", []]],
        next: [["b", []]],
      };

      it("can match left context", () =>
        expect(tryApplyRule(rule, [], [["b", []]], [])).toEqual([["b", []]]));
      it("can fail to match left context by id", () =>
        expect(tryApplyRule(rule, [], [["a", []]], [])).toEqual(null));
      it("can fail to match left context by arity", () =>
        expect(tryApplyRule(rule, [], [["b", [7]]], [])).toEqual(null));
    });

    describe("where the context binds variables", () => {
      const rule = {
        variables: ["x"],
        left: [["b", ["y"]]],
        predicate: [">", "x", "y"],
        next: [["b", [["+", "x", "y"]]]],
      };

      it("can work", () =>
        expect(tryApplyRule(rule, [2], [["b", [1]]], [])).toEqual([
          ["b", [3]],
        ]));
      it("can fail the predicate", () =>
        expect(tryApplyRule(rule, [2], [["b", [4]]], [])).toEqual(null));
    });

    describe("where the context is longer", () => {
      const rule = {
        variables: ["x"],
        left: [["a", ["y"]], ["b", ["z"]]],
        predicate: [">", "x", "y"],
        next: [["b", [["+", "x", "y", "z"]]]],
      };

      it("can work", () =>
        expect(tryApplyRule(rule, [2], [["a", [1]], ["b", [2]]], [])).toEqual([
          ["b", [5]],
        ]));
      it("can receive too small", () =>
        expect(tryApplyRule(rule, [2], [["b", [1]]], [])).toEqual(null));
      it("can work longer", () =>
        expect(
          tryApplyRule(rule, [2], [["x", [23]], ["a", [1]], ["b", [2]]], [])
        ).toEqual([["b", [5]]]));
      it("can fail the predicate", () =>
        expect(tryApplyRule(rule, [2], [["a", [4]], ["b", [2]]], [])).toEqual(
          null
        ));
    });
  });

  describe("with right context", () => {
    describe("with context but without variables", () => {
      const rule = {
        variables: [],
        right: [["b", []]],
        next: [["b", []]],
      };

      it("can match right context", () =>
        expect(tryApplyRule(rule, [], [], [["b", []]])).toEqual([["b", []]]));
      it("can fail to match right context by id", () =>
        expect(tryApplyRule(rule, [], [], [["a", []]])).toEqual(null));
      it("can fail to match right context by arity", () =>
        expect(tryApplyRule(rule, [], [], [["b", [7]]])).toEqual(null));
    });

    describe("where the context binds variables", () => {
      const rule = {
        variables: ["x"],
        right: [["b", ["y"]]],
        predicate: [">", "x", "y"],
        next: [["b", [["+", "x", "y"]]]],
      };

      it("can work", () =>
        expect(tryApplyRule(rule, [2], [], [["b", [1]]])).toEqual([
          ["b", [3]],
        ]));
      it("can fail the predicate", () =>
        expect(tryApplyRule(rule, [2], [], [["b", [4]]])).toEqual(null));
    });

    describe("where the context is longer", () => {
      const rule = {
        variables: ["x"],
        right: [["b", ["y"]], ["c", ["z"]]],
        predicate: [">", "x", "y"],
        next: [["b", [["+", "x", "y", "z"]]]],
      };

      it("can work", () =>
        expect(tryApplyRule(rule, [2], [], [["b", [1]], ["c", [2]]])).toEqual([
          ["b", [5]],
        ]));
      it("can receive too small", () =>
        expect(tryApplyRule(rule, [2], [], [["b", [1]]])).toEqual(null));
      it("can work longer", () =>
        expect(
          tryApplyRule(rule, [2], [], [["b", [1]], ["c", [2]], ["zz", [412]]])
        ).toEqual([["b", [5]]]));
      it("can fail the predicate", () =>
        expect(tryApplyRule(rule, [2], [], [["b", [4]], ["c", [2]]])).toEqual(
          null
        ));
    });
  });
});

describe("generating right contexts", () => {
  function _is(s) {
    return s.split("").map(c => [c, []]);
  }
  function genAll(items, start, max_length) {
    const result = [];
    for (var c of generateRightContexts(items, start, max_length)) {
      result.push(c);
    }
    return result;
  }

  const items = _is("abcd[ef[g]][hi][jklm]");
  it("stops once", () => expect(genAll(items, 0, 2)).toEqual([_is("ab")]));
  it("doesn't repeat after pops", () =>
    expect(genAll(items, 3, 4)).toEqual([
      _is("defg"),
      _is("dhi"),
      _is("djkl"),
    ]));
  it("does pop correctly", () =>
    expect(genAll(items, 3, 3)).toEqual([_is("def"), _is("dhi"), _is("djk")]));
  it("gets them all when huge", () =>
    expect(genAll(items, 0, 1000)).toEqual([
      _is("abcdefg"),
      _is("abcdhi"),
      _is("abcdjklm"),
    ]));
});
