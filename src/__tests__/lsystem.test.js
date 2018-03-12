// @flow
// @format
const {
  evalExpression,
  makeRule,
  makeRuleSet,
  parseItemExpr,
  rewrite,
  tryBindRule,
} = require("../lsystem");
const expect = require("expect");
declare var describe: (string, () => void) => void;
declare var it: (string, () => void) => void;

// import type item from ('../lsystem');

describe("evalExpression", () => {
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

/** Split a string into individual items without values, for testing. */
function _is(s): [string, any[]][] {
  return s.split("").map(c => [c, []]);
}

describe("tryBindRule", () => {
  describe("without context", () => {
    const rule = makeRule({
      variables: ["s", "t", "c"],
      predicate: ["&&", ["==", "t", 1], [">=", "s", 6]],
      next: [],
    });

    function apply(name, parameters, result) {
      it(name, () =>
        expect(tryBindRule(rule, parameters, [], [])).toEqual(result)
      );
    }

    apply("can succeed", [6, 1, 35], { s: 6, t: 1, c: 35 });
    apply("fails with too few", [1, 2], null);
    apply("fails with too many", [1, 2, 3, 4], null);
    apply("fails predicates", [1, 3], null);
  });

  describe("with left context", () => {
    describe("with context but without variables", () => {
      const rule = makeRule({
        variables: [],
        left: [["b", []]],
        next: [],
      });

      it("can match left context", () =>
        expect(tryBindRule(rule, [], [["b", []]], [])).toEqual({}));
      it("can fail to match left context by id", () =>
        expect(tryBindRule(rule, [], [["a", []]], [])).toEqual(null));
      it("can fail to match left context by arity", () =>
        expect(tryBindRule(rule, [], [["b", [7]]], [])).toEqual(null));
    });

    describe("where the context binds variables", () => {
      const success = { x: 2, y: 1 };
      const rule = makeRule({
        variables: ["x"],
        left: [["b", ["y"]]],
        predicate: [">", "x", "y"],
        next: [],
      });

      it("can work", () =>
        expect(tryBindRule(rule, [2], [["b", [1]]], [])).toEqual(success));
      it("can fail the predicate", () =>
        expect(tryBindRule(rule, [2], [["b", [4]]], [])).toEqual(null));
    });

    describe("where the context is longer", () => {
      const success = { x: 2, y: 1, z: 2 };
      const rule = makeRule({
        variables: ["x"],
        left: [["a", ["y"]], ["b", ["z"]]],
        predicate: [">", "x", "y"],
        next: [],
      });

      it("can work", () =>
        expect(tryBindRule(rule, [2], [["a", [1]], ["b", [2]]], [])).toEqual(
          success
        ));
      it("can receive too small", () =>
        expect(tryBindRule(rule, [2], [["b", [1]]], [])).toEqual(null));
      it("can work longer", () =>
        expect(
          tryBindRule(rule, [2], [["x", [23]], ["a", [1]], ["b", [2]]], [])
        ).toEqual(success));
      it("can fail the predicate", () =>
        expect(tryBindRule(rule, [2], [["a", [4]], ["b", [2]]], [])).toEqual(
          null
        ));
    });
  });

  describe("with right context", () => {
    describe("with context but without variables", () => {
      const rule = makeRule({
        variables: [],
        right: [["b", []]],
        next: [],
      });

      it("can match right context", () =>
        expect(tryBindRule(rule, [], [], [["b", []]])).toEqual({}));
      it("can fail to match right context by id", () =>
        expect(tryBindRule(rule, [], [], [["a", []]])).toEqual(null));
      it("can fail to match right context by arity", () =>
        expect(tryBindRule(rule, [], [], [["b", [7]]])).toEqual(null));
    });

    describe("with branching contexts", () => {
      const success = {};
      const rule = makeRule({
        variables: [],
        right: [["b", []], ["c", []]],
        next: [],
      });

      const apply = context => tryBindRule(rule, [], [], _is(context));

      it("can match nested", () => expect(apply("b[o]c")).toEqual(success));
      it("ignores trailing", () => expect(apply("b[ca")).toEqual(success));
      it("can fail nested", () => expect(apply("b[ac]")).toEqual(null));
      it("can skip and match", () => expect(apply("b[ac]c")).toEqual(success));
      it("respects boundaries", () => expect(apply("b]c")).toEqual(null));
    });

    describe("with ignores", () => {
      const success = {};
      const rule = makeRule({
        variables: [],
        right: [["b", []], ["c", []]],
        ignore: "f~".split(""),
        next: [],
      });

      const apply = context => tryBindRule(rule, [], [], _is(context));

      it("can ignore (1)", () => expect(apply("bfc")).toEqual(success));
      it("can ignore (2)", () => expect(apply("b~c")).toEqual(success));
      it("can ignore (3)", () => expect(apply("bf~c")).toEqual(success));
      it("can ignore nest (1)", () => expect(apply("b[f]c")).toEqual(success));
      it("can ignore nest (2)", () => expect(apply("b[fc]")).toEqual(success));
    });

    describe("where the context binds variables", () => {
      const rule = makeRule({
        variables: ["x"],
        right: [["b", ["y"]]],
        predicate: [">", "x", "y"],
        next: [],
      });

      it("can work", () =>
        expect(tryBindRule(rule, [2], [], [["b", [1]]])).toEqual({
          x: 2,
          y: 1,
        }));
      it("can fail the predicate", () =>
        expect(tryBindRule(rule, [2], [], [["b", [4]]])).toEqual(null));
    });

    describe("where the context is longer", () => {
      const success = {
        x: 2,
        y: 1,
        z: 2,
      };
      const rule = makeRule({
        variables: ["x"],
        right: [["b", ["y"]], ["c", ["z"]]],
        predicate: [">", "x", "y"],
        next: [],
      });

      it("can work", () =>
        expect(tryBindRule(rule, [2], [], [["b", [1]], ["c", [2]]])).toEqual(
          success
        ));
      it("can receive too small", () =>
        expect(tryBindRule(rule, [2], [], [["b", [1]]])).toEqual(null));
      it("can work longer", () =>
        expect(
          tryBindRule(rule, [2], [], [["b", [1]], ["c", [2]], ["zz", [412]]])
        ).toEqual(success));
      it("can fail the predicate", () =>
        expect(tryBindRule(rule, [2], [], [["b", [4]], ["c", [2]]])).toEqual(
          null
        ));
    });
  });
});

describe("rewrite", () => {
  describe("simple", () => {
    const states = [
      _is("baaaaaaaaa"),
      _is("abaaaaaaaa"),
      _is("aabaaaaaaa"),
      _is("aaabaaaaaa"),
      _is("aaaabaaaaa"),
    ];
    const rules = makeRuleSet({
      rules: {
        a: [
          {
            left: [["b", []]],
            next: [["b", []]],
          },
        ],
        b: [
          {
            next: [["a", []]],
          },
        ],
      },
    });

    for (let i = 0; i < states.length - 1; i++) {
      const index = i;
      it("evolves " + i.toString() + " -> " + (i + 1).toString(), () =>
        expect(rewrite(states[index], rules)).toEqual(states[index + 1])
      );
    }
  });

  describe("stochastic", () => {
    const initial = _is("a");
    const rules = makeRuleSet({
      rules: {
        a: [
          { probability: 0.25, next: _is("ba") },
          { probability: 0.25, next: _is("ca") },
          { probability: 0.5, next: _is("a") },
        ],
      },
    });

    let final = initial;
    for (let i = 0; i < 1000; i++) {
      final = rewrite(final, rules);
    }

    it("selects 'b' sometimes", () =>
      expect(final.findIndex(i => i[0] == "b")).not.toEqual(-1));
    it("selects 'c' sometimes", () =>
      expect(final.findIndex(i => i[0] == "c")).not.toEqual(-1));
  });
});

describe("parseItemExpr", () => {
  const cases = [
    ["abcd", [["a", []], ["b", []], ["c", []], ["d", []]]],
    ["a(yo)b", [["a", []], ["yo", []], ["b", []]]],
    ["(yo 1)", [["yo", [1]]]],
    ["(yo (+ 1 1))", [["yo", [["+", 1, 1]]]]],
    ["(yo (+ x (* 2 y)))", [["yo", [["+", "x", ["*", 2, "y"]]]]]],
    ["(a x y)", [["a", ["x", "y"]]]],
    ["(color #00FF00)", [["color", ["#00FF00"]]]],
  ];

  for (let i = 0; i < cases.length; i++) {
    const [actual, expected] = cases[i];
    it("parses " + actual, () =>
      expect(parseItemExpr(actual)).toEqual(expected)
    );
  }
});
