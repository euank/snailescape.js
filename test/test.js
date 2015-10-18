var util = require('util');
var fs = require('fs');
var Parser = require('./..');
var expect = require('chai').expect;
var fuzzer = require('fuzzer');

describe('Parser', function() {

  var partials = ["\\x", '"in double quotes with trailing \\', 'not in quotes with trailing \\', '"missing close quote', "'missing close quote"];

  describe('parse', function() {
    var parser = new Parser();

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
    var parser = new Parser({partial: true});

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
});
