// @flow
// @format

// Values in gardenlisp.
/*::
export type Value = number | string | Func | Sym | Value[];
*/

// Numbers.
const numberp = (value /*:Value*/) /*: boolean %checks*/ =>
  typeof value === "number";
function assert_num(value /*:Value*/, message /*:string*/) {
  if (!numberp(value)) {
    throw eval_error(value, message || "Value must be a number");
  }
  return value;
}

// Lists.
const listp = (value /*:Value*/) /*: boolean %checks*/ => Array.isArray(value);
function assert_list(value /*:Value*/, message /*:string*/) {
  if (!listp(value)) {
    throw eval_error(value, message || "Value must be a list");
  }
  return value;
}

// Strings
const stringp = (value /*:Value*/) /*: boolean %checks*/ =>
  typeof value === "string";
function assert_string(value /*:Value*/, message /*:string*/) {
  if (!stringp(value)) {
    throw eval_error(value, message || "Value must be a string");
  }
  return value;
}

// Symbols.
class Sym {
  /*::
    text: string;
  */
  constructor(text /*:string*/) {
    this.text = text;
  }

  toString() {
    return "Sym{" + this.text + "}";
  }
}

const _symbol_table = {};
function sym(text /*:string*/) /*:Sym*/ {
  const existing = _symbol_table[text];
  if (existing !== undefined) {
    return existing;
  }

  const new_sym = new Sym(text);
  _symbol_table[text] = new_sym;
  return new_sym;
}
const symbolp = (value /*:Value*/) /*: boolean %checks */ =>
  value instanceof Sym;
function assert_sym(value /*:Value*/, message /*:string*/) /*:Sym*/ {
  if (!symbolp(value)) {
    throw eval_error(value, message || "Value must be a symbol");
  }
  return value;
}

const SYM_T = sym("t");
const SYM_NIL = sym("nil");
const SYM_QUOTE = sym("quote");
const SYM_DEFER = sym("defer");
const SYM_OPTIONAL = sym("&optional");
const SYM_REST = sym("&rest");

// Functions
const progn = (list, environment) => {
  let last_value = SYM_NIL;
  for (let i = 0; i < list.length; i++) {
    last_value = eval_expr(list[i], environment);
  }
  return last_value;
};

class Func {
  /*::
  form: Value[];
  closure: Environment;
  name: ?string;
  doc: ?string;
  arg_names: string[];
  opt_args: string[];
  rest_arg: ?string;
  is_macro: boolean;
  native: ?((Value[], Environment) => Value);
  */
  constructor(
    props /*: {
    form?: Value[],
    closure?: Environment,
    name?: string,
    doc?: string,
    arg_names?: string[],
    opt_args?: string[],
    rest_arg?: string,
    is_macro?: boolean,
    native?: (Value[], Environment) => Value,
  }*/
  ) {
    this.form = props.form || [SYM_NIL];
    this.closure = props.closure || new_environment(null);
    this.name = props.name;
    this.doc = props.doc;
    this.arg_names = props.arg_names || [];
    this.opt_args = props.opt_args || [];
    this.rest_arg = props.rest_arg;
    this.is_macro = !!props.is_macro;
    this.native = props.native;
  }

  invoke(args /*:Value[]*/, environment /*:Environment*/) {
    if (this.native) {
      return this.native(args, environment);
    }

    const new_env = new_environment(this.closure);
    if (args.length < this.arg_names.length) {
      throw Error("Too few args for " + (this.name || "lambda"));
    }

    if (
      args.length > this.arg_names.length + this.opt_args.length &&
      !this.rest_arg
    ) {
      throw Error("Too many args for " + (this.name || "lambda"));
    }

    for (let i = 0; i < this.arg_names.length; i++) {
      const arg_name = this.arg_names[i];
      const arg_value = args[i];
      new_env.values[arg_name] = arg_value;
    }

    for (let i = 0; i < this.opt_args.length; i++) {
      const arg_name = this.opt_args[i];
      const arg_value_index = i + this.arg_names.length;
      const arg_value =
        arg_value_index < args.length ? args[arg_value_index] : SYM_NIL;
      new_env.values[arg_name] = arg_value;
    }

    const rest_arg = this.rest_arg;
    if (rest_arg) {
      const arg_value_index = this.arg_names.length + this.opt_args.length;
      const arg_value = args.slice(arg_value_index);
      new_env.values[rest_arg] = arg_value;
    }

    return progn(this.form, new_env);
  }
}

