// Copyright 2015 Euan Kemp
//
// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License.  You may obtain a copy
// of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
// License for the specific language governing permissions and limitations
// under the License.

;(function() {
  "use strict";
  var rootWindow = this;

  function Parser(opts) {
    opts = opts || {};
    this.partial = !!opts.partial;
  }

  // Parse parses a string using shell-like escapes into an array.
  Parser.prototype.parse = function(str) {
    if(typeof str != 'string') {
      return {complete: true, error: new Error("Can only parse a string, argument was of type " + typeof str), errorNdx: 0};
    }
    var currentPart = '';
    var parts = [];
    var inSingleQuotes = false;
    var inDoubleQuotes = false;
    var self = this;
    var retPartial = function(err, ndx) {
      var ret = {complete: false, errorNdx: ndx};
      if(!self.partial) {
        ret.error = err;
      }
      return ret;
    };
    for(var i = 0; i < str.length; i++) {
      if(inSingleQuotes) {
        // While in single quotes, there are no escapes. At all. Not even a
        // single quote can be escaped in single quotes.
        if(str[i] == "'") {
          parts.push(currentPart);
          currentPart = '';
          inSingleQuotes = false;
        } else {
          currentPart += str[i];
        }
        // If in single quotes, always ignore the escaping logic below; No
        // escapes here, only raw textual data
        continue;
      }

      if(inDoubleQuotes) {
        if(str[i] == '"') {
          parts.push(currentPart);
          currentPart = '';
          inDoubleQuotes = false;
          continue;
          // Consumed close double-quote
        }
        // Else, continue and parse a new character, including possibly escapes
      } else {
        // not in double quotes or single quotes, valid time to start a new quotes!
        if(str[i] == "'") {
          inSingleQuotes = true;
          continue;
        } else if(str[i] == '"') {
          inDoubleQuotes = true;
          continue;
        }

        // Also a valid time to start a new part when we're not in double
        // quotes; outside of double quotes, spaces have ~special meaning~ of
        // splitting into parts
        if(str[i] == ' ' || str[i] == "\t") {
          if(currentPart !== "") {
            parts.push(currentPart);
            currentPart = "";
          }
          continue;
        }
      }

      // Escapes; we're either in double quotes or in unqouted text; all escapes apply equally.
      if(str[i] == '\\') {
        if(i >= str.length - 1) {
          return retPartial(new Error("Trailing '\\' without escape"), i);
        }
        // consume the backslash
        i++;
        // Here we go, backslash escaping
        // It's convenient to use a regex (octal escape) so no lookup table /
        // switch statement :(
        if(str[i] == 'a') {
          // Bell character
          currentPart += '\u0007';
        } else if(str[i] == 'b') {
          // Backspace character
          currentPart += '\u0008';
        } else if(str[i] == 'e') {
          // Escape character
          currentPart += '\u001B';
        } else if(str[i] == 'E') {
          // Escape character
          currentPart += '\u001B';
        } else if(str[i] == 'f') {
          // Form feed
          currentPart += '\u000C';
        } else if(str[i] == 'n') {
          // Newline
          currentPart += '\n';
        } else if(str[i] == 'r') {
          // Carriage return
          currentPart += '\r';
        } else if(str[i] == 't') {
          // Tab
          currentPart += '\t';
        } else if(str[i] == 'v') {
          // Vertical tab
          currentPart += '\v';
        } else if(str[i] == '\\') {
          // Backslash
          currentPart += '\\';
        } else if(str[i] == '\'') {
          // Single quote
          currentPart += '\'';
        } else if(str[i] == '"') {
          // Double quote
          currentPart += '"';
        } else if(str[i] == ' ') {
          // Space
          currentPart += ' ';
        } else if(/^[0-7]$/.test(str[i])) {
          // ASCII escape via 1 to three digits; must be octal
          var octalDigits = str[i];
          for(var di=1; di<3; di++) {
            if(/^[0-7]$/.test(str[i+1])) {
              octalDigits += str[i+1];
              i++; // consume this digit as well
            } else {
              // Stop on the first non-digit
              break;
            }
          }

          var value = parseInt(octalDigits, 8);
          currentPart += String.fromCharCode(value);
        } else if(str[i] == "x") {
          // hex escape, one or two digits. Still within ascii only
          var hexRegex = /^[0-9a-fA-F]$/;
          if(i+1 >= (str.length - 1)) {
            return retPartial(new Error("\\x must be followed by one or more hex characters"), i);
          }
          if(!hexRegex.test(str[i+1])) {
            return {complete: true, error: new Error("Hex escape must be followed by one or more hex characters"), errorNdx: i+1};
          }
          var hexDigits = str[i+1];
          i++;
          if(hexRegex.test(str[i+1])) {
            hexDigits += str[i+1];
            i++;
          }

          var hvalue = parseInt(hexDigits, 16);
          currentPart += String.fromCharCode(hvalue);
        } else {
          // TODO, bash extensions of \u and \U for BIG UNICODE
          return {complete: true, error: new Error("Unrecognized backslash escape"), errorNdx: i};
        }

        // We handled an escape in some manner, we can just move on
        continue;
      }

      // Not an escape, take it plain
      currentPart += str[i];
    }

    if(inSingleQuotes) {
      // We reached the end in quotes, unclosed quote is a partial error
      return retPartial(new Error("Missing close quote for single quotes"), i);
    }
    if(inDoubleQuotes) {
      return retPartial(new Error("Missing close quote for double quotes"), i);
    }

    // Trailing non-quoted stuff that wasn't spaces, add that stuff on
    if(currentPart !== "") {
      parts.push(currentPart);
    }
    return {complete: true, parts: parts};
  };

  // Unparse makes an effort to create a sane string representation of an array
  // which will then convert back into the array when parsed.
  Parser.prototype.unparse = function(array) {
    var escape = function(str) {
      var output = "";
      for(var i=0;i<str.length;i++) {
        if(str[i] === '\\') {
          output += "\\\\";
          continue;
        }
        if(str[i] === '"') {
          output += '\\"';
          continue;
        }
        if(str[i] === "'") {
          output += "\\'";
          continue;
        }
        if(str[i] === "\n") {
          output += "\\n";
          continue;
        }
        output += str[i];
      }
      return output;
    };
    var doubleQuote = function(str) {
      return '"' + escape(str) + '"';
    };
    var quote = function(str) {
      // TODO, intelligently single quote if it makes sense
      return doubleQuote(str);
    };

    return array.map(function(element) {
      if(/[ \t]/.test(element)) {
        return quote(element);
      }
      return escape(element);
    }).join(" ");
  };

  // Song and dance to make this hopefully work with the browser, nodejs, and
  // RequireJS.
  if(typeof module !== 'undefined' && module.exports) {
    module.exports = Parser;
  } else if (typeof exports !== 'undefined') {
    exports.SnailEscape = Parser;
  } else {
    rootWindow.SnailEscape = Parser;
  }
}).call(this);
