// @flow
// @format
const invariant = require("invariant");

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

type item = [string, value[]];
type rule = {
  variables: string[],
  predicate?: expr,
  left?: [string, string[]][],
  next: [string, expr[]][],
};

function tryApplyRule(
  rule: rule,
  parameters: value[],
  left: item[]
): ?(item[]) {
  if (rule.variables.length != parameters.length) {
    return null;
  }

  const bindings: { [string]: value } = {};
  for (let i = 0; i < rule.variables.length; i++) {
    bindings[rule.variables[i]] = parameters[i];
  }

  if (rule.left) {
    // Attempt to bind left context.
    if (rule.left.length > left.length) {
      return null;
    }
    const context_base = left.length - rule.left.length;
    for (let i = 0; i < rule.left.length; i++) {
      const [binding_id, binding_vars] = rule.left[i];
      const [item_id, item_params] = left[context_base + i];

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
