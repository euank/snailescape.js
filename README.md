# snailescape.js

[![Build Status](https://travis-ci.org/euank/snailescape.js.svg?branch=master)](https://travis-ci.org/euank/snailescape.js)
[![Coverage Status](https://coveralls.io/repos/euank/snailescape.js/badge.svg?branch=master&service=github)](https://coveralls.io/github/euank/snailescape.js?branch=master)


![Snail Escape](/../imgs/header.png?raw=true "Three lost snails")

Snail Escape is a simple javascript library that implements a sane subset of
bash escaping, similar to the ANSI C standard for escapes.

## Supported Escapes

* `\a` &mdash; Bell (`0x07`)
* `\b` &mdash; Backspace (`0x08`)
* `\t` &mdash; Tab (`0x09`)
* `\e` &mdash; Escape (`0x1B`)
* `\n` &mdash; Newline (`0x0A`)
* `\v` &mdash; Vertical tab (`0x0B`)
* `\f` &mdash; Form feed (`0x0C`)
* `\r` &mdash; Carriage return (`0x0D`)
* `\ ` &mdash; Space (`0x20`)
* `\"` &mdash; Double quote (`0x22`)
* `\'` &mdash; Single quote (`0x27`)
* `\\` &mdash; Backslash (`0x5C`)
* `\[0-7]{1,3}` &mdash; Octal ASCII character
* `\x[0-9a-f]{1,2}` &mdash; Hex ASCII character

### When escapes apply

None of the above escapes apply within single quotes.
All of the above escapes apply within double quotes or when not within quotes.

Escaping a space character or single quote characer is entirely redundant
within double quotes, but both may be done.

## Error handling

### Error index

Any time the `error` field of the output is set, the `errorNdx` field is also
set to an integer indicating what offset is erroneous.

### Modes

snailescape has two modes of error handling:

This mode may be toggled by passing the argument `{partial: true}` to the
constructor. It defaults to false.

#### Complete parse errors

Complete parse errors operates under the assumption that the given string
should completely parse with no issues. It should have no trailing characters
or mismatched quotes, and if it does that's an error.

#### Partial parse errors

Partial parse errors operates under the assumption that the string might be
incomplete. this is useful if you are taking user-input as it is being typed
and parsing it.

In this mode, it will return both an error and a 'complete' value. It is
possible for a parse to be marked as not complete, and also not having any
errors. If a parse is marked as incomplete and does have errors, that means
there is no way for any added characters to make the arguments valid (e.g. if
there is an invalid escape sequence).

In this mode, you *must* check both `complete` and `error` before you may safeuly use the result.

```javascript
var result = parser.parse('"incomplete');
if(result.complete && !result.error) {
  // okay to use result.parts
}
```

## Usage

### In regular mode

```javascript
var parser = new Parser();
var result = parser.parse("echo hello world");
if(result.error) {
  console.error("could not parse input: ", result.error);
} else {
  console.log("All done! You typed the below array (as json): ")
  console.log(JSON.stringify(result.parts));
}

```

### In partial mode

```javascript
var parser = new Parser({partial: true});
var result = parser.parse("'arg1' 'arg\\n2' arg\\n3 arg4 arg5");
if(result.error) {
  console.log("This will never parse! Backspace now (starting at character " + result.error.index);
} else if(!result.complete) {
  console.log("Keep typing...");
} else if(!result.complete && !result.error) {
  console.log("All done! You typed the below array (as json): ")
  console.log(JSON.stringify(result.parts));
}
```

## Known issues

* In partial mode, mismatched quotes indicate the end of the string as erroneous, not the opening quote.
* High unicode cannot be represented via escapes, only via the actual characters.

## Contributions

Welcome, though please add tests and make sure that `npm test` passes.

## License

Apache 2.0
