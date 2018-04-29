// @flow
// @format
const {
  eval_expr,
  format_value,
  new_environment,
  read,
  stdlib,
  sym,
} = require("../gardenlisp");
const expect = require("expect");
/*::
declare var describe: (string, () => void) => void;
declare var it: (string, () => void) => void;
*/

describe("reading", () => {
  describe("numbers", () => {
    it("reads numbers", () => expect(read("12")).toEqual(12));
    it("reads floats", () => expect(read("1.2")).toEqual(1.2));
    it("reads zero", () => expect(read("0")).toEqual(0));
    it("reads leading zero", () => expect(read("0.2")).toEqual(0.2));
    it("reads no leading zero", () => expect(read(".2")).toEqual(0.2));
  });
  describe("strings", () => {
    it("reads strings", () =>
      expect(read('"able was I"')).toEqual("able was I"));

    const escs = [['"\\b"', "\b"], ['"\\r"', "\r"], ['"\\n"', "\n"]];
    for (let i = 0; i < escs.length; i++) {
      const [input, output] = escs[i];
      it("decodes " + input, () => expect(read(input)).toEqual(output));
    }
  });
  describe("symbols", () => {
    it("reads symbols", () => expect(read("foo")).toBe(sym("foo")));
    it("escapes embedded", () => expect(read("f\\ o")).toBe(sym("f o")));
    it("escapes leading", () => expect(read("\\foo")).toBe(sym("foo")));
    it("escapes leading digit", () => expect(read("\\12")).toBe(sym("12")));
    it("reads keywords", () => expect(read(":foo")).toBe(sym(":foo")));
  });
  describe("lists", () => {
    it("reads lists", () => expect(read("(1 2 3)")).toEqual([1, 2, 3]));
    it("reads nested lists", () =>
      expect(read("(defun add (x y) (+ x y))")).toEqual([
        sym("defun"),
        sym("add"),
        [sym("x"), sym("y")],
        [sym("+"), sym("x"), sym("y")],
      ]));
  });
  describe("defers", () => {
    it("reads defers", () =>
      expect(read("[1 2 3]")).toEqual([sym("defer"), [1, 2, 3]]));
  });
});

describe("eval_expr", () => {
  const empty = new_environment(null);
  it("does numbers", () => expect(eval_expr(5, empty)).toBe(5));
  it("does keywords", () =>
    expect(eval_expr(sym(":foo"), empty)).toBe(sym(":foo")));
  it("does variables", () => {
    const testenv = new_environment(empty);
    testenv.values["foo"] = 264;
    expect(eval_expr(sym("foo"), testenv)).toBe(264);
  });
  it("does strings", () => expect(eval_expr("foo", empty)).toBe("foo"));
  it("does calls", () => expect(eval_expr([sym("+"), 1, 2], stdlib)).toBe(3));
  it("does lambdas", () =>
    // ((lambda (x) (+ 1 x)) 3) => 4, yeah?
    expect(
      eval_expr(
        [[sym("lambda"), [sym("x")], [sym("+"), 1, sym("x")]], 3],
        stdlib
      )
    ).toBe(4));
});

describe("format_value", () => {
  const forms = [
    "1",
    "t",
    ":foo",
    "(+ 1 (* x y))",
    '"I am the very model of a\nmodern major general"',
  ];

  for (let i = 0; i < forms.length; i++) {
    const form = forms[i];
    it("prints " + form, () => expect(format_value(read(form))).toEqual(form));
  }
});
