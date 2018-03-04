// @flow
// @format
const invariant = require("invariant");

// Parameterized l-systems require expressions; this here implements a little
// S-expression kinda evaluator over numbers and booleans, which is enough for
// us. These expressions get used in predicates and productions.
type value = number | boolean;
type expr = number | boolean | string | expr[];

function evalExpression(expr: expr, env: { [string]: value }): value {
  if (typeof expr == "string") {
    return env[expr];
  } else if (typeof expr == "number" || typeof expr == "boolean") {
    return expr;
  } else {
    const fn = expr[0];
    const args = expr.slice(1).map(e => evalExpression(e, env));
    function dbg(result: value): value {
      // console.log('(', fn, ...args, ') =>', result);
      return result;
    }

    switch (fn) {
      case "-":
        invariant(typeof args[0] == "number", "Args must be numbers");
        invariant(typeof args[1] == "number", "Args must be numbers");
        return dbg(args[0] - args[1]);
      case "/":
        invariant(typeof args[0] == "number", "Args must be numbers");
        invariant(typeof args[1] == "number", "Args must be numbers");
        return dbg(args[0] / args[1]);
      case "+": {
        let result = 0;
        for (let i = 0; i < args.length; i++) {
          invariant(typeof args[i] == "number", "Args must be numbers");
          result += args[i];
        }
        return dbg(result);
      }
      case "*": {
        let result = 1;
        for (let i = 0; i < args.length; i++) {
          invariant(typeof args[i] == "number", "Args must be numbers");
          result *= args[i];
        }
        return result;
      }
      case "==": {
        for (let i = 1; i < args.length; i++) {
          if ((args[0]: any) != (args[i]: any)) {
            return dbg(false);
          }
        }
        return dbg(true);
      }
      case ">=":
        invariant(typeof args[0] == "number", "Args must be numbers");
        invariant(typeof args[1] == "number", "Args must be numbers");
        return dbg(args[0] >= args[1]);
      case "<=":
        invariant(typeof args[0] == "number", "Args must be numbers");
        invariant(typeof args[1] == "number", "Args must be numbers");
        return dbg(args[0] <= args[1]);
      case ">":
        invariant(typeof args[0] == "number", "Args must be numbers");
        invariant(typeof args[1] == "number", "Args must be numbers");
        return dbg(args[0] > args[1]);
      case "<":
        invariant(typeof args[0] == "number", "Args must be numbers");
        invariant(typeof args[1] == "number", "Args must be numbers");
        return dbg(args[0] < args[1]);
      case "&&":
        return dbg(args.every(a => a));
      case "||":
        return dbg(args.some(a => a));
      default:
        throw Error("I don't know about function " + fn.toString());
    }
  }
}

// A single item in our l-system is a tuple of an ID and a set of values.
type item = [string, value[]];

// A rule in our system can be configured many ways, to support a full on
// context-sensitive, parameterized l-system.
type rule = {
  // These are the names for the values in the items. If an item does not
  // have exactly one value for each variable, then the rule does not match.
  variables: string[],

  // This describes the required left-context of the rule. The last item of
  // `left` must match the last item of the left-context, the next-to-last item
  // of `left` must match the next-to-last item of the context, and so on.
  // Each item in the context is a tuple `(ID, vars)` where `ID` is the ID of
  // the item in the context and `vars` is a list of variable bindings for the
  // values in the  item. `vars` is treated just like `variables`, in that the
  // arity of the rule must match the arity of the item exactly.
  left?: [string, string[]][],

  // This describes the required right-context of the rule. This is
  // interpreted the same as the left context, except the first item of
  // `right` must match the first item of the right context, and the second
  // must match the second, and so forth.
  right?: [string, string[]][],

  // This is the predicate for the rule. If not present, the predicate always
  // passes. The predicate is evaluated in an environment that has bindings
  // for each of the variables described in `variables` and in the context.
  predicate?: expr,

  // This is the set of productions for the next items, if the rule applies.
  // Each item in the array is a tuple (id, exprs) where `id` is the ID of
  // the item to produce, and `exprs` are expressions for the values of the
  // items. The expressions are evaluated in the same environment as the
  // predicate.
  next: [string, expr[]][],
};

function tryBindContext(rule: [string, string[]][], context: item[]) {
  if (rule.length < context.length) {
    return null;
  }

  const bindings: { [string]: value } = {};
  for (let i = 0; i < rule.length; i++) {
    const [binding_id, binding_vars] = rule[i];
    const [item_id, item_params] = context[i];

    if (binding_id != item_id) {
      return null;
    }
    if (binding_vars.length != item_params.length) {
      return null;
    }
    for (let j = 0; j < binding_vars.length; j++) {
      bindings[binding_vars[j]] = item_params[j];
    }
  }
  return bindings;
}

function tryApplyRule(
  rule: rule,
  parameters: value[],
  left: item[],
  right: item[]
): ?(item[]) {
  if (rule.variables.length != parameters.length) {
    return null;
  }

  let bindings: { [string]: value } = {};
  for (let i = 0; i < rule.variables.length; i++) {
    bindings[rule.variables[i]] = parameters[i];
  }

  if (rule.left) {
    const leftStart = left.length - rule.left.length;
    const leftBindings = tryBindContext(rule.left, left.slice(leftStart));
    if (leftBindings == null) {
      return null;
    }
    bindings = { ...bindings, ...leftBindings };
  }

  if (rule.right) {
    const rightBindings = tryBindContext(rule.right, right);
    if (rightBindings == null) {
      return null;
    }
    bindings = { ...bindings, ...rightBindings };
  }

  if (rule.predicate && !evalExpression(rule.predicate, bindings)) {
    return null;
  }

  return rule.next.map(next => [
    next[0],
    next[1].map(e => evalExpression(e, bindings)),
  ]);
}

const CH = 900;
const CT = 0.4;
const ST = 3.9;
const full_pattern = {
  ignore: ["f", "~", "H"],
  initial: [
    ["-", [90]],
    ["F", [0, 0, CH]],
    ["F", [4, 1, CH]],
    ["F", [0, 0, CH]],
  ],
  rules: {
    F: [
      {
        variables: ["s", "t", "c"],
        predicate: ["&&", ["==", "t", 1], [">=", "s", 6]],
        next: [
          ["F", [["*", 2, ["/", "s", 3]], 2, "c"]],
          ["f", [1]],
          ["F", [["/", "s", 3], 1, "c"]],
        ],
      },
      {
        variables: ["s", "t", "c"],
        predicate: ["&&", ["==", "t", 2], [">=", "s", 6]],
        next: [
          ["F", [["/", "s", 3], 2, "c"]],
          ["f", [1]],
          ["F", [["*", 2, ["/", "s", 3]], 1, "c"]],
        ],
      },
      {
        variables: ["s", "t", "c"],
        left_context: [["F", "h", "i", "k"]],
        right_context: [["F", "o", "p", "r"]],
        predicate: ["||", [">", "s", ST], [">", "c", CT]],
        next: [
          [
            "F",
            ["+", "s", 0.1],
            "t",
            ["+", "c", ["*", 0.25, ["+", "k", ["-", "r", ["*", 3, "c"]]]]],
          ],
        ],
      },
    ],
    H: [
      {
        variables: ["s"],
        predicate: ["<", "s", 3],
        next: [["H", ["*", "s", 1.1]]],
      },
    ],
  },
};

module.exports = {
  evalExpression,
  tryApplyRule,
};
