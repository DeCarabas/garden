// @format
// @flow

const gl = require("./gardenlisp");
const fs = require("fs");

const input_file = process.argv[2];
fs.readFile(input_file, "utf8", (err, data) => {
  try {
    const forms = gl.read_file(data, input_file);
    const env = gl.new_environment(gl.stdlib);
    for (let i = 0; i < forms.length - 1; i++) {
      gl.eval_expr(forms[i], env);
    }
    const result = gl.eval_expr(forms[forms.length - 1], env);
    console.log(gl.format_value(result));
  } catch (e) {
    console.log(e.message);
  }
});