const functionp = (value /*:Value*/) /*:%checks*/ => value instanceof Func;

// Character constants for reading.
const C_0 = "0".charCodeAt(0);
const C_9 = "9".charCodeAt(0);
const C_A = "A".charCodeAt(0);
const C_AMPERSAND = "&".charCodeAt(0);
const C_APOS = "'".charCodeAt(0);
const C_AT = "@".charCodeAt(0);
const C_BACKSLASH = "\\".charCodeAt(0);
const C_COLON = ":".charCodeAt(0);
const C_CR = "\r".charCodeAt(0);
const C_DASH = "-".charCodeAt(0);
const C_DOLLAR = "$".charCodeAt(0);
const C_DOT = ".".charCodeAt(0);
const C_EQUAL = "=".charCodeAt(0);
const C_EXCLAMATION = "!".charCodeAt(0);
const C_GT = ">".charCodeAt(0);
const C_HAT = "^".charCodeAt(0);
const C_LBRAC = "[".charCodeAt(0);
const C_LCURLY = "{".charCodeAt(0);
const C_LPAREN = "(".charCodeAt(0);
const C_LT = "<".charCodeAt(0);
const C_NL = "\n".charCodeAt(0);
const C_PERCENT = "%".charCodeAt(0);
const C_PLUS = "+".charCodeAt(0);
const C_QUOT = '"'.charCodeAt(0);
const C_RBRAC = "]".charCodeAt(0);
const C_RCURLY = "}".charCodeAt(0);
const C_RPAREN = ")".charCodeAt(0);
const C_SEMI = ";".charCodeAt(0);
const C_SLASH = "/".charCodeAt(0);
const C_SPACE = " ".charCodeAt(0);
const C_STAR = "*".charCodeAt(0);
const C_TAB = "\t".charCodeAt(0);
const C_TILDE = "~".charCodeAt(0);
const C_UNDERSCORE = "_".charCodeAt(0);
const C_Z = "Z".charCodeAt(0);
const C_a = "a".charCodeAt(0);
const C_z = "z".charCodeAt(0);

function isWhitespace(code) {
  return code === C_SPACE || code === C_TAB || code === C_NL || code === C_CR;
}

function isDigit(code) {
  return code >= C_0 && code <= C_9;
}

function isSymbolChar(code) {
  return (
    (code >= C_A && code <= C_Z) ||
    (code >= C_a && code <= C_z) ||
    code === C_DASH ||
    code === C_PLUS ||
    code === C_EQUAL ||
    code === C_STAR ||
    code === C_SLASH ||
    code === C_BACKSLASH ||
    code === C_UNDERSCORE ||
    code === C_TILDE ||
    code === C_EXCLAMATION ||
    code === C_AT ||
    code === C_DOLLAR ||
    code === C_PERCENT ||
    code === C_HAT ||
    code === C_AMPERSAND ||
    code === C_COLON ||
    code === C_LT ||
    code === C_GT ||
    code === C_LCURLY ||
    code === C_RCURLY
  );
}

class SourceMap {
  /*::
  lines;
  filename;
  */

  constructor(filename) {
    this.filename = filename;
    this.lines = [];
  }

