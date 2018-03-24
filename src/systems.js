// @flow
// @format
const { itemExpr, makeRuleSet } = require("./lsystem");
const { toRadians } = require("./util");

/*::
import type { system } from "./lsystem";
*/

const systems /*: { [string]: system }*/ = {
  // debug
  debug: {
    initial: [["F", []]],
    angle: toRadians(45),
    initial_steps: 0,
    rules: makeRuleSet({
      rules: {
        F: [{ next: itemExpr`F + F` }],
      },
    }),
  },

  rando_flower: {
    initial: [["plant", []]],
    angle: toRadians(18),
    initial_steps: 5,
    rules: makeRuleSet({
      rules: {
        plant: [
          {
            next: itemExpr`
              (color 0 0.4 0)
              (internode) + [(plant) + (flower)] - - // [ - - (leaf)]
              (internode) [ + + (leaf)] - [ (plant) (flower) ] + + (plant)
              (flower)
            `,
          },
        ],
        internode: [
          {
            next: itemExpr`F (seg) [// & & (leaf)] [// ^ ^ (leaf)] F (seg)`,
          },
        ],
        seg: [
          { next: itemExpr`(seg) [// & & (leaf)] [// ^ ^ (leaf)] F (seg)` },
          { next: itemExpr`(seg) F (seg)` },
          { next: itemExpr`(seg)` },
        ],
        leaf: [
          {
            next: itemExpr`
              [{(color 0 1 0) + f . - ff . - f . + | + f . - ff . - f .}]
            `,
          },
        ],
        flower: [
          {
            next: itemExpr`
              [& & & (pedicel) / (wedge) //// (wedge) //// (wedge) ////
              (wedge) //// (wedge)]
            `,
          },
        ],
        pedicel: [{ next: itemExpr`FF` }],
        wedge: [
          {
            next: itemExpr`
              [(color 1 1 1)^F]
              [{(color 0 0 1) & & & & - f . + f . | - f . + f .}]
            `,
          },
        ],
      },
    }),
  },
};

// Here are a gallery of systems that I'm playing with!
module.exports = systems;
