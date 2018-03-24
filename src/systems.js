// @flow
// @format
const { itemExpr, makeRuleSet } = require("./lsystem");

/*::
import type { item, rule_set } from "./lsystem";

type system = {
  initial: item[],
  angle: number,
  initial_steps: number,
  rules: rule_set,
};
*/

function toRadians(degrees) {
  return degrees * (Math.PI / 180.0);
}

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

  // Hexagonal gosper curve (not right)
  hex_gosper: {
    initial: [["F", []], ["F1", []]],
    angle: toRadians(60),
    initial_steps: 4,
    rules: makeRuleSet({
      rules: {
        F1: [{ next: itemExpr`F(F1)+F(Fr)++F(Fr)-F(F1)--F(F1)F(F1)-F(Fr)+` }],
        Fr: [{ next: itemExpr`-F(F1)+F(Fr)F(Fr)++F(Fr)+F(F1)--F(F1)-F(Fr)` }],
      },
    }),
  },

  // Two-dimensional hilbert curve
  hilbert2d: {
    initial: [["L", []]],
    angle: toRadians(90),
    initial_steps: 3,
    rules: makeRuleSet({
      rules: {
        L: [{ next: itemExpr`+RF-LFL-FR+` }],
        R: [{ next: itemExpr`-LF+RFR+FL-` }],
      },
    }),
  },

  // Three-dimensional hilbert curve
  hilbert3d: {
    initial: [["A", []]],
    angle: toRadians(90),
    initial_steps: 2,
    rules: makeRuleSet({
      rules: {
        A: [{ next: itemExpr`B-F+CFC+F-D&F^D-F+&&CFC+F+B//` }],
        B: [{ next: itemExpr`A&F^CFB^F^D^^-F-D^|F^B|FC^F^A//` }],
        C: [{ next: itemExpr`|D^|F^B-F+C^F^A&&FA&F^C+F+B^F^D//` }],
        D: [{ next: itemExpr`|CFB-F+B|FA&F^A&&FB-F+B|FC//` }],
      },
    }),
  },

  // Example 'f' of axial trees, kinda pretty.
  axialf: {
    initial: [["X", []]],
    angle: toRadians(22.5),
    initial_steps: 5,
    rules: makeRuleSet({
      rules: {
        X: [{ next: itemExpr`F-[[X]+X]+F[+FX]-X` }],
        F: [{ next: itemExpr`FF` }],
      },
    }),
  },

  // "A three-dimensional bush-like structure"
  // This one has some instructions for colors and shapes which I haven't
  // implemented yet.
  first_bush: {
    initial: [["A", []]],
    angle: toRadians(22.5),
    initial_steps: 7,
    rules: makeRuleSet({
      rules: {
        A: [{ next: itemExpr`[&FL!A]/////'[&FL!A]///////'[&FL!A]` }],
        F: [{ next: itemExpr`S/////F` }],
        S: [{ next: itemExpr`FL` }],
        L: [{ next: itemExpr`['''^^{-f+f+f-|-f+f+f}]` }],
      },
    }),
  },

  flower: {
    initial: [["plant", []]],
    angle: toRadians(18),
    initial_steps: 5,
    rules: makeRuleSet({
      rules: {
        plant: [
          {
            next: itemExpr`
              (internode) + [(plant) + (flower)] - - // [ - - (leaf)]
              (internode) [ + + (leaf)] - [ (plant) (flower) ] + + (plant)
              (flower)
            `,
          },
        ],
        internode: [
          {
            next: itemExpr`F (sec) [// & & (leaf)] [// ^ ^ (leaf)] F (seg)`,
          },
        ],
        seg: [{ next: itemExpr`(seg) F (seg)` }],
        leaf: [{ next: itemExpr`[' { + f - ff - f + | + f - ff - f } ]` }],
        flower: [
          {
            next: itemExpr`
              [& & & (pedicel) ' / (wedge) //// (wedge) //// (wedge) ////
              (wedge) //// (wedge) ]
            `,
          },
        ],
        pedicel: [{ next: itemExpr`FF` }],
        wedge: [{ next: itemExpr`['^F][{&&&&-f+f|-f+f}]` }],
      },
    }),
  },

  stochastic: {
    initial: [["F", []]],
    angle: toRadians(22.5),
    initial_steps: 5,
    rules: makeRuleSet({
      rules: {
        F: [
          { next: itemExpr`F[+F]F[-F]F` },
          { next: itemExpr`F[+F]F` },
          { next: itemExpr`F[-F]F` },
        ],
      },
    }),
  },

  rando_flower: {
    initial: [["plant", []]],
    angle: toRadians(18),
    initial_steps: 1, //5,
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