  // This binary search has the nice behavior that if it doesn't find the
  // result it returns the bitwise compliment of the index of the first
  // element (if any) that is larger than the specified value. (This behavior
  // lifted from the .net framework.)
  binarySearch(value) {
    const array = this.lines;

    let lo = 0;
    let hi = array.length - 1;
    while (lo <= hi) {
      const i = (hi + lo) >> 1;
      const c = array[i] - value;
      if (c === 0) return i;
      if (c < 0) {
        lo = i + 1;
      } else {
        hi = i - 1;
      }
    }
    return ~lo;
  }

  getLineColumn(position) {
    const lines = this.lines;
    let line_idx = this.binarySearch(position);
    if (line_idx < 0) {
      // No exact match found; ~line_idx is the index of the position greater
      // than the one we passed in. Subtract one to find the index of the
      // position smaller than the one we passed in.
      line_idx = ~line_idx - 1;
    }

    if (line_idx < 0) {
      // We're on the first line and position is the column number, obv.
      return [1, position];
    } else {
      const line_start = lines[line_idx];
      // line_idx is the index of the line right before this one, and then also
      // we're 1-based.
      const line_number = line_idx + 2;

      // For the column number, though, we're zero based *and* we need to account
      // for the newline in the map.
      const column_number = position - line_start - 1;
      return [line_number, column_number];
    }
  }

  push(position) {
    this.lines.push(position);
  }
}

class SourceError extends Error {
  /*::
    line: number;
    col: number;
  */
  constructor(line /*:number*/, col /*:number*/, ...params /*:any[]*/) {
    // Pass remaining arguments (including vendor specific ones) to parent
    // constructor
    super(...params);

    // Maintains proper stack trace for where our error was thrown (only
    // available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SourceError);
    }

    this.line = line;
    this.col = col;
  }
}

function error(lines, pos, message) {
  const [line, col] = lines.getLineColumn(pos);
  const file = lines.filename ? lines.filename + ":" : "";
  return new SourceError(line, col, `(${file}${line}:${col}) ${message}`);
}

function tokenize(str /*:string*/, filename /*:(void | string)*/) {
  let i = 0;
  const tokens = [];
  const lines = new SourceMap(filename);

  function tok(x) {
    tokens.push(x);
  }

  while (i < str.length) {
    let code = str.charCodeAt(i);
    if (isWhitespace(code)) {
      const start = i;
      while (i < str.length && isWhitespace(code)) {
        if (code === C_NL) {
          lines.push(i);
        }
        i++;
        code = str.charCodeAt(i);
      }
      tok({ type: "WHITESPACE", start: start, length: i - start });
    } else if (code === C_LPAREN) {
      tok({ type: "LPAREN", start: i++, length: 1 });
    } else if (code === C_RPAREN) {
      tok({ type: "RPAREN", start: i++, length: 1 });
    } else if (code === C_LBRAC) {
      tok({ type: "LBRAC", start: i++, length: 1 });
    } else if (code === C_RBRAC) {
      tok({ type: "RBRAC", start: i++, length: 1 });
    } else if (code === C_APOS) {
      tok({ type: "QUOTE", start: i++, length: 1 });
    } else if (isDigit(code) || code === C_DOT) {
      const start = i;
      while (i < str.length && isDigit(code)) {
        i++;
        code = str.charCodeAt(i);
      }
      if (code === C_DOT) {
        i++;
        if (i < str.length) {
          code = str.charCodeAt(i);
          while (i < str.length && isDigit(code)) {
            i++;
            code = str.charCodeAt(i);
          }
        }
      }
      tok({ type: "NUMBER", start: start, length: i - start });
    } else if (isSymbolChar(code)) {
      const start = i;
      while (i < str.length && (isSymbolChar(code) || isDigit(code))) {
        if (code === C_BACKSLASH) {
          // Skip the next character; any character can be in a symbol
          // if you escape it.
          i++;
          code = str.charCodeAt(i);
        }
        // Need to check for newlines since (ugh) *any* character can be in a
        // symbol!
        if (code === C_NL) {
          lines.push(i);
        }
        i++;
        code = str.charCodeAt(i);
      }
      tok({ type: "SYMBOL", start: start, length: i - start });
    } else if (code === C_QUOT) {
      const start = i;
      i++;
      code = str.charCodeAt(i);
      while (i < str.length && code != C_QUOT) {
        if (code === C_BACKSLASH) {
          // Skip the next character; this is to avoid '\"' closing a string.
          i++;
          code = str.charCodeAt(i);
        }
        if (code === C_NL) {
          // Strings in this language can contain newlines.
          lines.push(i);
        }
        i++;
        code = str.charCodeAt(i);
      }
      if (code != C_QUOT) {
        throw error(lines, i, "Unterminated string constant");
      }
      i++;
      tok({ type: "STRING", start: start, length: i - start });
    } else if (code === C_SEMI) {
      const start = i;
      i++;
      code = str.charCodeAt(i);
      while (i < str.length && code !== C_NL) {
        i++;
        code = str.charCodeAt(i);
      }
      if (code === C_NL) {
        lines.push(i);
        i++;
      }
      tok({ type: "COMMENT", start: start, length: i - start });
    } else {
      throw error(
        lines,
        i,
        `Unrecognized character in source: '${String.fromCharCode(
          code
        )}' (${code})`
      );
    }
  }

  tok({ type: "EOF", start: str.length, length: 0 });
  return { tokens, lines };
}

