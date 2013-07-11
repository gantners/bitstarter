#!/usr/bin/env node
/*
Automatically grade files for the presence of specified HTML tags/attributes.
Uses commander.js and cheerio. Teaches command line application development
and basic DOM parsing.

References:

 + cheerio
   - https://github.com/MatthewMueller/cheerio
   - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
   - http://maxogden.com/scraping-with-node.html

 + commander.js
   - https://github.com/visionmedia/commander.js
   - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy

 + JSON
   - http://en.wikipedia.org/wiki/JSON
   - https://developer.mozilla.org/en-US/docs/JSON
   - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2
*/
var sys = require('util');
var rest = require('restler');
var fs = require('fs');
var program = require('commander');
var cheerio = require('cheerio');

var HTMLFILE_DEFAULT = "index.html";
var CHECKSFILE_DEFAULT = "checks.json";
var URL_DEFAULT = "http://protected-fortress-1301.herokuapp.com";

var assertFileExists = function(infile) {
    var instr = infile.toString();
    if(!fs.existsSync(instr)) {
        console.log("%s does not exist. Exiting.", instr);
        process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
    }
    return instr;
};

var cheerioHtml = function(html) {
    return cheerio.load(html);
};

var loadChecks = function(checksfile) {
    return JSON.parse(fs.readFileSync(checksfile));
};

var loadFile = function(file){
    return fs.readFileSync(file);
}

var checkHtmlFile = function(htmlfile,checksfile){
    console.log('Checking html file: ' + htmlfile);
	return checkHtml(loadFile(htmlfile),checksfile);
}

var checkHtml = function(html, checksfile) {
    $ = cheerioHtml(html);
    var checks = loadChecks(checksfile).sort();
    var out = {};
    for(var ii in checks) {
        var present = $(checks[ii]).length > 0;
        out[checks[ii]] = present;
    }
    return out;
};

var validateUrl = function(url,checksfile){
	console.log('Downloading url: ' + url);

	rest.get(url).on('complete', function(result) {
		console.log('Downloaded ' + url);
		if (result instanceof Error) {
			this.retry(5000); // try again after 5 sec
			return false;
		} else {
			console.log('Validating url: ' + url);
			jsonify(checkHtml(result,checksfile));
		}

	});
};

var writeUrlToFile = function(htmlString,filename){
	console.log(filename + '\n' + htmlString);
	fs.writeFile(filename, htmlString, function(err) {
		if(err) {
        		console.log(err);
		} else {
        		console.log("The file was saved!");
    		}
	}); 
};

var jsonify = function(checkJson){
    var outJson = JSON.stringify(checkJson, null, 4);
    console.log(outJson);

}

var isUrl = function(url){
	console.log('url: ' + url.toString());
	if(url)
		if(~url.toString().indexOf('http'))
			return url.toString();
		else if (~url.toString().indexOf('default'))
			return URL_DEFAULT;
	console.log('No valid url given.');
	process.exit(1);
}

var clone = function(fn) {
    // Workaround for commander.js issue.
    // http://stackoverflow.com/a/6772648
    return fn.bind({});
};

if(require.main == module) {
    program
        .option('-c, --checks <check_file>', 'Path to checks.json', clone(assertFileExists))
        .option('-f, --file <html_file>', 'Path to index.html', clone(assertFileExists))
	.option('-u, --url <url>','Url',clone(isUrl))
        .parse(process.argv);
	
	if(program.file)
		jsonify(checkHtmlFile(program.file,program.checks));
	
	else if(program.url)
		validateUrl(program.url, program.checks);
	else
	        console.log('Please sepcify at least --url or --file');
} else {
    exports.checkHtmlFile = checkHtmlFile;
}
