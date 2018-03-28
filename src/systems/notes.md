# Notes on garden lisp

The systems in this directory are all described in a lisp dialect called "garden lisp".
Here are some notes about the language.
(I'm just farting around at the moment so this isn't very structured or put together.)

- The current state of the l-system is described by a list of s-expression that gets run in order to render the pictures.
  That means that the program basically describes drawing a picture with turtle graphics.


- The one big difference is expressions with `<>`; the arguments to those expressions are evaluated but the rule/function is *not* called.
  Instead, those are *only* considered for the rewrite pass.

- The machine re-writes the s-expression according to the rules defined with `defrule`.
  There can be both a `defrule` and `defun` for the same symbol.

- `defvar` is how we teach the system about parameters, which is kinda nice.

- `branch` pushes the current state, runs the stuff, then pops the state, like `[]` in the book.

- `polygon` pushes a polygon context.

- There can be more than one `defrule` that matches the symbol and context.
  One matching rule will be selected from the set at random.

(This is not a very clever or advanced lisp.
In particular, geez, look at all the machinery Emacs has for Emacs Lisp.
It would be fun to build all that stuff out but why in the world am I building a lisp anyways?
Because this model has made me happiest thus far.)