/*::
type SourceLocation = {| start: number, end: number, lines: SourceMap |};
*/

const _srcloc = Symbol("_srcloc");
function set_srcloc(obj /*: any*/, loc /*: SourceLocation*/) {
  // // Symbols are interned.
  // if (symbolp(obj)) {
  //   return;
  // }
  // // Strings can't have properties added to them.
  // if (stringp(obj)) {
  //   return;
  // }
  // // Nor can numbers?
  // if (numberp(obj)) {
  //   return;
  // }
  // obj[_srcloc] = loc;
}
function get_srcloc(obj /*: any*/) /*: ?SourceLocation*/ {
  return obj[_srcloc] || null;
  //return obj._srcloc || null;
}

function read_(
  text,
  tokens,
  lines,
  start
) /*: {| result: Value, end: number |}*/ {
  let token_index = start;

  function syntaxError(expected) {
    let msg = "Syntax error at " + tokens[token_index].type;
    if (expected) {
      msg += " (Expected " + expected + ")";
    }
    return error(lines, tokens[token_index].start, msg);
  }

  function consume(ttype) {
    if (tokens[token_index].type !== ttype) {
      throw syntaxError(ttype);
    }
    token_index++;
  }

  function peek() {
    return tokens[token_index].type;
  }

  function tokenText() {
    return text.substr(tokens[token_index].start, tokens[token_index].length);
  }

  function skipWhitespace() {
    while (peek() === "WHITESPACE" || peek() === "COMMENT") {
      if (peek() === "WHITESPACE") {
        consume("WHITESPACE");
      } else {
        consume("COMMENT");
      }
    }
  }

  function parseDeferred() {
    const result = [];
    consume("LBRAC");
    while (peek() !== "RBRAC") {
      result.push(parseObject());
    }
    consume("RBRAC");
    return [SYM_DEFER, result];
  }

  function parseList() {
    const result = [];
    consume("LPAREN");
    while (peek() !== "RPAREN") {
      result.push(parseObject());
    }
    consume("RPAREN");
    return result;
  }

  function parseNumber() {
    const result = Number.parseFloat(tokenText());
    consume("NUMBER");
    return result;
  }

  function parseQuote() {
    consume("QUOTE");
    return [SYM_QUOTE, parseObject()];
  }

  function parseString() {
    let result = "";
    const { start, length } = tokens[token_index];
    let i = 1;
    while (i < length - 1) {
      const char = text[i + start];
      if (char === "\\") {
        i += 1;
        const esc_char = text[i + start];
        if (esc_char === "n") {
          result += "\n";
        } else if (esc_char === "t") {
          result += "\t";
        } else if (esc_char === "r") {
          result += "\r";
        } else if (esc_char === "b") {
          result += "\b";
        } else if (esc_char === "f") {
          result += "\f";
        } else if (esc_char === "v") {
          result += "\v";
        } else if (esc_char === "\n") {
          // This is ignored; it is a line continuation.
        } else {
          result += esc_char;
        }
        i += 1;
      } else {
        result += char;
        i += 1;
      }
    }
    consume("STRING");
    return result;
  }

  function parseSymbol() {
    let symname = "";
    const { start, length } = tokens[token_index];
    for (let i = 0; i < length; i++) {
      const char = text[i + start];
      if (char !== "\\") {
        symname += char;
      }
    }
    consume("SYMBOL");
    return sym(symname);
  }

  function parseObject() {
    skipWhitespace();
    let result;
    const start_tok = token_index;
    switch (peek()) {
      case "LBRAC":
        result = parseDeferred();
        break;
      case "LPAREN":
        result = parseList();
        break;
      case "NUMBER":
        result = parseNumber();
        break;
      case "QUOTE":
        result = parseQuote();
        break;
      case "STRING":
        result = parseString();
        break;
      case "SYMBOL":
        result = parseSymbol();
        break;
      default:
        throw syntaxError();
    }

    set_srcloc(result, {
      start: tokens[start_tok].start,
      end: tokens[token_index].start + tokens[token_index].length,
      lines: lines,
    });
    return result;
  }

  const result = parseObject();
  return { result, end: token_index };
}

