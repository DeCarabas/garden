// @flow
// @format
const { itemExpr, makeRuleSet } = require("./lsystem");
const { toRadians } = require("./util");

/*::
import type { system } from "./lsystem";
*/

/*::
type tree_params = {
  d1: number,
  d2: number,
  a: number,
  lr: number,
  vr: number,
  n: number,
};
*/

function makeTree({ d1, d2, a, lr, vr, n } /*:tree_params*/) /*:system*/ {
  return {
    initial: [["!", [1]], ["F", [200]], ["/", [toRadians(45)]], ["A", []]],
    angle: toRadians(45),
    initial_steps: n,
    rules: makeRuleSet({
      rules: {
        A: [
          {
            next: itemExpr`
                (! ${vr})(F 50)[(& ${a})(F 50)A](/ ${d1})
                [(& ${a})(F 50)A](/ ${d2})[(& ${a})(F 50)A]
            `,
          },
        ],
        F: [{ variables: ["l"], next: itemExpr`(F (* l ${lr}))` }],
        "!": [{ variables: ["w"], next: itemExpr`(! (* w ${vr}))` }],
      },
    }),
  };
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

  otree: makeTree({
    d1: toRadians(94.74),
    d2: toRadians(132.63),
    a: toRadians(18.95),
    lr: 1.109,
    vr: 1.732,
    n: 8,
  }),

  // How do I sort out:
  // - Using these systems to do turtle graphics
  // - Using these systems to model development
  tree: {
    initial: [["branch", []]],
    angle: toRadians(18),
    initial_steps: 10,
    rules: makeRuleSet({
      rules: {
        branch: [
          {
            next: itemExpr`[(color #01796F) (branchlet) (& .3) (branchlet) (^ .3) (branchlet)]`,
          },
        ],
        branchlet: [
          {
            next: itemExpr`
                (F .5) [(& 1) (+ 2) (meta_cluster)]
                (F .5) [(& 1) (- 2) (meta_cluster)]
                (F .5) [(& 1) (meta_cluster)]
            `,
          },
        ],
        meta_cluster: [
          { next: itemExpr`(F .1)[(line 0.1 0.3) (cluster)(cluster)]` },
        ],
        cluster: [
          { next: itemExpr`(fan) (/ .9) (fan) (/ .8) (fan) (/ .75) (fan)` },
        ],
        fan: [
          {
            next: itemExpr`[
                (+ 0.2) (needle 1.0)
                (+ 0.31) (needle 0.8)
                (+ 0.31) (needle 0.6)
                (+ 0.31) (needle 0.5)
            ]`,
          },
        ],
        needle: [{ variables: ["l"], next: itemExpr`[(color #01796F) (F l)]` }],
      },
    }),
  },

  rando_flower: {
    initial: [["plant", []]],
    angle: toRadians(18),
    initial_steps: 3, // 5,
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
