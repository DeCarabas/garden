// @flow
// @format
const {evalExpression} = require('../lsystem');

test('evals literal numbers', () => expect(evalExpression(5, {})).toBe(5));
test('evals booleans numbers', () => expect(evalExpression(true, {})).toBe(true));
test('evals variables', () => expect(evalExpression('s', {'s': 54})).toBe(54));
describe('evaluating functions', () => {
  it('adds', () => expect(evalExpression(['+', 1, 2])).toBe(3));
  it('ands', () => expect(evalExpression(['&&', true, false])).toBe(false));
  it('ands many', () => expect(evalExpression(['&&', true, true, true])).toBe(true));
  it('ands many many', () => expect(evalExpression(['&&', true, true, false, true])).toBe(false));
  it('does complex things',
    () => expect(evalExpression(["&&", ["==", "t", 1], [">=", "s", 6]], {t:1, s:30})).toBe(true));
  it('does complex things again',
    () => expect(evalExpression(["&&", ["==", "t", 1], [">=", "s", 6]], {t:1, s:5})).toBe(false));
});