function read(text /*: string*/, filename /*:(void | string)*/) /*: Value*/ {
  const { tokens, lines } = tokenize(text, filename);
  const { result } = read_(text, tokens, lines, 0);
  return result;
}

function read_file(
  text /*: string*/,
  filename /*:(void | string)*/
) /*: Value[]*/ {
  const values = [];
  const { tokens, lines } = tokenize(text, filename);
  let position = 0;
  while (position < tokens.length && tokens[position].type !== "EOF") {
    const { result, end } = read_(text, tokens, lines, position);
    values.push(result);
    position = end;
    while (
      position < tokens.length &&
      (tokens[position].type === "WHITESPACE" ||
        tokens[position].type === "COMMENT")
    ) {
      position++;
    }
  }
  return values;
}

function format_value(value /*:Value*/) /*: string*/ {
  if (symbolp(value)) {
    return value.text;
  }
  if (functionp(value)) {
    return "<Func " + (value.name || "lambda") + ">";
  }
  if (stringp(value)) {
    let result = '"';
    for (let i = 0; i < value.length; i++) {
      const c = value[i];
      if (c === '"') {
        result += '\\"';
      } else if (c === "\b") {
        result += "\\b";
      } else if (c === "\r") {
        result += "\\r";
      } else if (c === "\t") {
        result += "\\t";
      } else if (c === "\f") {
        result += "\\f";
      } else if (c === "\v") {
        result += "\\v";
      } else if (c === "\\") {
        result += "\\\\";
      } else {
        result += c;
      }
    }
    return result + '"';
  }
  if (listp(value)) {
    return "(" + value.map(v => format_value(v)).join(" ") + ")";
  }
  return value.toString();
}

/*::
export type Environment = {|
  values: { [string]: Value },
  parent: ?Environment,
|};
*/

function new_environment(parent /*:?Environment*/) /*: Environment*/ {
  return {
    values: {},
    parent: parent,
  };
}

function find_value(form, name, environment) {
  let f;
  while (environment) {
    f = environment.values[name];
    if (f !== undefined) {
      return f;
    }
    environment = environment.parent;
  }
  throw eval_error(form, "Symbol's definition as a variable is void: " + name);
}

