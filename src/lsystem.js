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

function expand(item, pattern, left, right) {
  const id = item[0];
  const match = pattern.rules[id] || [];

  // Pick a match?
  for (let i = 0; i < match.length; i++) {
    const r = match[i];
    if (r.variables.length != item.length + 1) {
      continue;
    }

    if (!eval_expression(r.predicate, {})) {
      continue;
    }
    if (r.left_context || r.right_context) {
      throw Error("NO CONTEXTS YET");
    }

    const next = match.next;
    for (let j = 1; j < next.length; j++) {}
    throw Error("HAVEN'T WRITEN THIS YET");
  }

  return item;
}

const CH = 900;
const CT = 0.4;
const ST = 3.9;
const full_pattern = {
  ignore: ["f", "~", "H"],
  initial: [["-", 90], ["F", 0, 0, CH], ["F", 4, 1, CH], ["F", 0, 0, CH]],
  rules: {
    F: [
      {
        variables: ["s", "t", "c"],
        predicate: ["&&", ["==", "t", 1], [">=", "s", 6]],
        next: [
          ["F", ["*", 2, ["/", "s", 3]], 2, "c"],
          ["f", 1],
          ["F", ["/", "s", 3], 1, "c"],
        ],
      },
      {
        variables: ["s", "t", "c"],
        predicate: ["&&", ["==", "t", 2], [">=", "s", 6]],
        next: [
          ["F", ["/", "s", 3], 2, "c"],
          ["f", 1],
          ["F", ["*", 2, ["/", "s", 3]], 1, "c"],
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
};
