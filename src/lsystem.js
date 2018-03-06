// @flow
// @format
const invariant = require("invariant");

// Parameterized l-systems require expressions; this here implements a little
// S-expression kinda evaluator over numbers and booleans, which is enough for
// us. These expressions get used in predicates and productions.
type value = number | boolean;
type expr = number | boolean | string | expr[];
type var_id = string;

function evalExpression(expr: expr, env: { [var_id]: value }): value {
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

type item_id = string;

// A single item in our l-system is a tuple of an ID and a set of values.
type item = [item_id, value[]];

// Context rules are a tuple of an ID and a list of variables. Such a rule
// "matches" against an item if the ID of the rule matches the ID of the
// item, and if the number of variables in the rule matches the number of
// values in the item.
type context_rule = [item_id, var_id[]];

// Attempt to bind the specified context rule against the specified "item".
// Returns null if the rule can't bind the item, otherwise returns an object
// that maps the variable names from the rule to the values they bind.
function tryBindContextRule(rule: context_rule, item: item) {
  const [binding_id, binding_vars] = rule;
  const [item_id, item_params] = item;

  if (item_id != binding_id) {
    return null;
  }
  if (binding_vars.length != item_params.length) {
    return null;
  }

  const binding = {};
  for (let j = 0; j < binding_vars.length; j++) {
    binding[binding_vars[j]] = item_params[j];
  }
  return binding;
}

// An item_expr describes how to make a new item in some environment. The first
// element in the tuple is the ID of the new item, the second is the set of
// expressions that compute the values to go along with the item.
type item_expr = [item_id, expr[]];

// A rule in our system can be configured many ways, to support a full on
// context-sensitive, parameterized l-system.
type rule = {
  // These are the names for the values in the items. If an item does not
  // have exactly one value for each variable, then the rule does not match.
  variables: var_id[],

  // This describes the required left-context of the rule. The last item of
  // `left` must match the last item of the left-context, the next-to-last item
  // of `left` must match the next-to-last item of the context, and so on.
  left: context_rule[],

  // This describes the required right-context of the rule. This is
  // interpreted the same as the left context, except the first item of
  // `right` must match the first item of the right context, and the second
  // must match the second, and so forth. In addition, the system treats the
  // branching directives '[' and ']' specially, pushing and popping from a
  // stack to backtrack as necessary while attempting to bind the rule.
  right: context_rule[],

  // This describes the list of items to ignore when matching contexts.
  // It's useful for ignoring elements that are used only for rendering.
  ignore: item_id[],

  // This is the predicate for the rule. If not present, the predicate always
  // passes. The predicate is evaluated in an environment that has bindings
  // for each of the variables described in `variables` and in the context.
  predicate: expr,

  // This is the set of productions for the next items, if the rule applies.
  // Each item in the array is a tuple (id, exprs) where `id` is the ID of
  // the item to produce, and `exprs` are expressions for the values of the
  // items. The expressions are evaluated in the same environment as the
  // predicate.
  next: item_expr[],
};

function makeRule({
  variables,
  left,
  right,
  ignore,
  predicate,
  next,
}: {
  variables?: var_id[],
  left?: context_rule[],
  right?: context_rule[],
  ignore?: item_id[],
  predicate?: expr,
  next: item_expr[],
}): rule {
  return {
    variables: variables || [],
    left: left || [],
    right: right || [],
    ignore: ignore || [],
    predicate: predicate || true,
    next: next,
  };
}

// Attempt to bind the given rules against the given context, while ignoring
// items with the IDs in `ignore`. If binding fails, returns null, otherwise
// returns an object with one entry for each variable bound by the context.
function tryBindContext(
  rules: context_rule[],
  context: item[],
  ignore: item_id[]
) {
  const stack = [];
  const bindings = {};

  let rule_pos = 0;
  for (let i = 0; i < context.length; i++) {
    const item = context[i];
    if (ignore.indexOf(item[0]) !== -1) {
      continue;
    }

    if (item[0] == "[") {
      stack.push(rule_pos);
    } else if (item[0] == "]") {
      // If there's no more stack then we've reached the logical end of the
      // context, so we can just stop.
      if (stack.length == 0) {
        return null;
      }

      // Go back to where we used to be in the rule. Don't worry about
      // clearing the old bindings; they'll just be overwritten by future
      // successful binds, or not at all.
      rule_pos = stack.pop();
    } else if (rule_pos >= 0) {
      const new_bindings = tryBindContextRule(rules[rule_pos], item);
      if (new_bindings == null) {
        // Binding didn't match. Set the flag to avoid doing any more
        // comparisons. (The flag will be reset if we ever pop the stack,
        // obviously.)
        rule_pos = -1;

        // In addition, if there was No match *and* nothing to pop off the
        // stack, then there is no way this rule will ever bind, so just
        // return early.
        if (stack.length == 0) {
          return null;
        }
      } else {
        // Binding matched; update the set of bindings....
        for (let v in new_bindings) {
          bindings[v] = new_bindings[v];
        }

        // ...and advance the rule. If this was the last rule to bind, then
        // we're done, successfully!
        rule_pos += 1;
        if (rule_pos == rules.length) {
          return bindings;
        }
      }
    }
  }

  // If we get here then we walked off the end of the context without binding
  // all of the rules, which can happen for sure.
  return null;
}

// Attempt to apply a rule, given the parameters and the left and right contexts.
// Applying a rules can fail for a lot of different reasons, including a failure
// to match either the left or right context, or failure to match the predicate,
// or failure to have the right number of parameters. If the rule applies
// successfully, this function returns an array items to replace the item being
// applied. Otherwise, this function returns null.
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

  const ignore = rule.ignore || [];
  if (rule.left.length > 0) {
    const ls = left.length - rule.left.length;
    const leftBindings = tryBindContext(rule.left, left.slice(ls), ignore);
    if (leftBindings == null) {
      return null;
    }
    bindings = { ...bindings, ...leftBindings };
  }

  if (rule.right.length > 0) {
    const rightBindings = tryBindContext(rule.right, right, ignore);
    if (rightBindings == null) {
      return null;
    }
    bindings = { ...bindings, ...rightBindings };
  }

  if (!evalExpression(rule.predicate, bindings)) {
    return null;
  }

  return rule.next.map(next => [
    next[0],
    next[1].map(e => evalExpression(e, bindings)),
  ]);
}