function eval_error(form /*:Value*/, message /*:string*/) {
  const srcloc = get_srcloc(form);
  if (srcloc) {
    return error(srcloc.lines, srcloc.start, message);
  } else {
    return Error(message);
  }
}

function eval_symbol(
  form /*: Sym*/,
  environment /*: Environment*/
) /*: Value*/ {
  if (
    form === SYM_T ||
    form === SYM_NIL ||
    form.text.charCodeAt(0) === C_COLON
  ) {
    return form;
  }

  return find_value(form, form.text, environment);
}

function eval_list(
  form /*: Value[]*/,
  environment /*: Environment*/
) /*: Value*/ {
  if (form.length == 0) {
    return SYM_NIL;
  }

  const first_elem = form[0];
  const first_val = eval_expr(first_elem, environment);
  if (!functionp(first_val)) {
    throw eval_error(
      first_elem,
      "Invalid function " + format_value(first_elem)
    );
  }

  if (first_val.is_macro) {
    try {
      const new_form = first_val.invoke(form.slice(1), environment);
      return eval_expr(new_form, environment);
    } catch (e) {
      if (!(e instanceof SourceError)) {
        throw eval_error(first_elem, e.message);
      } else {
        throw e;
      }
    }
  }

  const arg_vals = form.slice(1).map(f => eval_expr(f, environment));
  return first_val.invoke(arg_vals, environment);
}

function eval_expr(
  form /*: Value*/,
  environment /*: Environment*/
) /*: Value*/ {
  if (listp(form)) {
    return eval_list(form, environment);
  } else if (symbolp(form)) {
    return eval_symbol(form, environment);
  } else {
    return form;
  }
}

function lambda_(values, environment) {
  // First arg is an argument list.
  const argnames = assert_list(
    values[0],
    "Second argument must be an arg list"
  );

  const arg_names = [];
  const opt_args = [];
  let processing_optional = false;
  let rest_arg;
  for (let i = 0; i < argnames.length; i++) {
    const arg_name = assert_sym(argnames[i], "Argument name must be a symbol");

    if (arg_name === SYM_OPTIONAL) {
      if (processing_optional) {
        throw eval_error(
          arg_name,
          "&optional may only exist in the arg list once"
        );
      }
      processing_optional = true;
    } else if (arg_name === SYM_REST) {
      if (i != argnames.length - 2) {
        throw eval_error(
          arg_name,
          "&rest must come just before the last argument name"
        );
      }

      const rest_sym = assert_sym(
        argnames[i + 1],
        "Argument name must be a symbol"
      );
      rest_arg = rest_sym.text;
      break;
    } else if (processing_optional) {
      opt_args.push(arg_name.text);
    } else {
      arg_names.push(arg_name.text);
    }
  }

  let doc;
  let first_form = 1;
  if (stringp(values[first_form])) {
    doc = values[first_form];
    first_form = 2;
  }

  return new Func({
    form: values.slice(first_form),
    closure: environment,
    doc,
    arg_names,
    opt_args,
    rest_arg,
  });
}

