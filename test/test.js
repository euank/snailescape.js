var util = require('util');
var fs = require('fs');
var SnailEscape = require('./..');
var expect = require('chai').expect;
var fuzzer = require('fuzzer');

describe('SnailEscape', function() {

  var partials = ["\\x", '"in double quotes with trailing \\', 'not in quotes with trailing \\', '"missing close quote', "'missing close quote"];

  describe('parse', function() {
    var parser = new SnailEscape();

    var files = fs.readdirSync(__dirname + '/cases/');

    files.forEach(function(file) {
      if(!/\.txt$/.test(file)) return; // skip the .out ones

      var path = __dirname + "/cases/" + file;
      var contents = fs.readFileSync(path).toString().trimRight(/\n/);
      var expected = JSON.parse(fs.readFileSync(path + ".out"));

      it('should parse ' + file, function() {
        var result = parser.parse(contents);
        expect(result.parts).to.eql(expected, util.inspect(result));
        expect(result.complete).to.be.true;
        expect(result.error).not.to.be.ok;
      });

      it('should unparse with ' + file, function() {
        var result = parser.parse(contents);
        var unresult = parser.unparse(result.parts);
        var reparse = parser.parse(unresult);
        expect(result).to.eql(reparse, util.inspect({result: result, reparse: reparse}));
      });


      it('should not crash when fuzzed with ' + file, function() {
        for(var i=0; i < 100; i++) {
          var input = fuzzer.mutate.string(contents);
          var result = parser.parse(input);
          // Only one of error or parts should ever be present
          if(result.error) {
            expect(result.parts).not.to.be.ok;
          } else {
            expect(result.parts).to.be.ok;
            var unresult = parser.unparse(result.parts);
            var reparse = parser.parse(unresult);
            expect(result).to.eql(reparse);
          }
        }
      });
    });

    partials.forEach(function(partial) {
      it('should error on partial ' + partial, function() {
        var result = parser.parse(partial);
        expect(result.error).to.be.ok;
      });
    });


    it('should error when passed anything but a string', function() {
      // this one's for that 100% coverage
      var result = parser.parse(100);
      expect(result.error).to.be.ok;
    });
  });

  // Partial parses
  describe('parse partial', function() {
    var parser = new SnailEscape({partial: true});

    partials.forEach(function(partial) {
      it('should parse partial ' + partial, function() {
        var result = parser.parse(partial);
        expect(result.complete).to.be.false;
      });
    });

    var impossiblePartials = ["\\ximpossible", "\\qqqqq"];

    impossiblePartials.forEach(function(partial) {
      it('should not mark as partial ' + partial, function() {
        var result = parser.parse(partial);
        expect(result.complete).to.be.true;
        expect(result.error).to.be.ok;
      });
    });
  });

  describe('configured quoteCharacters', function() {
    var parser = new SnailEscape({quoteCharacters: ['/', '"', '$']});

    it('should correctly quote', function() {
      var result = parser.parse('/foo bar baz/ "foo bar baz" $foo bar baz$');
        expect(result.complete).to.be.true;
        expect(result.error).not.to.be.ok;
        expect(result.parts).to.eql(["foo bar baz", "foo bar baz", "foo bar baz"]);
    });

    it('should not support nested quotes', function() {
      var result = parser.parse('/foo \'"bar"\' baz/');
        expect(result.complete).to.be.true;
        expect(result.error).not.to.be.ok;
        expect(result.parts).to.eql(['foo \'"bar"\' baz']);
    });
  });

  describe('configured rawQuoteCharacters', function() {
    var parser = new SnailEscape({rawQuoteCharacters: ['/', '$']});

    it('should correctly quote', function() {
      var result = parser.parse('/foo \\nbar baz/ $foo  \\bar baz$');
        expect(result.complete).to.be.true;
        expect(result.error).not.to.be.ok;
        expect(result.parts).to.eql(["foo \\nbar baz", "foo  \\bar baz"]);
    });
  });
  describe('configured spaceChars', function() {
    var parser = new SnailEscape({spaceChars: ['_', ',']});

    it('should correctly split', function() {
      var result = parser.parse('foo bar baz_a,b cde,"_, spaces in quotes"');
        expect(result.complete).to.be.true;
        expect(result.error).not.to.be.ok;
        expect(result.parts).to.eql(["foo bar baz", "a", "b cde", "_, spaces in quotes"]);
    });
  });
});
