// @flow
// @format
const invariant = require("invariant");

// Parameterized l-systems require expressions; this here implements a little
// S-expression kinda evaluator over numbers and booleans, which is enough for
// us. These expressions get used in predicates and productions.
/*::
type value = number | boolean;
type expr = number | boolean | string | expr[];
type var_id = string;
*/

// This dumb helper is used to make casting easier when using flow comment
// syntax.
const as_any = x => /*:: ( */ x /*:: :any) */;

function evalExpression(
  expr /*: expr*/,
  env /*: { [var_id]: value }*/
) /*: value*/ {
  if (typeof expr == "string") {
    return env[expr];
  } else if (typeof expr == "number" || typeof expr == "boolean") {
    return expr;
  } else {
    const fn = expr[0];
    const args = expr.slice(1).map(e => evalExpression(e, env));
    // When uncommented, this debug function needs access to the `fn` and `args
    // parameters.
    // eslint-disable-next-line no-inner-declarations
    function dbg(result) {
      //console.log("(", fn, ...args, ") =>", result);
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
          if (as_any(args[0]) != as_any(args[i])) {
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

/*::
type item_id = string;

// A single item in our l-system is a tuple of an ID and a set of values.
export type item = [item_id, value[]];

// Context rules are a tuple of an ID and a list of variables. Such a rule
// "matches" against an item if the ID of the rule matches the ID of the
// item, and if the number of variables in the rule matches the number of
// values in the item.
type context_rule = [item_id, var_id[]];
*/

// Attempt to bind the specified context rule against the specified "item".
// Returns null if the rule can't bind the item, otherwise returns an object
// that maps the variable names from the rule to the values they bind.
function tryBindContextRule(rule, item) {
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

/*::
// An item_expr describes how to make a new item in some environment. The first
// element in the tuple is the ID of the new item, the second is the set of
// expressions that compute the values to go along with the item.
export type item_expr = [item_id, expr[]];

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

  // This is a number indicating the probability that this rule will be
  // selected. The probabilities are normalized after context and predicate
  // are evaulated, based on the remaining rules, so this probability does
  // not have to fit in any particular range.
  probability: number,

  // This is the set of productions for the next items, if the rule applies.
  // Each item in the array is a tuple (id, exprs) where `id` is the ID of
  // the item to produce, and `exprs` are expressions for the values of the
  // items. The expressions are evaluated in the same environment as the
  // predicate.
  next: item_expr[],
};
*/

function makeRule(
  {
    variables,
    left,
    right,
    ignore,
    predicate,
    probability,
    next,
  } /*: {
  variables?: var_id[],
  left?: context_rule[],
  right?: context_rule[],
  ignore?: item_id[],
  predicate?: expr,
  probability?: number,
  next: item_expr[],
}*/
) /*: rule*/ {
  return {
    variables: variables || [],
    left: left || [],
    right: right || [],
    ignore: ignore || [],
    predicate: predicate || true,
    probability: probability || 1,
    next: next,
  };
}

// Attempt to bind the given rules against the given context, while ignoring
// items with the IDs in `ignore`. If binding fails, returns null, otherwise
// returns an object with one entry for each variable bound by the context.
function tryBindContext(rules, context, ignore) {
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
// successfully, this function returns the bindings for the successful
// application of the rule, otherwise it returns null.
function tryBindRule(
  rule /*: rule*/,
  parameters /*: value[]*/,
  left /*: item[]*/,
  right /*: item[]*/
) /*: ?{ [var_id]: value }*/ {
  if (rule.variables.length != parameters.length) {
    return null;
  }

  let bindings = {};
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
    for (let v in leftBindings) {
      bindings[v] = leftBindings[v];
    }
  }

  if (rule.right.length > 0) {
    const rightBindings = tryBindContext(rule.right, right, ignore);
    if (rightBindings == null) {
      return null;
    }
    for (let v in rightBindings) {
      bindings[v] = rightBindings[v];
    }
  }

  if (!evalExpression(rule.predicate, bindings)) {
    return null;
  }

  return bindings;
}

/*::
export type rule_set = { [item_id]: rule[] };
*/

// A helper function for making rule sets, along with propagating ignore sets
// into each rule.
function makeRuleSet(
  {
    ignore,
    rules,
  } /*: {
  ignore?: item_id[],
  rules: { [item_id]: { ignore?: item_id[], next: item_expr[] }[] },
}*/
) /*: rule_set*/ {
  const result = {};
  for (let key in rules) {
    const existing = rules[key];
    result[key] = existing.map(r => {
      return makeRule(Object.assign({}, r, { ignore: r.ignore || ignore }));
    });
  }
  return result;
}

// Rewrite an input string given an L-system.
// This is the heart of the L-system; this is what makes it go. Call this in
// a loop to evolve the system.
function rewrite(state /*: item[]*/, rules /*: rule_set*/) /*: item[]*/ {
  // Select a match at random from the lsit of supplied matches, respecting
  // individual rule probabilities.
  function pickMatch(matches) {
    if (matches.length == 1) {
      return matches[0];
    }

    const total = matches.reduce((p, m) => p + m.rule.probability, 0);
    let pick = Math.random() * total;
    for (let j = 0; j < matches.length; j++) {
      pick -= matches[j].rule.probability;
      if (pick <= 0) {
        return matches[j];
      }
    }
    return matches[matches.length - 1];
  }

  const left = [];
  const stack = [];
  const result = [];
  for (let i = 0; i < state.length; i++) {
    const [current_id, current_vals] = state[i];
    const rs = rules[current_id] || [];

    const right = state.slice(i + 1);
    const matches = rs
      .map(r => {
        return {
          rule: r,
          bindings: tryBindRule(r, current_vals, left, right),
        };
      })
      .filter(m => m.bindings != null);

    if (matches.length == 0) {
      result.push(state[i]);
    } else {
      const match = pickMatch(matches);
      const bindings = match.bindings;
      invariant(bindings != null, "(see filter)");
      const new_items = match.rule.next.map(next => [
        next[0],
        next[1].map(e => evalExpression(e, bindings)),
      ]);
      result.push(...new_items);
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

// Parse a string into a list of item exprs. A convenience for authoring.
// The grammar is a little bit odd: by default (at the top level) individual
// symbols stand alone. Parenthesis are handled specially: within a parenthesis
// symbols must be separated by whitespace. Nested parenthesis represent
// S-expressions to be evaluated.
function parseItemExpr(rule_value /*: string*/) /*: item_expr[]*/ {
  let i = 0;
  function isSpace(code) {
    return code == /* */ 32 || code == /*\n*/ 10 || code == /*\r*/ 13;
  }
  function isDigit(code) {
    return code >= /*0*/ 48 && code <= /*9*/ 57;
  }
  function isSymbolCharacter(code) {
    return code != /*(*/ 40 && code != /*)*/ 41 && !isSpace(code);
  }
  function skipWhiteSpace() {
    while (i < rule_value.length && isSpace(rule_value.charCodeAt(i))) {
      i++;
    }
  }
  function parseSExpression() {
    skipWhiteSpace();
    const code = rule_value.charCodeAt(i);
    if (code == /*(*/ 40) {
      // Nested sexpr.
      i++;
      let result = [];
      while (i < rule_value.length && rule_value.charCodeAt(i) != /*)*/ 41) {
        result.push(parseSExpression());
      }
      if (i < rule_value.length) {
        i++;
      }
      return result;
    } else if (isDigit(code)) {
      // Number.
      let start = i;
      i++;
      while (i < rule_value.length && isDigit(rule_value.charCodeAt(i))) {
        i++;
      }
      if (i < rule_value.length && rule_value.charCodeAt(i) == /*.*/ 46) {
        i++;
        while (i < rule_value.length && isDigit(rule_value.charCodeAt(i))) {
          i++;
        }
      }
      return Number.parseFloat(rule_value.substr(start, i - start));
    } else {
      // Symbol.
      let start = i;
      i++;
      while (
        i < rule_value.length &&
        isSymbolCharacter(rule_value.charCodeAt(i))
      ) {
        i++;
      }
      return rule_value.substr(start, i - start);
    }
  }
  function parseExpr() {
    let result = parseSExpression();
    if (typeof result == "string") {
      return [result, []];
    } else if (typeof result == "number") {
      throw Error("No bare numbers");
    } else {
      const symbol = result[0];
      if (typeof symbol != "string") {
        throw Error("First thingy in a paren must be a string dummy");
      } else {
        return [symbol, result.slice(1)];
      }
    }
  }

  // Symbols stand alone, whitespace is ignored, everything between
  // parenthesis are treated as a single symbol.
  const symbols = [];
  while (i < rule_value.length) {
    skipWhiteSpace();
    if (i < rule_value.length) {
      switch (rule_value.charCodeAt(i)) {
        case /*(*/ 40:
          symbols.push(parseExpr());
          break;
        default:
          symbols.push([rule_value[i], []]);
          i++;
          break;
      }
    }
  }
  return symbols;
}

function itemExpr(
  chunks /*: string[]*/,
  ...vals /*: any[]*/
) /*: item_expr[]*/ {
  // One big string...
  let rule_value = "";
  for (let i = 0; i < chunks.length; i++) {
    rule_value += chunks[i];
    if (i < vals.length) {
      rule_value += vals[i].toString();
    }
  }
  return parseItemExpr(rule_value);
}

module.exports = {
  evalExpression,
  itemExpr,
  makeRule,
  makeRuleSet,
  parseItemExpr,
  rewrite,
  tryBindRule,
};