type rule_set = { [item_id]: rule[] };

function makeRuleSet({
  ignore,
  rules,
}: {
  ignore?: item_id[],
  rules: { [item_id]: { ignore?: item_id[], next: item_expr[] }[] },
}): rule_set {
  const result = {};
  for (let key in rules) {
    const existing = rules[key];
    result[key] = existing.map(r =>
      makeRule({ ...r, ignore: r.ignore || ignore })
    );
  }
  return result;
}

function nextState(state: item[], rules: rule_set): item[] {
  const left = [];
  const stack = [];
  const result = [];
  for (let i = 0; i < state.length; i++) {
    const [current_id, current_vals] = state[i];
    const rs = rules[current_id] || [];

    let matched = false;
    const right = state.slice(i + 1);
    for (let j = 0; j < rs.length; j++) {
      const new_items = tryApplyRule(rs[j], current_vals, left, right);
      if (new_items != null) {
        result.push(...new_items);
        matched = true;
        break;
      }
    }

    if (!matched) {
      result.push(state[i]);
    }

    if (current_id == "[") {
      stack.push(left.length);
    } else if (current_id == "]") {
      left.length = stack.pop();
    } else {
      left.push(state[i]);
    }
  }
  return result;
}

const CH = 900;
const CT = 0.4;
const ST = 3.9;
const full_pattern = {
  initial: [
    ["-", [90]],
    ["F", [0, 0, CH]],
    ["F", [4, 1, CH]],
    ["F", [0, 0, CH]],
  ],
  rules: makeRuleSet({
    ignore: ["f", "~", "H"],
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
              [
                ["+", "s", 0.1],
                "t",
                ["+", "c", ["*", 0.25, ["+", "k", ["-", "r", ["*", 3, "c"]]]]],
              ],
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
  }),
};

module.exports = {
  evalExpression,
  makeRule,
  tryApplyRule,
  makeRuleSet,
  nextState,
};