const stdlib /*: Environment*/ = {
  parent: null,
  values: {
    lambda: new Func({
      name: "lambda",
      is_macro: true, // Works because eval(<func>) yields <func>.
      native: lambda_,
    }),

    defun: new Func({
      name: "defun",
      is_macro: true,
      native: function defun(values, environment) {
        const name = assert_sym(values[0], "First argument must be a symbol");
        const func = lambda_(values.slice(1), environment);
        func.name = name.text;

        environment.values[func.name] = func;
        return SYM_NIL;
      },
    }),

    defmacro: new Func({
      name: "defmacro",
      is_macro: true,
      native: function defmacro(values, environment) {
        const name = assert_sym(values[0], "First argument must be a symbol");
        const func = lambda_(values.slice(1), environment);
        func.name = name.text;
        func.is_macro = true;

        environment.values[func.name] = func;
        return SYM_NIL;
      },
    }),

    progn: new Func({
      name: "progn",
      native: (values, _) => values[values.length - 1],
    }),

    "+": new Func({
      name: "+",
      native: (values, _) =>
        values.reduce(
          (s, x) => assert_num(x, "Arguments to + must be numbers") + s,
          0
        ),
    }),

    "*": new Func({
      name: "*",
      native: (values, _) =>
        values.reduce(
          (s, x) => assert_num(x, "Arguments to * must be numbers") * s,
          1
        ),
    }),

    "-": new Func({
      name: "-",
      native: (values, _) => {
        const msg = "Arguments to - must be numbers";
        return values.length === 1
          ? -assert_num(values[0], msg)
          : values
              .slice(1)
              .reduce(
                (s, x) => s - assert_num(x, msg),
                assert_num(values[0], msg)
              );
      },
    }),

    "/": new Func({
      name: "/",
      native: (values, _) => {
        const msg = "Arguments to / must be numbers";
        return values.length === 1
          ? 1.0 / assert_num(values[0], msg)
          : values
              .slice(1)
              .reduce(
                (s, x) => s / assert_num(x, msg),
                assert_num(values[0], msg)
              );
      },
    }),

    if: new Func({
      name: "if",
      is_macro: true,
      native: function if_(values, environment) {
        if (values.length === 0) {
          return SYM_NIL;
        }

        if (eval_expr(values[0], environment) !== SYM_NIL) {
          if (values.length > 1) {
            return eval_expr(values[1], environment);
          } else {
            return SYM_NIL;
          }
        } else {
          if (values.length < 3) {
            return SYM_NIL;
          }

          return progn(values.slice(2), environment);
        }
      },
    }),

    eq: new Func({
      name: "eq",
      native: (values, _) => (values[0] === values[1] ? SYM_T : SYM_NIL),
    }),

    list: new Func({
      name: "list",
      native: (values, environment) => values,
    }),

    quote: new Func({
      name: "quote",
      is_macro: true,
      native: (values, environment) => values[0],
    }),

    append: new Func({
      name: "append",
      native: (values, _) => {
        const result = [];
        for (let i = 0; i < values.length; i++) {
          result.push(
            ...assert_list(values[i], "Arguments to append must be lists")
          );
        }
        return result;
      },
    }),

    print: new Func({
      name: "print",
      is_macro: false,
      native: (values, _) => {
        console.log(...values.map(v => format_value(v)));
        return SYM_NIL;
      },
    }),

    defer: new Func({
      name: "defer",
      is_macro: true,
      native: (values, _) => [SYM_DEFER, values],
    }),

    letrec: new Func({
      name: "letrec",
      is_macro: true,
      native: (values, environment) => {
        const varlist = assert_list(values[0], "Missing variable list in let");

        const env = new_environment(environment);
        for (let i = 0; i < varlist.length; i++) {
          const pair = varlist[i];
          if (listp(pair)) {
            if (pair.length < 1 || pair.length > 2) {
              throw eval_error(pair, "Variable list must be a list of pairs");
            }
            const v = assert_sym(pair[0], "Variable names must be symbols");
            env.values[v.text] = SYM_NIL;
            if (pair.length == 2) {
              env.values[v.text] = eval_expr(pair[1], env);
            }
          } else if (symbolp(pair)) {
            env.values[pair.text] = SYM_NIL;
          } else {
            throw eval_error(
              pair,
              "Variable names must be one symbol, or a symbol and an " +
                "expression."
            );
          }
        }

        return progn(values.slice(1), env);
      },
    }),
  },
};

module.exports = {
  Func,
  SYM_NIL,
  assert_list,
  assert_num,
  assert_string,
  assert_sym,
  eval_error,
  eval_expr,
  format_value,
  listp,
  new_environment,
  read,
  read_file,
  stdlib,
  stringp,
  sym,
};
