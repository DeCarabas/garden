// @flow
// @format
const glisp = require("./gardenlisp");
const util = require("./util");

/*::
import type { Environment, Value } from "./gardenlisp";
*/

const SYM_ANGLE = glisp.sym(":angle");
const SYM_INITIAL = glisp.sym(":initial");
const SYM_INITIAL_STEPS = glisp.sym(":initial_steps");
const SYM_SYSTEMS = glisp.sym("systems");

// type system = {
//     initial: item[],
//     angle: number,
//     initial_steps: number,
//     rules: rule_set,
// };

const systems = {};

const gardenlib /*: Environment*/ = {
  parent: glisp.stdlib,
  values: {
    defsystem: new glisp.Func({
      name: "defsystem",
      is_macro: true,
      native: (values, environment) => {
        const name = glisp.assert_sym(
          values[0],
          "Name of system must be a symbol"
        );

        let i = 1;
        let description = glisp.SYM_NIL;
        let initial;
        let angle = util.toRadians(45);
        let initial_steps = 1;
        while (i < values.length) {
          if (glisp.stringp(values[i])) {
            if (description !== undefined) {
              throw glisp.eval_error(values[i], "Only specify one docstring.");
            }
          } else if (values[i] === SYM_INITIAL) {
            i++;
            initial = glisp.assert_list(
              values[i],
              "Initial state must be a list"
            );
          } else if (values[i] === SYM_ANGLE) {
            i++;
            angle = util.toRadians(
              glisp.assert_num(values[i], "Default angle must be a number")
            );
          } else if (values[i] === SYM_INITIAL_STEPS) {
            i++;
            initial_steps = glisp.assert_num(
              values[i],
              "Number of initial steps must be a number"
            );
          } else {
            throw glisp.eval_error(values[i], "Unknown system parameter");
          }
        }

        if (initial === undefined) {
          throw glisp.eval_error(
            values[0],
            "System must have an initial state"
          );
        }

        systems[name.text] = {
          angle: angle,
          initial: initial,
          initial_steps: initial_steps,
        };

        return name;
      },
    }),

    defrule: new glisp.Func({
      name: "defrule",
      is_macro: true,
      native: (values, environment) => {
        const name = glisp.assert_sym(
          values[0],
          "Name of rule must be a symbol"
        );
        const args = glisp.assert_list(
          values[1],
          "Argument list must be a list"
        );
        if (args.length != 1) {
          throw glisp.eval_error(values[1], "No arguments supported yet");
        }

        const doc_string = glisp.stringp(values[2])
          ? glisp.assert_string(values[2], "what")
          : null;

        // Ok the rules are the rest...
        values.slice(2);

        return glisp.SYM_NIL;
      },
    }),
  },
};

// Evolve from the one to the other.
function rewrite(state /*:Value*/, rules) {
  if (glisp.listp(state)) {
    state.map(x => {});
  } else {
    return state;
  }
}
